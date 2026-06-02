const express = require('express');
const router = express.Router();
const { 
  getMine, 
  getCandidates, 
  getTeams, 
  createTeam, 
  applyTeam, 
  respondApplicant, 
  inviteMember, 
  respondInvitation,
  getTeamById,
  updateTeam
} = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware.optional, getTeams); // Gunakan optional auth agar penyortiran prioritas koneksi aktif untuk user login
router.post('/', authMiddleware, createTeam);
router.post('/:id/apply', authMiddleware, applyTeam);
router.post('/:id/respond', authMiddleware, respondApplicant);
router.get('/me', authMiddleware, getMine);
router.get('/candidates', authMiddleware, getCandidates);
router.post('/:id/invite', authMiddleware, inviteMember);
router.post('/:id/respond-invite', authMiddleware, respondInvitation);
router.get('/:id', authMiddleware, getTeamById);
router.put('/:id', authMiddleware, updateTeam);

module.exports = router;
