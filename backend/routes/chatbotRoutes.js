const express = require('express');
const authController = require('../controllers/authController');
const chatbotController = require('../controllers/chatbotController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('user', 'provider'));

router.post('/query', chatbotController.queryChatbot);
router.get('/memory', chatbotController.getMemory);
router.delete('/memory', chatbotController.clearMemory);

module.exports = router;
