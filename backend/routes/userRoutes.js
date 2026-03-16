const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

// ─── All routes below require authentication ────────────────
router.use(authController.protect);

// ─── Current User Routes ─────────────────────────────────────
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.patch('/change-password', userController.changePassword);

/**
 * @swagger
 * /users/kyc/submit:
 *   patch:
 *     summary: Submit CCCD front/back images for automated KYC
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cccdFront
 *               - cccdBack
 *             properties:
 *               cccdFront:
 *                 type: string
 *                 format: binary
 *                 description: Front side image of CCCD
 *               cccdBack:
 *                 type: string
 *                 format: binary
 *                 description: Back side image of CCCD
 *               declaredIdNumber:
 *                 type: string
 *                 description: Optional ID number declared by user for stronger matching
 *     responses:
 *       200:
 *         description: KYC submission accepted and processed
 *       400:
 *         description: Missing/invalid files
 *       401:
 *         description: Unauthorized
 *       502:
 *         description: Failed to upload files to Cloudinary
 */
router.patch(
  '/kyc/submit',
  upload.fields([
    { name: 'cccdFront', maxCount: 1 },
    { name: 'cccdBack', maxCount: 1 },
  ]),
  userController.submitKycDocuments
);

// ─── Admin Only Routes ───────────────────────────────────────
router.use(authController.restrictTo('admin'));
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, provider, admin]
 *         description: Filter users by role
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter providers by verification status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Max number of users to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: A list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only Admin can access)
 */
router
  .route('/')
  .get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUserById)
  .delete(userController.deleteUser);

router.patch('/:id/role', userController.updateUserRole);

module.exports = router;
