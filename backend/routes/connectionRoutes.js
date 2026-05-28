const express = require('express');
const router = express.Router();
const { respondConnection } = require('../controllers/matchmakingController');
const authMiddleware = require('../middleware/auth');

router.patch('/:id', authMiddleware, respondConnection);

module.exports = router;
