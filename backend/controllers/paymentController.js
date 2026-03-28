const Joi = require('joi');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const paymentService = require('../services/paymentService');

const checkoutSchema = Joi.object({
  subscriptionPlan: Joi.string().valid('Pro', 'ProPlus').required(),
  paymentMethod: Joi.string().valid('VNPay', 'PayPal').required(),
  amount: Joi.number().positive().optional(),
}).options({ stripUnknown: true });

const PENDING_TRANSACTION_EXPIRE_MINUTES = 10;
const SUBSCRIPTION_DURATION_MONTHS = 1;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const addSubscriptionDuration = (baseDate) => {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + SUBSCRIPTION_DURATION_MONTHS);
  return next;
};

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const calculateDurationDays = (startDate, endDate) => {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return 30;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_IN_MS));
};

const calcRemainingDays = (expiresAt, now = new Date()) => {
  const expiry = toDate(expiresAt);
  if (!expiry) return 0;
  const diff = expiry.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_IN_MS);
};

const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

const buildFrontendUrl = (path, query = {}) => {
  const url = new URL(path, clientBaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const getPaymentRedirectUrl = (type, query = {}) => {
  const defaults = {
    success: buildFrontendUrl('/payment/success', query),
    failed: buildFrontendUrl('/payment/failed', query),
    cancelled: buildFrontendUrl('/payment/cancelled', query),
    error: buildFrontendUrl('/payment/error', query),
  };

  const envMap = {
    success: process.env.PAYMENT_SUCCESS_URL,
    failed: process.env.PAYMENT_FAILED_URL,
    cancelled: process.env.PAYMENT_CANCELLED_URL,
    error: process.env.PAYMENT_ERROR_URL,
  };

  const base = envMap[type] || defaults[type] || defaults.error;

  try {
    const url = new URL(base);
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  } catch (error) {
    return defaults[type] || defaults.error;
  }
};

const redirectByTransactionStatus = (res, transaction, extraQuery = {}) => {
  const query = {
    transactionId: transaction?._id,
    paymentMethod: transaction?.paymentMethod,
    ...extraQuery,
  };

  if (!transaction) {
    return res.redirect(getPaymentRedirectUrl('error', query));
  }

  if (transaction.status === 'success') {
    return res.redirect(getPaymentRedirectUrl('success', query));
  }
  if (transaction.status === 'cancelled') {
    return res.redirect(getPaymentRedirectUrl('cancelled', query));
  }
  if (transaction.status === 'failed') {
    return res.redirect(getPaymentRedirectUrl('failed', query));
  }

  return res.redirect(getPaymentRedirectUrl('error', query));
};

const ensureSubscriptionApplied = async (transaction) => {
  const user = await User.findById(transaction.userId);
  if (!user) throw new Error('User not found for subscription update');

  const now = new Date();
  const currentExpiry = toDate(user.subscriptionExpiresAt);
  const currentPlan = String(user.subscriptionPlan || 'Free');
  const canCarryRemainingTime =
    ['Pro', 'ProPlus'].includes(currentPlan) &&
    currentExpiry &&
    currentExpiry.getTime() > now.getTime();

  const subscribedAt = canCarryRemainingTime ? currentExpiry : now;
  const subscriptionExpiresAt = addSubscriptionDuration(subscribedAt);
  const durationDays = calculateDurationDays(subscribedAt, subscriptionExpiresAt);

  transaction.subscriptionExpiresAt = subscriptionExpiresAt;
  // Keep legacy field aligned for consumers still reading "expiresAt".
  transaction.expiresAt = subscriptionExpiresAt;
  await transaction.save({ validateBeforeSave: false });

  await Subscription.updateMany(
    { userId: user._id, status: 'active' },
    {
      $set: {
        status: 'expired',
        lastRenewedAt: now,
      },
    }
  );

  const subscriptionRecord = await Subscription.create({
    userId: user._id,
    planType: transaction.subscriptionPlan,
    status: 'active',
    subscribedAt,
    expiresAt: subscriptionExpiresAt,
    durationDays,
    transactionId: transaction._id,
    amount: transaction.amount || 0,
    paymentMethod: transaction.paymentMethod || '',
    lastRenewedAt: now,
  });

  user.subscriptionPlan = transaction.subscriptionPlan;
  user.subscriptionStartedAt = subscribedAt;
  user.subscriptionExpiresAt = subscriptionExpiresAt;
  user.currentSubscriptionId = subscriptionRecord._id;
  user.listingsCount = 0;
  await user.save({ validateBeforeSave: false });
};

const buildPayPalReturnUrl = (transactionId) => {
  const rawReturnUrl =
    process.env.PAYPAL_RETURN_URL || 'http://localhost:5000/api/payments/paypal_return';
  const returnUrl = new URL(rawReturnUrl);
  returnUrl.searchParams.set('transactionId', String(transactionId));
  return returnUrl.toString();
};

const buildPayPalCancelUrl = (transactionId) => {
  const rawCancelUrl =
    process.env.PAYPAL_CANCEL_URL || process.env.PAYPAL_RETURN_URL || 'http://localhost:5000/api/payments/paypal_return';
  const cancelUrl = new URL(rawCancelUrl);
  cancelUrl.searchParams.set('transactionId', String(transactionId));
  cancelUrl.searchParams.set('cancelled', 'true');
  return cancelUrl.toString();
};

const findTransactionByMethodAndReference = async ({
  paymentMethod,
  transactionId,
  gatewayTransactionId,
}) => {
  const orConditions = [];

  if (transactionId) {
    if (mongoose.Types.ObjectId.isValid(String(transactionId))) {
      orConditions.push({ _id: String(transactionId) });
    }
    orConditions.push({ paymentGatewayTransactionId: String(transactionId) });
  }

  if (gatewayTransactionId) {
    orConditions.push({ paymentGatewayTransactionId: String(gatewayTransactionId) });
    if (mongoose.Types.ObjectId.isValid(String(gatewayTransactionId))) {
      orConditions.push({ _id: String(gatewayTransactionId) });
    }
  }

  if (!orConditions.length) return null;

  return Transaction.findOne({
    paymentMethod,
    $or: orConditions,
  });
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
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

const serializeSubscription = (subscription, now = new Date()) => {
  if (!subscription) return null;
  return {
    _id: subscription._id,
    planType: subscription.planType,
    status: subscription.status,
    subscribedAt: subscription.subscribedAt,
    expiresAt: subscription.expiresAt,
    durationDays: subscription.durationDays,
    transactionId: subscription.transactionId || null,
    amount: Number(subscription.amount || 0),
    paymentMethod: subscription.paymentMethod || '',
    lastRenewedAt: subscription.lastRenewedAt,
    remainingDays: calcRemainingDays(subscription.expiresAt, now),
    isActive:
      subscription.status === 'active' &&
      Boolean(toDate(subscription.expiresAt)) &&
      new Date(subscription.expiresAt).getTime() > now.getTime(),
  };
};

const normalizeSubscriptionStatuses = async (userId, now = new Date()) => {
  await Subscription.updateMany(
    {
      userId,
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
};

const getSubscriptionStatusFromUserFallback = (user, now = new Date()) => {
  if (!user) return null;
  const planType = String(user.subscriptionPlan || 'Free');
  const expiresAt = toDate(user.subscriptionExpiresAt);
  const subscribedAt = toDate(user.subscriptionStartedAt);
  const isActive =
    ['Pro', 'ProPlus'].includes(planType) &&
    expiresAt &&
    expiresAt.getTime() > now.getTime();

  return {
    _id: null,
    planType: isActive ? planType : 'Free',
    status: isActive ? 'active' : 'expired',
    subscribedAt: subscribedAt || null,
    expiresAt: expiresAt || null,
    durationDays:
      subscribedAt && expiresAt
        ? calculateDurationDays(subscribedAt, expiresAt)
        : SUBSCRIPTION_DURATION_MONTHS * 30,
    transactionId: null,
    amount: 0,
    paymentMethod: '',
    lastRenewedAt: subscribedAt || user.updatedAt || null,
    remainingDays: expiresAt ? calcRemainingDays(expiresAt, now) : 0,
    isActive: Boolean(isActive),
  };
};

// ─── Create Checkout ─────────────────────────────────────────
// POST /api/payments/create-checkout
exports.createCheckout = async (req, res, next) => {
  try {
    const { value, error } = checkoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const { subscriptionPlan, paymentMethod, amount } = value;
    const transactionAmount = paymentService.getPlanAmount(
      subscriptionPlan,
      paymentMethod,
      amount
    );

    const orderedAt = new Date();
    const checkoutExpiresAt = new Date(
      orderedAt.getTime() + PENDING_TRANSACTION_EXPIRE_MINUTES * 60 * 1000
    );
    const subscriptionExpiresAt = addSubscriptionDuration(orderedAt);

    const transaction = await Transaction.create({
      userId: req.user.id,
      subscriptionPlan,
      amount: transactionAmount,
      paymentMethod,
      status: 'pending',
      orderedAt,
      checkoutExpiresAt,
      subscriptionExpiresAt,
      // Keep legacy field for backward compatibility in existing UIs.
      expiresAt: subscriptionExpiresAt,
      paymentGatewayResponse: {
        phase: 'checkout_initialized',
      },
    });

    let checkoutUrl = '';
    let gatewayTransactionId = '';
    let gatewayPayload = {};

    try {
      if (paymentMethod === 'VNPay') {
        const vnpayResult = await paymentService.createVNPayUrl({
          userId: req.user.id,
          transactionId: transaction._id.toString(),
          subscriptionPlan,
          amount: transactionAmount,
          orderInfo: `EstateManager subscription ${subscriptionPlan} for user ${req.user.id}`,
          ipAddress: req.headers['x-forwarded-for'] || req.ip,
        });

        checkoutUrl = vnpayResult.paymentUrl;
        gatewayTransactionId = vnpayResult.txnRef;
        gatewayPayload = vnpayResult;
      } else {
        const paypalResult = await paymentService.createPayPalOrder({
          userId: req.user.id,
          transactionId: transaction._id.toString(),
          subscriptionPlan,
          amount: transactionAmount,
          returnUrl: buildPayPalReturnUrl(transaction._id),
          cancelUrl: buildPayPalCancelUrl(transaction._id),
        });

        checkoutUrl = paypalResult.approvalUrl;
        gatewayTransactionId = paypalResult.orderId;
        gatewayPayload = paypalResult;
      }
    } catch (gatewayError) {
      transaction.status = 'failed';
      transaction.paymentGatewayResponse = {
        phase: 'checkout_failed',
        message: gatewayError.message,
      };
      await transaction.save({ validateBeforeSave: false });
      throw gatewayError;
    }

    transaction.paymentGatewayTransactionId = gatewayTransactionId;
    transaction.paymentGatewayResponse = {
      phase: 'checkout_created',
      gatewayPayload,
    };
    await transaction.save({ validateBeforeSave: false });

    const shouldRedirect = String(req.query.redirect || 'true').toLowerCase() !== 'false';
    if (shouldRedirect) {
      return res.redirect(checkoutUrl);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Checkout created successfully',
      data: {
        transactionId: transaction._id,
        paymentMethod,
        subscriptionPlan,
        amount: transactionAmount,
        checkoutExpiresAt,
        subscriptionExpiresAt,
        checkoutUrl,
      },
    });
  } catch (err) {
    console.error('Create checkout error:', err);
    const message = err?.message || 'Unable to create checkout';
    const isBadRequest = /missing|invalid|unsupported|required/i.test(message);
    return res.status(isBadRequest ? 400 : 500).json({
      status: 'error',
      message,
    });
  }
};

// ─── Get My Subscription Transactions ───────────────────────
// GET /api/payments/subscriptions/me
exports.getMySubscriptions = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments({ userId: req.user.id }),
      Transaction.find({ userId: req.user.id })
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
        subscriptions: transactions.map(serializeTransaction),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Current Subscription Status ────────────────────────
// GET /api/payments/subscription-status/me
exports.getMyCurrentSubscription = async (req, res, next) => {
  try {
    const now = new Date();
    await normalizeSubscriptionStatuses(req.user.id, now);

    const user = await User.findById(req.user.id).select(
      'subscriptionPlan subscriptionStartedAt subscriptionExpiresAt currentSubscriptionId updatedAt'
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const [activeSubscription, latestSubscription] = await Promise.all([
      Subscription.findOne({ userId: req.user.id, status: 'active' })
        .sort({ expiresAt: -1, createdAt: -1 }),
      Subscription.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 }),
    ]);

    const subscriptionPayload = serializeSubscription(
      activeSubscription || latestSubscription,
      now
    ) || getSubscriptionStatusFromUserFallback(user, now);

    let shouldUpdateUser = false;
    if (activeSubscription) {
      if (String(user.subscriptionPlan || '') !== String(activeSubscription.planType || '')) {
        user.subscriptionPlan = activeSubscription.planType;
        shouldUpdateUser = true;
      }
      if (
        !user.subscriptionExpiresAt ||
        new Date(user.subscriptionExpiresAt).getTime() !==
          new Date(activeSubscription.expiresAt).getTime()
      ) {
        user.subscriptionExpiresAt = activeSubscription.expiresAt;
        shouldUpdateUser = true;
      }
      if (
        !user.subscriptionStartedAt ||
        new Date(user.subscriptionStartedAt).getTime() !==
          new Date(activeSubscription.subscribedAt).getTime()
      ) {
        user.subscriptionStartedAt = activeSubscription.subscribedAt;
        shouldUpdateUser = true;
      }
      if (String(user.currentSubscriptionId || '') !== String(activeSubscription._id || '')) {
        user.currentSubscriptionId = activeSubscription._id;
        shouldUpdateUser = true;
      }
    } else {
      const currentExpiry = toDate(user.subscriptionExpiresAt);
      if (
        ['Pro', 'ProPlus'].includes(String(user.subscriptionPlan || '')) &&
        (!currentExpiry || currentExpiry.getTime() <= now.getTime())
      ) {
        user.subscriptionPlan = 'Free';
        user.subscriptionStartedAt = undefined;
        user.subscriptionExpiresAt = undefined;
        user.currentSubscriptionId = null;
        shouldUpdateUser = true;
      }
    }

    if (shouldUpdateUser) {
      await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        subscription: subscriptionPayload,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Handle VNPay Return ─────────────────────────────────────
// GET /api/payments/vnpay_return
exports.handleVNPayReturn = async (req, res, next) => {
  try {
    console.log('[VNPay Return Debug] Full Query:', req.query);
    const verification = paymentService.verifyVNPayReturn(req.query);
    console.log('[VNPay Return Debug] Verification Result:', verification);

    if (!verification.transactionRef) {
      console.error('VNPay return missing vnp_TxnRef', req.query);
      return res.redirect(
        getPaymentRedirectUrl('error', {
          paymentMethod: 'VNPay',
          reason: 'missing_transaction_reference',
        })
      );
    }

    const transaction = await findTransactionByMethodAndReference({
      paymentMethod: 'VNPay',
      transactionId: verification.transactionRef,
      gatewayTransactionId: verification.transactionRef,
    });

    if (!transaction) {
      console.error('VNPay return cannot find transaction', verification.transactionRef);
      return res.redirect(
        getPaymentRedirectUrl('failed', {
          paymentMethod: 'VNPay',
          reason: 'transaction_not_found',
        })
      );
    }

    if (!verification.isValid) {
      console.error('VNPay checksum invalid', {
        transactionId: transaction._id,
        query: req.query,
      });
      return res.redirect(
        getPaymentRedirectUrl('error', {
          transactionId: transaction._id,
          paymentMethod: 'VNPay',
          reason: 'invalid_checksum',
        })
      );
    }

    if (transaction.status !== 'pending') {
      return redirectByTransactionStatus(res, transaction, { idempotent: 'true' });
    }

    transaction.paymentGatewayTransactionId =
      verification.gatewayTransactionId || verification.transactionRef;
    transaction.paymentGatewayResponse = {
      phase: 'return_verified',
      verification,
    };

    if (verification.isSuccess) {
      transaction.status = 'success';
      await transaction.save({ validateBeforeSave: false });
      await ensureSubscriptionApplied(transaction);
      return res.redirect(
        getPaymentRedirectUrl('success', {
          transactionId: transaction._id,
          paymentMethod: 'VNPay',
        })
      );
    }

    transaction.status = 'failed';
    await transaction.save({ validateBeforeSave: false });
    return res.redirect(
      getPaymentRedirectUrl('failed', {
        transactionId: transaction._id,
        paymentMethod: 'VNPay',
        responseCode: verification.responseCode,
      })
    );
  } catch (err) {
    console.error('VNPay return handling error:', err);
    return res.redirect(
      getPaymentRedirectUrl('error', {
        paymentMethod: 'VNPay',
        reason: 'internal_error',
      })
    );
  }
};

// ─── Handle VNPay IPN ────────────────────────────────────────
// POST /api/payments/vnpay_ipn
exports.handleVNPayIpn = async (req, res, next) => {
  try {
    const verification = paymentService.verifyVNPayReturn(req.body || {});

    if (!verification.isValid || !verification.transactionRef) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid checksum' });
    }

    const transaction = await findTransactionByMethodAndReference({
      paymentMethod: 'VNPay',
      transactionId: verification.transactionRef,
      gatewayTransactionId: verification.transactionRef,
    });

    if (!transaction) {
      return res.status(200).json({ RspCode: '01', Message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(200).json({ RspCode: '02', Message: 'Transaction already processed' });
    }

    transaction.paymentGatewayTransactionId =
      verification.gatewayTransactionId || verification.transactionRef;
    transaction.paymentGatewayResponse = {
      phase: 'ipn_verified',
      verification,
    };

    if (verification.isSuccess) {
      transaction.status = 'success';
      await transaction.save({ validateBeforeSave: false });
      await ensureSubscriptionApplied(transaction);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    }

    transaction.status = 'failed';
    await transaction.save({ validateBeforeSave: false });
    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('VNPay IPN handling error:', err);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// ─── Handle PayPal Return ────────────────────────────────────
// GET /api/payments/paypal_return
exports.handlePayPalReturn = async (req, res, next) => {
  try {
    const transactionId = req.query.transactionId ? String(req.query.transactionId) : '';
    const orderId = req.query.token ? String(req.query.token) : '';
    const isCancelled = String(req.query.cancelled || '').toLowerCase() === 'true';

    const transaction = await findTransactionByMethodAndReference({
      paymentMethod: 'PayPal',
      transactionId,
      gatewayTransactionId: orderId,
    });

    if (!transaction) {
      console.error('PayPal return cannot find transaction', { transactionId, orderId, query: req.query });
      return res.redirect(
        getPaymentRedirectUrl('failed', {
          paymentMethod: 'PayPal',
          reason: 'transaction_not_found',
        })
      );
    }

    if (transaction.status !== 'pending') {
      return redirectByTransactionStatus(res, transaction, { idempotent: 'true' });
    }

    if (isCancelled) {
      transaction.status = 'cancelled';
      transaction.paymentGatewayResponse = {
        phase: 'payer_cancelled',
        query: req.query,
      };
      await transaction.save({ validateBeforeSave: false });
      return res.redirect(
        getPaymentRedirectUrl('cancelled', {
          transactionId: transaction._id,
          paymentMethod: 'PayPal',
        })
      );
    }

    if (!orderId) {
      transaction.status = 'failed';
      transaction.paymentGatewayResponse = {
        phase: 'capture_failed',
        message: 'Missing PayPal order token',
        query: req.query,
      };
      await transaction.save({ validateBeforeSave: false });
      return res.redirect(
        getPaymentRedirectUrl('failed', {
          transactionId: transaction._id,
          paymentMethod: 'PayPal',
          reason: 'missing_order_token',
        })
      );
    }

    const captureResult = await paymentService.capturePayPalOrder(orderId);

    transaction.paymentGatewayTransactionId = orderId;
    transaction.paymentGatewayResponse = {
      phase: 'captured',
      captureResult,
      query: req.query,
    };

    if (captureResult.isSuccess) {
      transaction.status = 'success';
      await transaction.save({ validateBeforeSave: false });
      await ensureSubscriptionApplied(transaction);
      return res.redirect(
        getPaymentRedirectUrl('success', {
          transactionId: transaction._id,
          paymentMethod: 'PayPal',
        })
      );
    }

    transaction.status = 'failed';
    await transaction.save({ validateBeforeSave: false });
    return res.redirect(
      getPaymentRedirectUrl('failed', {
        transactionId: transaction._id,
        paymentMethod: 'PayPal',
      })
    );
  } catch (err) {
    console.error('PayPal return handling error:', err);
    return res.redirect(
      getPaymentRedirectUrl('error', {
        paymentMethod: 'PayPal',
        reason: 'internal_error',
      })
    );
  }
};
