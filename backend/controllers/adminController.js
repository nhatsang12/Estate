const Property = require('../models/Property');
const User = require('../models/User');
const Joi = require('joi');

// ─── Validation Schemas ──────────────────────────────────────
const moderateSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  rejectionReason: Joi.string().trim().when('status', {
    is: 'rejected',
    then: Joi.required().messages({
      'any.required': 'Rejection reason is required when rejecting a property',
    }),
    otherwise: Joi.optional().allow('', null),
  }),
}).options({ stripUnknown: true });

const verifyProviderSchema = Joi.object({
  isVerified: Joi.boolean(),
  kycStatus: Joi.string().valid('pending', 'submitted', 'reviewing', 'verified', 'rejected'),
  kycRejectionReason: Joi.string().trim().allow('', null),
}).or('isVerified', 'kycStatus').options({ stripUnknown: true });

// ─── Dashboard Statistics ────────────────────────────────────
// GET /api/admin/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      pendingProviders,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'provider' }),
      Property.countDocuments(),
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ status: 'approved' }),
      Property.countDocuments({ status: 'rejected' }),
      User.countDocuments({ role: 'provider', isVerified: false }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          users: totalUsers,
          providers: totalProviders,
          pendingProviders,
          properties: {
            total: totalProperties,
            pending: pendingProperties,
            approved: approvedProperties,
            rejected: rejectedProperties,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Pending Properties for Moderation ───────────────────
// GET /api/admin/properties/pending
exports.getPendingProperties = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const skip = (page - 1) * limit;
    const subscriptionPriority = {
      ProPlus: 3,
      Pro: 2,
      Free: 1,
    };

    const pendingProperties = await Property.find({ status: 'pending' })
      .populate('ownerId', 'name email phone isVerified subscriptionPlan');

    pendingProperties.sort((a, b) => {
      const planA = a.ownerId?.subscriptionPlan || 'Free';
      const planB = b.ownerId?.subscriptionPlan || 'Free';
      const priorityDiff =
        (subscriptionPriority[planB] || 0) - (subscriptionPriority[planA] || 0);

      if (priorityDiff !== 0) return priorityDiff;

      const createdAtA = new Date(a.createdAt).getTime() || 0;
      const createdAtB = new Date(b.createdAt).getTime() || 0;
      return createdAtB - createdAtA;
    });

    const total = pendingProperties.length;
    const properties = pendingProperties.slice(skip, skip + limit);

    res.status(200).json({
      status: 'success',
      results: properties.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: { properties },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Moderate Property (Approve / Reject) ────────────────────
// PATCH /api/admin/properties/:id/moderate
exports.moderateProperty = async (req, res, next) => {
  try {
    const { value, error } = moderateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const updateData = { status: value.status };
    if (value.status === 'rejected') {
      updateData.rejectionReason = value.rejectionReason;
    } else {
      // Clear rejection reason if approving
      updateData.rejectionReason = undefined;
    }

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name email');

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'No property found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Property ${value.status} successfully`,
      data: { property },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Provider ─────────────────────────────────────────
// PATCH /api/admin/providers/:id/verify
exports.verifyProvider = async (req, res, next) => {
  try {
    const { value, error } = verifyProviderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const user = await User.findOne({ _id: req.params.id, role: 'provider' });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No provider found with that ID',
      });
    }

    if (
      typeof value.isVerified === 'boolean' &&
      value.kycStatus &&
      ((value.isVerified && value.kycStatus !== 'verified') ||
        (!value.isVerified && value.kycStatus === 'verified'))
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'isVerified and kycStatus are inconsistent',
      });
    }

    let nextKycStatus = value.kycStatus || user.kycStatus || 'pending';
    let nextIsVerified =
      typeof value.isVerified === 'boolean' ? value.isVerified : user.isVerified;

    if (value.isVerified === true) {
      nextKycStatus = 'verified';
    } else if (value.isVerified === false && !value.kycStatus) {
      nextKycStatus = 'reviewing';
    }

    if (nextKycStatus === 'verified') {
      nextIsVerified = true;
    } else {
      nextIsVerified = false;
    }

    const rejectionReason =
      typeof value.kycRejectionReason === 'string' ? value.kycRejectionReason.trim() : '';

    if (nextKycStatus === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'kycRejectionReason is required when kycStatus is rejected',
      });
    }

    user.isVerified = nextIsVerified;
    user.kycStatus = nextKycStatus;
    user.kycRejectionReason = nextKycStatus === 'rejected' ? rejectionReason : '';

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: `Provider KYC updated to "${user.kycStatus}"`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Unverified Providers ────────────────────────────────
// GET /api/admin/providers/pending
exports.getPendingProviders = async (req, res, next) => {
  try {
    const providers = await User.find({
      role: 'provider',
      isVerified: false,
    }).sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: providers.length,
      data: { providers },
    });
  } catch (err) {
    next(err);
  }
};
