const express = require('express');
const router = express.Router();
const { getMatchmaking } = require('../controllers/matchmakingController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getMatchmaking);

module.exports = router;
