const express = require('express');
const messageController = require('../controllers/messageController');
const chatbotController = require('../controllers/chatbotController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('user', 'provider'));

router.get('/conversations', messageController.getConversations);
router.get('/conversations/:conversationId/messages', messageController.getConversationMessages);
router.patch('/conversations/:conversationId/read', messageController.markConversationAsRead);
router.get('/unread-count', messageController.getUnreadCount);

router.post('/send', upload.single('image'), messageController.sendMessage);
router.post('/chatbot', chatbotController.queryChatbot);

module.exports = router;
