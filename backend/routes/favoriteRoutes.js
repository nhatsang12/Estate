const express = require('express');
const authController = require('../controllers/authController');
const favoriteController = require('../controllers/favoriteController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('user', 'provider'));

router.get('/', favoriteController.getMyFavorites);
router.post('/', favoriteController.addFavorite);
router.get('/property/:propertyId/status', favoriteController.getFavoriteStatus);
router.delete('/:id', favoriteController.removeFavorite);

module.exports = router;
