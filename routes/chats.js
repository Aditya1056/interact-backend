const express = require('express');

const chatController = require('../controllers/chats');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

// /api/chats/...

router.get('/', checkAuth, chatController.getChats);

router.get('/search', checkAuth, chatController.searchChats);

router.post('/create', checkAuth, chatController.createChat);

router.delete('/:groupId', checkAuth, chatController.deleteGroup);

router.delete('/:groupId/:userId', checkAuth, chatController.removeUserFromGroup);

router.post('/add-user/:groupId', checkAuth, chatController.addUsersToGroup);

router.get('/:chatId', checkAuth, chatController.getMessages);

router.post('/message', checkAuth, chatController.createMessage);

module.exports = router;