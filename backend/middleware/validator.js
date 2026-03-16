const Joi = require('joi');

const validator = (schema) => (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }
    // Attach validated data to request for use in handler
    req.validatedData = value;
    next();
  } catch (err) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error: ' + err.message,
    });
  }
};

// ─── Auth Schemas ────────────────────────────────────────────
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

// ─── Property Schema ────────────────────────────────────────
const propertySchema = Joi.object({
  title: Joi.string().required(),
  price: Joi.number().required(),
  address: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().valid('apartment', 'house', 'villa', 'studio', 'office'),
  bedrooms: Joi.number(),
  bathrooms: Joi.number(),
  area: Joi.number(),
  furnished: Joi.boolean(),
  yearBuilt: Joi.number(),
  amenities: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  images: Joi.any(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }),
}).unknown(true);

exports.validateSignup = validator(signupSchema);
exports.validateLogin = validator(loginSchema);
exports.validateForgotPassword = validator(forgotPasswordSchema);
exports.validateResetPassword = validator(resetPasswordSchema);
exports.validateProperty = validator(propertySchema);
