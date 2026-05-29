const express = require('express');
const router = express.Router();
const { chatWithSideKick } = require('../controllers/sidekickController');
const authMiddleware = require('../middleware/auth');

router.post('/chat', authMiddleware, chatWithSideKick);

module.exports = router;
