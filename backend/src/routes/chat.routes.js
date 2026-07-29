const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.get('/history', chatController.getHistory);
router.post('/chat', chatController.chat);
router.post('/proactive-chat', chatController.proactiveChat);

module.exports = router;
