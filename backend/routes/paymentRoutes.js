const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: VNPay and PayPal checkout/callback APIs
 */

/**
 * @swagger
 * /payments/create-checkout:
 *   post:
 *     summary: Create subscription checkout URL for VNPay or PayPal
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: boolean
 *         description: Redirect mode (default true). Set redirect=false to receive JSON with checkoutUrl instead of immediate redirect.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionPlan
 *               - paymentMethod
 *             properties:
 *               subscriptionPlan:
 *                 type: string
 *                 enum: [Pro, ProPlus]
 *               paymentMethod:
 *                 type: string
 *                 enum: [VNPay, PayPal]
 *               amount:
 *                 type: number
 *                 description: Optional override amount
 *     responses:
 *       200:
 *         description: Checkout URL created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/create-checkout', authController.protect, paymentController.createCheckout);

/**
 * @swagger
 * /payments/vnpay_return:
 *   get:
 *     summary: VNPay return callback handler
 *     tags: [Payments]
 *     description: Verifies VNPay checksum, performs idempotent transaction update, applies subscription if payment succeeds, then redirects to frontend page.
 *     responses:
 *       302:
 *         description: Redirect to frontend success/failed/error page
 */
router.get('/vnpay_return', paymentController.handleVNPayReturn);

/**
 * @swagger
 * /payments/vnpay_ipn:
 *   post:
 *     summary: VNPay IPN callback handler (server-to-server)
 *     tags: [Payments]
 *     description: Verifies VNPay checksum and updates transaction idempotently. Returns VNPay-standard RspCode/Message.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: VNPay ack response with RspCode
 */
router.post('/vnpay_ipn', paymentController.handleVNPayIpn);

/**
 * @swagger
 * /payments/paypal_return:
 *   get:
 *     summary: PayPal return callback handler
 *     tags: [Payments]
 *     description: Captures approved PayPal order, performs idempotent transaction update, applies subscription if capture succeeds, then redirects to frontend page.
 *     responses:
 *       302:
 *         description: Redirect to frontend success/failed/cancelled page
 */
router.get('/paypal_return', paymentController.handlePayPalReturn);

module.exports = router;
