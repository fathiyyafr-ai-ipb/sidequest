const express = require('express');
const router = express.Router();
const { 
  getCompetitions, 
  getCompetitionById,
  saveCompetition,
  unsaveCompetition,
  getSavedCompetitions,
  registerCompetition,
  getRegistrationStatus,
  // Organizer extensions
  getOrganizerCompetitions,
  createCompetition,
  updateCompetition,
  publishCompetition,
  announceCompetitionResults,
  getCompetitionApplicants,
  respondCompetitionApplicant
} = require('../controllers/competitionController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', getCompetitions);
router.get('/:id', getCompetitionById);

// Participant routes
router.get('/saved', authMiddleware, getSavedCompetitions);
router.post('/:id/save', authMiddleware, saveCompetition);
router.delete('/:id/save', authMiddleware, unsaveCompetition);
router.post('/:id/register', authMiddleware, registerCompetition);
router.get('/:id/registration-status', authMiddleware, getRegistrationStatus);

// Organizer routes
router.get('/organizer/mine', authMiddleware, getOrganizerCompetitions);
router.post('/organizer/create', authMiddleware, createCompetition);
router.put('/organizer/:id', authMiddleware, updateCompetition);
router.patch('/organizer/:id/publish', authMiddleware, publishCompetition);
router.patch('/organizer/:id/announce', authMiddleware, announceCompetitionResults);
router.get('/organizer/:id/applicants', authMiddleware, getCompetitionApplicants);
router.patch('/organizer/:id/applicants/:userId', authMiddleware, respondCompetitionApplicant);

module.exports = router;
