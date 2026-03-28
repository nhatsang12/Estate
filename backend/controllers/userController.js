const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const Joi = require('joi');
const { uploadToCloudinary } = require('../utils/cloudinary');
const {
  runOcrOnBuffer,
  runFaceCompareOnBuffers,
  buildKycExtractedData,
  buildKycComparisonResult,
  decideKycOutcome,
} = require('../utils/kycService');

// ─── Validation Schemas ──────────────────────────────────────
const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().allow('', null),
  address: Joi.string().trim().min(3),
  avatar: Joi.string().trim().uri().allow('', null),
}).options({ stripUnknown: true }).min(1).messages({
  'object.min': 'Please provide at least one field to update',
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Password confirmation does not match new password',
  }),
}).options({ stripUnknown: true });

function buildLooseDigitRegex(digits) {
  return new RegExp(`^\\D*${digits.split('').join('\\D*')}\\D*$`);
}

async function findDuplicateUserByCccd({ declaredIdDigits, excludeUserId }) {
  const looseDigitRegex = buildLooseDigitRegex(declaredIdDigits);

  return User.findOne({
    _id: { $ne: excludeUserId },
    kycStatus: 'verified',
    $or: [
      { 'kycExtractedData.parsed.idNumber': declaredIdDigits },
      { 'kycExtractedData.parsed.idNumber': { $regex: looseDigitRegex } },
    ],
  }).select('_id name email kycStatus kycExtractedData.parsed.idNumber');
}

// ─── Get Current User Profile ────────────────────────────────
// GET /api/users/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
};

// ─── Update Current User Profile ─────────────────────────────
// PATCH /api/users/me
exports.updateMe = async (req, res, next) => {
  try {
    const { value, error } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    if (req.body.password || req.body.role) {
      return res.status(400).json({
        status: 'error',
        message: 'This route is not for password or role updates.',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, value, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (err) {
    next(err);
  }
};

// ─── Change Password ─────────────────────────────────────────
// PATCH /api/users/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { value, error } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isCorrect = await user.correctPassword(value.currentPassword, user.password);
    if (!isCorrect) {
      return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
    }

    user.password = value.newPassword;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Submit KYC Documents (CCCD) ─────────────────────────────
// PATCH /api/users/kyc/submit
exports.submitKycDocuments = async (req, res, next) => {
  try {
    const frontFile = req.files?.cccdFront?.[0];
    const backFile = req.files?.cccdBack?.[0];
    const portraitFile = req.files?.portrait?.[0] || req.files?.selfie?.[0];
    const declaredIdDigits = String(req.body?.declaredIdNumber || '').replace(/\D/g, '');

    if (!['user', 'provider'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only user and provider accounts can submit KYC documents',
      });
    }

    if (!frontFile || !backFile || !portraitFile) {
      const receivedFields = Object.keys(req.files || {});
      return res.status(400).json({
        status: 'error',
        message: `cccdFront, cccdBack and portrait files are required (received: ${
          receivedFields.length ? receivedFields.join(', ') : 'none'
        })`,
      });
    }

    if (!declaredIdDigits) {
      return res.status(400).json({
        status: 'error',
        message: 'declaredIdNumber is required',
      });
    }

    if (![9, 12].includes(declaredIdDigits.length)) {
      return res.status(400).json({
        status: 'error',
        message: 'declaredIdNumber must contain 9 or 12 digits',
      });
    }

    const duplicatedOwner = await findDuplicateUserByCccd({
      declaredIdDigits,
      excludeUserId: req.user.id,
    });

    if (duplicatedOwner) {
      return res.status(409).json({
        status: 'error',
        message: 'Số CCCD này đã được sử dụng bởi tài khoản khác.',
      });
    }

    if (
      !frontFile.mimetype.startsWith('image/') ||
      !backFile.mimetype.startsWith('image/') ||
      !portraitFile.mimetype.startsWith('image/')
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Only image files are allowed for cccdFront, cccdBack and portrait',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    let uploadedUrls;
    let portraitUrl = '';
    try {
      const uploadTasks = [
        uploadToCloudinary(frontFile.buffer, { folder: 'real-estate-kyc', resource_type: 'image' }),
        uploadToCloudinary(backFile.buffer, { folder: 'real-estate-kyc', resource_type: 'image' }),
        uploadToCloudinary(portraitFile.buffer, {
          folder: 'real-estate-kyc-portrait',
          resource_type: 'image',
        }),
      ];

      const uploaded = await Promise.all(uploadTasks);
      const [frontUrl, backUrl, uploadedPortraitUrl] = uploaded;
      uploadedUrls = [frontUrl, backUrl];
      portraitUrl = uploadedPortraitUrl;
    } catch (uploadError) {
      return res.status(502).json({
        status: 'error',
        message: 'Failed to upload KYC documents. Please try again.',
      });
    }

    user.kycDocuments = uploadedUrls;
    user.kycPortraitUrl = portraitUrl;
    user.kycDeclaredIdNumber = declaredIdDigits;
    user.kycStatus = 'submitted';
    user.isVerified = false;
    user.kycRejectionReason = '';
    await user.save({ validateBeforeSave: false });

    const ocrErrors = [];
    let frontOcrResult = null;
    let backOcrResult = null;
    let faceComparisonResult = null;

    try {
      frontOcrResult = await runOcrOnBuffer(frontFile.buffer, 'cccdFront');
    } catch (error) {
      ocrErrors.push({ side: 'cccdFront', message: error?.message || 'OCR failed for cccdFront' });
    }

    try {
      backOcrResult = await runOcrOnBuffer(backFile.buffer, 'cccdBack');
    } catch (error) {
      ocrErrors.push({ side: 'cccdBack', message: error?.message || 'OCR failed for cccdBack' });
    }

    try {
      faceComparisonResult = await runFaceCompareOnBuffers(frontFile.buffer, portraitFile.buffer);
    } catch (error) {
      ocrErrors.push({ side: 'faceCompare', message: error?.message || 'Face compare failed' });
    }

    const extractedData = buildKycExtractedData({ frontOcrResult, backOcrResult, ocrErrors });
    const comparisonResult = buildKycComparisonResult({
      user,
      extractedData,
      declaredIdNumber: declaredIdDigits,
      faceComparisonResult,
    });
    const decision = decideKycOutcome({ comparisonResult, extractedData });

    user.kycExtractedData = extractedData;
    user.kycExtractedName = String(extractedData?.parsed?.fullName || '').trim();
    user.kycExtractedIDNumber = String(extractedData?.parsed?.idNumber || '').trim();
    user.kycComparisonResult = {
      ...comparisonResult,
      decisionNotes: decision.decisionNotes,
      decidedAt: new Date().toISOString(),
    };
    user.kycFaceComparisonResult = faceComparisonResult
      ? {
          ...faceComparisonResult,
          decidedAt: new Date().toISOString(),
        }
      : null;
    user.kycStatus = decision.kycStatus;
    user.isVerified = decision.isVerified;
    user.kycRejectionReason = decision.kycStatus === 'rejected' ? decision.kycRejectionReason : '';
    await user.save({ validateBeforeSave: false });

    const statusMessage = {
      verified: 'Hồ sơ đã xác minh thành công',
      rejected: 'Hồ sơ đã bị từ chối',
      reviewing: 'Hồ sơ đã được gửi và đang xem xét',
    };

    res.status(200).json({
      status: 'success',
      message: statusMessage[user.kycStatus] || 'KYC submitted successfully',
      data: {
        userId: user._id,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        kycRejectionReason: user.kycRejectionReason || null,
        kycDocuments: user.kycDocuments,
        kycPortraitUrl: user.kycPortraitUrl,
        kycExtractedData: user.kycExtractedData,
        kycComparisonResult: user.kycComparisonResult,
        kycFaceComparisonResult: user.kycFaceComparisonResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Check Declared CCCD Availability ───────────────────────
// GET /api/users/kyc/declared-id/check?declaredIdNumber=...
exports.checkKycDeclaredIdAvailability = async (req, res, next) => {
  try {
    const declaredIdDigits = String(req.query?.declaredIdNumber || '').replace(/\D/g, '');

    if (!declaredIdDigits) {
      return res.status(400).json({
        status: 'error',
        message: 'declaredIdNumber is required',
      });
    }

    if (![9, 12].includes(declaredIdDigits.length)) {
      return res.status(400).json({
        status: 'error',
        message: 'declaredIdNumber must contain 9 or 12 digits',
      });
    }

    const duplicate = await findDuplicateUserByCccd({
      declaredIdDigits,
      excludeUserId: req.user.id,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        declaredIdNumber: declaredIdDigits,
        available: !duplicate,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Role Request Status ──────────────────────────────
// GET /api/users/role-request/me
exports.getMyRoleRequest = async (req, res, next) => {
  try {
    const request = await RoleRequest.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });

    if (!request) {
      return res.status(200).json({ status: 'none' });
    }

    return res.status(200).json({
      status: request.status,
      rejectionReason: request.rejectionReason || '',
      createdAt: request.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Create Role Request (user → provider) ───────────────────
// POST /api/users/role-request
exports.createRoleRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(400).json({
        status: 'error',
        message: 'Tài khoản của bạn không cần đổi role.',
      });
    }

    const existing = await RoleRequest.findOne({
      userId: req.user.id,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'Bạn đã có yêu cầu đang chờ duyệt.',
      });
    }

    const request = await RoleRequest.create({ userId: req.user.id });

    return res.status(201).json({
      status: 'success',
      message: 'Yêu cầu đã được gửi thành công.',
      data: { status: request.status },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Users (Admin Only) ──────────────────────────────
// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort('-createdAt').skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      results: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get User by ID (Admin Only) ─────────────────────────────
// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'No user found with that ID' });
    }
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
};

// ─── Update User Role (Admin Only) ───────────────────────────
// PATCH /api/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'provider', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be: user, provider, or admin',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'No user found with that ID' });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
};

// ─── Delete User (Admin Only) ────────────────────────────────
// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'No user found with that ID' });
    }
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Get Users for KYC Review (Admin Only) ───────────────────
// GET /api/users/kyc-review
exports.getUsersForKycReview = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.kycStatus) filter.kycStatus = req.query.kycStatus;

    const sort = req.query.sort === 'oldest' ? 'createdAt' : '-createdAt';
    const limit = parseInt(req.query.limit, 10) || 100;

    const users = await User.find(filter).sort(sort).limit(limit);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update User KYC Status (Admin Only) ─────────────────────
// PATCH /api/users/:id/kyc
exports.updateUserKycStatus = async (req, res, next) => {
  try {
    const { isVerified, kycStatus, kycRejectionReason } = req.body;

    const updateData = {};
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
    if (kycStatus) updateData.kycStatus = kycStatus;
    if (kycRejectionReason !== undefined) updateData.kycRejectionReason = kycRejectionReason;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'No user found with that ID' });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
};
