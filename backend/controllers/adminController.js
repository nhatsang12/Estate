const Property = require('../models/Property');
const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
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

const updateSubscriptionStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'expired', 'cancelled').required(),
}).options({ stripUnknown: true });

const SUBSCRIPTION_DURATION_MONTHS = 1;

const addSubscriptionDuration = (baseDate) => {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + SUBSCRIPTION_DURATION_MONTHS);
  return next;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

const normalizeExpiredSubscriptions = async (now = new Date()) => {
  await Subscription.updateMany(
    {
      status: 'active',
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: 'expired',
        lastRenewedAt: now,
      },
    }
  );

  const result = await User.updateMany(
    {
      subscriptionPlan: { $in: ['Pro', 'ProPlus'] },
      subscriptionExpiresAt: { $exists: true, $lte: now },
    },
    {
      $set: {
        subscriptionPlan: 'Free',
        currentSubscriptionId: null,
      },
      $unset: { subscriptionStartedAt: 1, subscriptionExpiresAt: 1 },
    }
  );
  return Number(result.modifiedCount || 0);
};

const resolveSubscriptionExpiry = (transaction) => {
  if (transaction.subscriptionExpiresAt) return transaction.subscriptionExpiresAt;

  if (
    transaction.status === 'success' &&
    transaction.subscriptionPlan &&
    transaction.subscriptionPlan !== 'Free' &&
    transaction.orderedAt
  ) {
    return addSubscriptionDuration(new Date(transaction.orderedAt));
  }

  return transaction.expiresAt;
};

const serializeTransaction = (transaction) => ({
  _id: transaction._id,
  subscriptionPlan: transaction.subscriptionPlan,
  amount: transaction.amount,
  paymentMethod: transaction.paymentMethod,
  status: transaction.status,
  orderedAt: transaction.orderedAt,
  expiresAt: resolveSubscriptionExpiry(transaction),
  checkoutExpiresAt: transaction.checkoutExpiresAt,
  subscriptionExpiresAt: resolveSubscriptionExpiry(transaction),
  paymentGatewayTransactionId: transaction.paymentGatewayTransactionId,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

// ─── Dashboard Statistics ────────────────────────────────────
// GET /api/admin/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const expiringSoonDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await normalizeExpiredSubscriptions(now);

    const [
      totalUsers,
      totalProviders,
      totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      pendingProviders,
      pendingProvidersRoleRequests,
      verifiedProviders,
      rejectedProviders,
      subscriptionSalesByPlan,
      subscriptionSalesByMethod,
      activePaidProviders,
      activeSubscriptionsCount,
      expiredSubscriptionsCount,
      expiringSoonSubscriptions,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'provider' }),
      Property.countDocuments(),
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ status: 'approved' }),
      Property.countDocuments({ status: 'rejected' }),
      User.countDocuments({
        kycStatus: { $in: ['submitted', 'reviewing'] },
      }),
      RoleRequest.countDocuments({ status: 'pending' }),
      User.countDocuments({ kycStatus: 'verified' }),
      User.countDocuments({ kycStatus: 'rejected' }),
      Transaction.aggregate([
        {
          $match: {
            status: 'success',
            subscriptionPlan: { $in: ['Pro', 'ProPlus'] },
          },
        },
        {
          $group: {
            _id: '$subscriptionPlan',
            totalSold: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: 'success',
            subscriptionPlan: { $in: ['Pro', 'ProPlus'] },
          },
        },
        {
          $group: {
            _id: '$paymentMethod',
            totalSold: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]),
      User.countDocuments({
        role: 'provider',
        subscriptionPlan: { $in: ['Pro', 'ProPlus'] },
        $or: [
          { subscriptionExpiresAt: { $gt: now } },
          { subscriptionExpiresAt: { $exists: false } },
        ],
      }),
      Subscription.countDocuments({
        status: 'active',
        expiresAt: { $gt: now },
      }),
      Subscription.countDocuments({
        status: 'expired',
      }),
      Subscription.find({
        status: 'active',
        expiresAt: { $gt: now, $lte: expiringSoonDate },
      })
        .populate('userId', 'name email role')
        .sort({ expiresAt: 1 })
        .limit(8),
    ]);

    const planStats = {
      Pro: { totalSold: 0, totalRevenue: 0 },
      ProPlus: { totalSold: 0, totalRevenue: 0 },
    };
    for (const row of subscriptionSalesByPlan) {
      if (row?._id === 'Pro' || row?._id === 'ProPlus') {
        planStats[row._id] = {
          totalSold: Number(row.totalSold || 0),
          totalRevenue: Number(row.totalRevenue || 0),
        };
      }
    }

    const paymentMethodStats = {
      VNPay: { totalSold: 0, totalRevenue: 0 },
      PayPal: { totalSold: 0, totalRevenue: 0 },
    };
    for (const row of subscriptionSalesByMethod) {
      if (row?._id === 'VNPay' || row?._id === 'PayPal') {
        paymentMethodStats[row._id] = {
          totalSold: Number(row.totalSold || 0),
          totalRevenue: Number(row.totalRevenue || 0),
        };
      }
    }

    const totalSubscriptionSales =
      planStats.Pro.totalSold + planStats.ProPlus.totalSold;
    const totalSubscriptionRevenue =
      planStats.Pro.totalRevenue + planStats.ProPlus.totalRevenue;

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        totalProviders,
        totalPendingProviders: pendingProviders + pendingProvidersRoleRequests,
        totalVerifiedProviders: verifiedProviders,
        totalRejectedProviders: rejectedProviders,
        totalProperties,
        pendingPropertiesCount: pendingProperties,
        totalPropertyApprovals: approvedProperties,
        totalPropertyRejections: rejectedProperties,
        activePaidProviders,
        subscriptionSales: {
          totalSold: totalSubscriptionSales,
          totalRevenue: totalSubscriptionRevenue,
          byPlan: planStats,
          byPaymentMethod: paymentMethodStats,
        },
        subscriptionOverview: {
          activeCount: activeSubscriptionsCount,
          expiredCount: expiredSubscriptionsCount,
          expiringSoonCount: expiringSoonSubscriptions.length,
          expiringSoon: expiringSoonSubscriptions.map((item) => ({
            _id: item._id,
            planType: item.planType,
            status: item.status,
            expiresAt: item.expiresAt,
            user: item.userId
              ? {
                  _id: item.userId._id,
                  name: item.userId.name,
                  email: item.userId.email,
                  role: item.userId.role,
                }
              : null,
          })),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── List Subscriptions ─────────────────────────────────────
// GET /api/admin/subscriptions
exports.getSubscriptions = async (req, res, next) => {
  try {
    await normalizeExpiredSubscriptions(new Date());

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const status = String(req.query.status || '').trim();
    const planType = String(req.query.planType || '').trim();

    const filter = {};
    if (['active', 'expired', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    if (['Free', 'Pro', 'ProPlus'].includes(planType)) {
      filter.planType = planType;
    }

    const [total, subscriptions] = await Promise.all([
      Subscription.countDocuments(filter),
      Subscription.find(filter)
        .populate('userId', 'name email role')
        .populate('transactionId', 'amount paymentMethod status orderedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      status: 'success',
      results: subscriptions.length,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      data: {
        subscriptions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Subscription Status ─────────────────────────────
// PATCH /api/admin/subscriptions/:id/status
exports.updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { value, error } = updateSubscriptionStatusSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscription not found',
      });
    }

    subscription.status = value.status;
    if (value.status !== 'active' && !subscription.expiresAt) {
      subscription.expiresAt = new Date();
    }
    subscription.lastRenewedAt = new Date();
    await subscription.save({ validateBeforeSave: false });

    const user = await User.findById(subscription.userId);
    if (user) {
      const activeSubscription = await Subscription.findOne({
        userId: user._id,
        status: 'active',
        expiresAt: { $gt: new Date() },
      }).sort({ expiresAt: -1, createdAt: -1 });

      if (activeSubscription) {
        user.subscriptionPlan = activeSubscription.planType;
        user.subscriptionStartedAt = activeSubscription.subscribedAt;
        user.subscriptionExpiresAt = activeSubscription.expiresAt;
        user.currentSubscriptionId = activeSubscription._id;
      } else {
        user.subscriptionPlan = 'Free';
        user.subscriptionStartedAt = undefined;
        user.subscriptionExpiresAt = undefined;
        user.currentSubscriptionId = null;
      }

      await user.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription,
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
    await normalizeExpiredSubscriptions(new Date());

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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that ID',
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
      user.role = 'provider'; // Automatically update role when KYC is verified
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

    // ─── Update Associated RoleRequest if it exists ──────────
    if (nextKycStatus === 'verified' || nextKycStatus === 'rejected') {
      await RoleRequest.findOneAndUpdate(
        { userId: user._id, status: 'pending' },
        {
          status: nextKycStatus === 'verified' ? 'approved' : 'rejected',
          rejectionReason: nextKycStatus === 'rejected' ? rejectionReason : '',
        }
      );
    }

    res.status(200).json({
      status: 'success',
      message: `Provider KYC updated to "${user.kycStatus}"`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Provider Subscription Transactions ─────────────────
// GET /api/admin/providers/:id/subscriptions
exports.getProviderSubscriptions = async (req, res, next) => {
  try {
    await normalizeExpiredSubscriptions(new Date());

    const providerId = req.params.id;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
    const skip = (page - 1) * limit;

    const provider = await User.findById(providerId).select(
      'name email role subscriptionPlan listingsCount isVerified kycStatus'
    );

    if (!provider) {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found',
      });
    }

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments({ userId: providerId }),
      Transaction.find({ userId: providerId })
        .sort({ orderedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      status: 'success',
      results: transactions.length,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      data: {
        provider,
        subscriptions: transactions.map(serializeTransaction),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Unverified Providers ────────────────────────────────
// GET /api/admin/providers/pending
exports.getPendingProviders = async (req, res, next) => {
  try {
    await normalizeExpiredSubscriptions(new Date());

    // 1. Get users who are already providers but unverified, or have submitted KYC
    const unverifiedProviders = await User.find({
      $or: [{ role: 'provider', isVerified: false }, { kycStatus: 'submitted' }],
    }).sort('-createdAt');

    // 2. Get users who have a pending role change request to provider
    const roleRequests = await RoleRequest.find({ status: 'pending' })
      .populate('userId', 'name email phone avatar address kycStatus isVerified subscriptionPlan subscriptionExpiresAt listingsCount createdAt')
      .sort('-createdAt');

    // Combine them into a single list
    // Use a Map to avoid duplicates (though rare, the same user could match both)
    const combinedMap = new Map();

    unverifiedProviders.forEach(u => {
      combinedMap.set(u._id.toString(), {
        ...u.toObject(),
        isRoleRequest: false
      });
    });

    roleRequests.forEach(req => {
      if (req.userId) {
        combinedMap.set(req.userId._id.toString(), {
          ...req.userId.toObject(),
          isRoleRequest: true,
          roleRequestId: req._id
        });
      }
    });

    const providers = Array.from(combinedMap.values()).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      status: 'success',
      results: providers.length,
      data: { providers },
    });
  } catch (err) {
    next(err);
  }
};
