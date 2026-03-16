const express = require('express');
const propertyController = require('../controllers/propertyController');
const authController = require('../controllers/authController');
const { verifyOwnership, verifyProviderStatus } = require('../middleware/permissions');
const upload = require('../middleware/upload');
const { validateProperty } = require('../middleware/validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management and search
 */

/**
 * @swagger
 * /properties/properties-within/{distance}/center/{latlng}/unit/{unit}:
 *   get:
 *     summary: Get properties within a specified distance from a center point
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: distance
 *         required: true
 *         schema:
 *           type: number
 *         description: Distance to search within (e.g., 5 for 5km)
 *       - in: path
 *         name: latlng
 *         required: true
 *         schema:
 *           type: string
 *           example: "10.760201,106.699709"
 *         description: Latitude and Longitude of the center point (lat,lng)
 *       - in: path
 *         name: unit
 *         required: true
 *         schema:
 *           type: string
 *           enum: [mi, km]
 *         description: Unit for distance (miles or kilometers)
 *     responses:
 *       200:
 *         description: A list of properties within the specified radius
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.route('/properties-within/:distance/center/:latlng/unit/:unit')
  .get(propertyController.getPropertiesWithin);

/**
 * @swagger
 * /properties/{id}/recommendations:
 *   get:
 *     summary: Get recommendations for a specific property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the property to get recommendations for
 *     responses:
 *       200:
 *         description: A list of recommended properties
 *       404:
 *         description: Property not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/recommendations', propertyController.getRecommendations);

router
  .route('/')
  /**
   * @swagger
   * /properties:
   *   get:
   *     summary: Get all properties (filtered by status for users, all for admin/provider)
   *     tags: [Properties]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected, available, rented, sold]
   *         description: Filter properties by status (admin/provider roles might see more statuses)
   *       - in: query
   *         name: price[gte]
   *         schema:
   *           type: number
   *         description: Filter by price greater than or equal to
   *       - in: query
   *         name: price[lte]
   *         schema:
   *           type: number
   *         description: Filter by price less than or equal to
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [apartment, house, villa, studio, office]
   *         description: Filter by property type
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *         description: Sort results by field (e.g., price,-createdAt)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *         description: Max number of properties to return
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *         description: Page number for pagination
   *     responses:
   *       200:
   *         description: A list of properties
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 results:
   *                   type: number
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object # Placeholder if $ref to schema is not globally defined
   *       401:
   *         description: Unauthorized
   */
  .get(propertyController.getAllProperties)
  /**
   * @swagger
   * /properties:
   *   post:
   *     summary: Create a new property (Provider/Admin only)
   *     tags: [Properties]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data: # Dùng multipart/form-data vì có upload file (images, ownershipDocuments)
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 example: Beautiful Riverside Apartment
   *               description:
   *                 type: string
   *                 example: Spacious 3-bedroom apartment with a stunning river view.
   *               price:
   *                 type: number
   *                 example: 3500000000
   *               address:
   *                 type: string
   *                 example: 123 Riverfront Street, District 2, HCMC
   *               type:
   *                 type: string
   *                 enum: [apartment, house, villa, studio, office]
   *                 example: apartment
   *               bedrooms:
   *                 type: number
   *                 example: 3
   *               bathrooms:
   *                 type: number
   *                 example: 2
   *               area:
   *                 type: number
   *                 example: 150
   *               furnished:
   *                 type: boolean
   *                 example: true
   *               yearBuilt:
   *                 type: number
   *                 example: 2018
   *               amenities:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: [Pool, Gym, Balcony]
   *               location[coordinates][0]: # Longitude
   *                 type: number
   *                 format: float
   *                 example: 106.7011
   *               location[coordinates][1]: # Latitude
   *                 type: number
   *                 format: float
   *                 example: 10.7812
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary # For file upload
   *                 description: Array of image files for the property (max 10)
   *               ownershipDocuments:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary # For file upload
   *                 description: Array of ownership document files (max 5)
   *     responses:
   *       201:
   *         description: Property created successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden (Not a provider/admin or quota exceeded)
   *       500:
   *         description: Server error
   */
  .post(
    authController.protect,
    authController.restrictTo('admin', 'provider'), // Updated role
    verifyProviderStatus, // Ensure provider is verified
    upload.fields([{ name: 'images', maxCount: 10 }, { name: 'ownershipDocuments', maxCount: 5 }]), // Allow Multiple Files
    validateProperty,
    propertyController.createProperty
  );

router
  .route('/:id')
  /**
   * @swagger
   * /properties/{id}:
   *   get:
   *     summary: Get a single property by ID
   *     tags: [Properties]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the property to retrieve
   *     responses:
   *       200:
   *         description: Property details
   *       404:
   *         description: Property not found
   *       401:
   *         description: Unauthorized
   */
  .get(propertyController.getProperty)
  /**
   * @swagger
   * /properties/{id}:
   *   patch:
   *     summary: Update a property by ID (Admin/Provider only)
   *     tags: [Properties]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the property to update
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               price:
   *                 type: number
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Property updated successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Property not found
   */
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'provider'), // Updated role
    verifyOwnership, // Ensure user owns the property
    upload.fields([{ name: 'images', maxCount: 10 }]), // Updates usually just images
    propertyController.updateProperty
  )
  /**
   * @swagger
   * /properties/{id}:
   *   delete:
   *     summary: Delete a property by ID (Admin/Provider only)
   *     tags: [Properties]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the property to delete
   *     responses:
   *       204:
   *         description: Property deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Property not found
   */
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'provider'), // Updated role
    verifyOwnership, // Ensure user owns the property
    propertyController.deleteProperty
  );

module.exports = router;