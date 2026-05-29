const express = require('express');
const router = express.Router();
const { register, login, verifyUser, forgotPassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyUser);
router.post('/forgot-password', forgotPassword);

module.exports = router;
