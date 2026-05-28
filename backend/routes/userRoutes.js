const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, getProfile); // get current user
router.get('/:id', authMiddleware, getProfile); // get by id (backwards compatibility)
router.put('/me', authMiddleware, updateProfile); // update current user

module.exports = router;
