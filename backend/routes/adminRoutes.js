const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin moderation and verification endpoints
 */

// ─── All admin routes require authentication + admin role ────
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/subscriptions', adminController.getSubscriptions);
router.patch('/subscriptions/:id/status', adminController.updateSubscriptionStatus);

// Property Moderation
/**
 * @swagger
 * /admin/properties/pending:
 *   get:
 *     summary: Get pending properties prioritized by provider subscription plan
 *     description: Returns pending properties sorted by owner subscription tier (ProPlus > Pro > Free), then by newest createdAt within each tier.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 20
 *         description: Max number of records per page
 *     responses:
 *       200:
 *         description: Prioritized pending property list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get('/properties/pending', adminController.getPendingProperties);
router.patch('/properties/:id/moderate', adminController.moderateProperty);

// Provider Verification
router.get('/providers/pending', adminController.getPendingProviders);
router.get('/providers/:id/subscriptions', adminController.getProviderSubscriptions);
router.patch('/providers/:id/verify', adminController.verifyProvider);

module.exports = router;
