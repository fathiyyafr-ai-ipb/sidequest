const express = require('express');
const router = express.Router();
const { 
  getCompetitions, 
  getCompetitionById,
  saveCompetition,
  unsaveCompetition,
  getSavedCompetitions,
  registerCompetition,
  getRegistrationStatus
} = require('../controllers/competitionController');
const authMiddleware = require('../middleware/auth');

router.get('/', getCompetitions);
router.get('/saved', authMiddleware, getSavedCompetitions);
router.get('/:id', getCompetitionById);
router.post('/:id/save', authMiddleware, saveCompetition);
router.delete('/:id/save', authMiddleware, unsaveCompetition);
router.post('/:id/register', authMiddleware, registerCompetition);
router.get('/:id/registration-status', authMiddleware, getRegistrationStatus);

module.exports = router;
