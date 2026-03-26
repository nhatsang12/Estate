const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { promisify } = require('util');
const crypto = require('crypto');
const Joi = require('joi');

const ACCESS_COOKIE_NAME = 'jwt';
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_COOKIE_DAYS = 90;

const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Password confirmation does not match password',
  }),
  role: Joi.string().valid('user', 'provider').default('user'),
  address: Joi.string().trim().min(3).required(),
  phone: Joi.string().trim().allow('', null),
  kycDocuments: Joi.array().items(Joi.string().trim()).default([]),
}).options({ stripUnknown: true });

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
}).options({ stripUnknown: true });

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
}).options({ stripUnknown: true });

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Password confirmation does not match password',
  }),
}).options({ stripUnknown: true });

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  });
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const getCookieOptions = (maxAge) => {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  };
  return options;
};

const setAuthCookies = (res, token, refreshToken) => {
  res.cookie(ACCESS_COOKIE_NAME, token, getCookieOptions(15 * 60 * 1000));
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getCookieOptions(REFRESH_TOKEN_COOKIE_DAYS * 24 * 60 * 60 * 1000)
  );
};

const createSendToken = async (user, statusCode, res) => {
  if (typeof user.ensureSubscriptionValidity === 'function') {
    await user.ensureSubscriptionValidity();
  }

  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, token, refreshToken);
  const userData = user.toObject();
  delete userData.password;
  delete userData.refreshToken;
  delete userData.passwordResetToken;
  delete userData.passwordResetExpires;

  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user: userData,
    },
  });
};

exports.signup = async (req, res, next) => {
  try {
    // Use validated data from middleware
    const { name, email, password, role, address, phone, kycDocuments } = req.validatedData || req.body;

    const filteredBody = {
      name,
      email,
      password,
      role: role || 'user',
      address,
      phone,
    };

    if (role === 'provider' && kycDocuments && kycDocuments.length > 0) {
      filteredBody.kycDocuments = kycDocuments;
    }

    const newUser = await User.create(filteredBody);
    await createSendToken(newUser, 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Use validated data from middleware
    const { email, password } = req.validatedData || req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Incorrect email or password' });
    }

    await createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};


exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.cookies && req.cookies[ACCESS_COOKIE_NAME]) {
      token = req.cookies[ACCESS_COOKIE_NAME];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.',
      });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token does no longer exist.',
      });
    }

    if (typeof currentUser.ensureSubscriptionValidity === 'function') {
      await currentUser.ensureSubscriptionValidity();
    }

    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

// Optional auth: attach req.user if token is valid, otherwise continue without error.
exports.optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.cookies && req.cookies[ACCESS_COOKIE_NAME]) {
      token = req.cookies[ACCESS_COOKIE_NAME];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next();
    }

    if (typeof currentUser.ensureSubscriptionValidity === 'function') {
      await currentUser.ensureSubscriptionValidity();
    }

    req.user = currentUser;
    return next();
  } catch (err) {
    return next();
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

exports.refreshToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) || req.body.refreshToken;
    if (!incomingRefreshToken) {
      return res
        .status(400)
        .json({ status: 'error', message: 'No refresh token provided' });
    }

    const decoded = await promisify(jwt.verify)(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.refreshToken) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Invalid refresh token' });
    }

    const hashedIncomingRefreshToken = hashToken(incomingRefreshToken);
    if (user.refreshToken !== hashedIncomingRefreshToken) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(401)
        .json({ status: 'error', message: 'Refresh token reuse detected' });
    }

    const newAccessToken = signToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshToken = hashToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      status: 'success',
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // Use validated data from middleware
    const { email } = req.validatedData || req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'There is no user with email address.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    console.log(`Email sent to ${user.email} with reset URL: ${resetURL}`);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email! (Check server console for mock URL)',
      data: { resetToken },
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // Use validated data from middleware
    const { password } = req.validatedData || req.body;

    const resetToken = req.params.token || req.body.token;
    if (!resetToken) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Reset token is required' });
    }

    const hashedToken = hashToken(resetToken);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+refreshToken');

    if (!user) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Token is invalid or has expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    await createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};
