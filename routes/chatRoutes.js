const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/authMiddleware');

function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.post('/chat/new', authenticateToken, asyncHandler(chatController.createNewChat));
router.get('/chat', authenticateToken, asyncHandler(chatController.getChats));
router.get('/chat/:chatId', authenticateToken, asyncHandler(chatController.getChatById));
router.post('/chat/:chatId/message', authenticateToken, asyncHandler(chatController.addMessageToChat));
router.post('/chat', authenticateToken, asyncHandler(chatController.chatWithGemini));

router.delete('/chat/:chatId', authenticateToken, asyncHandler(chatController.deleteChat));


module.exports = router;
