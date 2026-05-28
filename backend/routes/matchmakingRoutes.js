const express = require('express');
const router = express.Router();
const { getMatchmaking, connectUser } = require('../controllers/matchmakingController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getMatchmaking);
router.post('/connect', authMiddleware, connectUser);

module.exports = router;
