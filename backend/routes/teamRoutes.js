const express = require('express');
const router = express.Router();
const { getMine, getCandidates, getTeams, createTeam, applyTeam } = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

router.get('/', getTeams); // Buka akses publik agar list tim dapat dilihat
router.post('/', authMiddleware, createTeam);
router.post('/:id/apply', authMiddleware, applyTeam);
router.get('/me', authMiddleware, getMine);
router.get('/candidates', authMiddleware, getCandidates);

module.exports = router;
