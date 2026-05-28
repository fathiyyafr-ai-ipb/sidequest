const express = require('express');
const router = express.Router();
const { getMine, getCandidates } = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, getMine);
router.get('/candidates', authMiddleware, getCandidates);

module.exports = router;
