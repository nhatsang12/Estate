const Joi = require('joi');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const paymentService = require('../services/paymentService');

const checkoutSchema = Joi.object({
  subscriptionPlan: Joi.string().valid('Pro', 'ProPlus').required(),
  paymentMethod: Joi.string().valid('VNPay', 'PayPal').required(),
  amount: Joi.number().positive().optional(),
}).options({ stripUnknown: true });

const PENDING_TRANSACTION_EXPIRE_MINUTES = 10;

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

  user.subscriptionPlan = transaction.subscriptionPlan;
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
    const expiresAt = new Date(
      orderedAt.getTime() + PENDING_TRANSACTION_EXPIRE_MINUTES * 60 * 1000
    );

    const transaction = await Transaction.create({
      userId: req.user.id,
      subscriptionPlan,
      amount: transactionAmount,
      paymentMethod,
      status: 'pending',
      orderedAt,
      expiresAt,
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
