const express = require('express');

const usersController = require('../controllers/users');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

// '/api/users....'

router.get('/avatars', usersController.getAvatars);

router.get('/usernames', usersController.checkUsernameAvailability);

router.post('/login', usersController.login);

router.post('/signup', usersController.signup);

router.post('/', checkAuth, usersController.getUsersByUsername);

router.patch('/change-avatar', checkAuth, usersController.changeAvatar);

router.get('/:userId', checkAuth, usersController.getUser);

module.exports = router;