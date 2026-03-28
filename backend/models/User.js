const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─── User Schema ─────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'provider', 'admin'],
    default: 'user',
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },

  // ─── Provider-specific fields ──────────────────────────────
  isVerified: {
    type: Boolean,
    default: false,
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'reviewing', 'verified', 'rejected'],
    default: 'pending',
  },
  kycDocuments: {
    type: [String],
    default: [],
  },
  kycPortraitUrl: {
    type: String,
    default: '',
  },
  kycExtractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  kycExtractedName: {
    type: String,
    trim: true,
    default: '',
  },
  kycExtractedIDNumber: {
    type: String,
    trim: true,
    default: '',
  },
  kycDeclaredIdNumber: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  kycComparisonResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  kycFaceComparisonResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  kycRejectionReason: {
    type: String,
    trim: true,
    default: '',
  },

  // ─── Subscription & Quota (per DNA spec) ───────────────────
  subscriptionPlan: {
    type: String,
    enum: ['Free', 'Pro', 'ProPlus'],
    default: 'Free',
  },
  subscriptionStartedAt: {
    type: Date,
  },
  subscriptionExpiresAt: {
    type: Date,
    index: true,
  },
  currentSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null,
    index: true,
  },
  listingsCount: {
    type: Number,
    default: 0,
  },

  // ─── Token management ─────────────────────────────────────
  refreshToken: {
    type: String,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
  },
}, {
  timestamps: true, // createdAt + updatedAt
});

// ─── Indexes ─────────────────────────────────────────────────
userSchema.index({ role: 1 });

// ─── Pre-save hook: Hash password ────────────────────────────
// CRITICAL: Must check isModified to avoid re-hashing on user updates
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Instance Methods ────────────────────────────────────────

/**
 * Compare candidate password with stored hashed password
 */
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * Generate a password reset token (hashed, stored in DB)
 * Returns the raw (unhashed) token to send via email
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

/**
 * Return effective plan at a given time.
 * If paid plan has expired, user is treated as Free plan.
 */
userSchema.methods.getEffectiveSubscriptionPlan = function (now = new Date()) {
  const currentPlan = this.subscriptionPlan || 'Free';
  if (currentPlan === 'Free') return 'Free';

  // Backward compatibility for historical paid users without expiry metadata.
  if (!this.subscriptionExpiresAt) return currentPlan;

  const expiresAt = new Date(this.subscriptionExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return currentPlan;
  if (expiresAt <= now) return 'Free';

  return currentPlan;
};

/**
 * If paid plan is expired, downgrade user to Free.
 * Returns true if a downgrade was applied.
 */
userSchema.methods.ensureSubscriptionValidity = async function (now = new Date()) {
  const effectivePlan = this.getEffectiveSubscriptionPlan(now);
  if (effectivePlan !== 'Free' || this.subscriptionPlan === 'Free') return false;

  this.subscriptionPlan = 'Free';
  this.subscriptionStartedAt = undefined;
  this.subscriptionExpiresAt = undefined;
  await this.save({ validateBeforeSave: false });
  return true;
};

/**
 * Check if user can create more listings based on subscription plan
 * Free: 3 listings, Pro: 20 listings, ProPlus: unlimited
 */
userSchema.methods.canCreateListing = function () {
  const plan = this.getEffectiveSubscriptionPlan();
  const limits = {
    Free: 3,
    Pro: 20,
    ProPlus: Infinity,
  };
  return this.listingsCount < (limits[plan] || 0);
};

/**
 * Get the maximum number of listings allowed for this user
 */
userSchema.methods.getListingLimit = function () {
  const plan = this.getEffectiveSubscriptionPlan();
  const limits = {
    Free: 3,
    Pro: 20,
    ProPlus: Infinity,
  };
  return limits[plan] || 0;
};

module.exports = mongoose.model('User', userSchema);
