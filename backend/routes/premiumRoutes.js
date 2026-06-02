/**
 * SideQuest — premiumRoutes.js
 * API Routes for Premium Hosted Event Organizer & Analytics Console features.
 */
const express = require('express');
const router = express.Router();
const {
  getPremiumSettings,
  updatePremiumSettings,
  getOrganizerPremiumStatus,
  getEventSettings,
  saveEventSettings,
  getCustomFields,
  saveCustomFields,
  getSubmissions,
  getJudges,
  addJudge,
  getAnalytics,
  judgeLogin,
  getJudgeSubmissions,
  saveJudgeGrade,
  getParticipantFields,
  submitParticipantAsset
} = require('../controllers/premiumController');

const authMiddleware = require('../middleware/auth');

// ── 1. SUPERADMIN ROUTES ──────────────────────────────────────────────────
router.get('/admin/settings', authMiddleware, getPremiumSettings);
router.post('/admin/settings', authMiddleware, updatePremiumSettings);

// ── 2. ORGANIZER ROUTES ────────────────────────────────────────────────────
router.get('/organizer/status', authMiddleware, getOrganizerPremiumStatus);
router.get('/organizer/settings/:compId', authMiddleware, getEventSettings);
router.post('/organizer/settings/:compId', authMiddleware, saveEventSettings);
router.get('/organizer/fields/:compId', authMiddleware, getCustomFields);
router.post('/organizer/fields/:compId', authMiddleware, saveCustomFields);
router.get('/organizer/submissions/:compId', authMiddleware, getSubmissions);
router.get('/organizer/judges/:compId', authMiddleware, getJudges);
router.post('/organizer/judges/:compId', authMiddleware, addJudge);
router.get('/organizer/analytics/:compId', authMiddleware, getAnalytics);

// ── 3. JUDGE PORTAL ROUTES (TOKEN AUTHENTICATED) ──────────────────────────
router.get('/judge/auth', judgeLogin);
router.get('/judge/submissions', getJudgeSubmissions);
router.post('/judge/grade', saveJudgeGrade);

// ── 4. PARTICIPANT INTERACTION ROUTES ─────────────────────────────────────
router.get('/participant/fields/:compId', authMiddleware, getParticipantFields);
router.post('/participant/submit/:compId', authMiddleware, submitParticipantAsset);

module.exports = router;
