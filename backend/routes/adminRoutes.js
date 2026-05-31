const express = require('express');
const router = express.Router();
const {
  getModeratorStats,
  getModeratorData,
  toggleActiveStatus,
  simulateWebScraping,
  toggleModeratorStatus,
  updateFeatureSettings,
  updateMaintenanceSettings,
  approveOrganizer,
  inviteSponsor,
  getAllSponsorships,
  toggleSponsorshipStatus,
  updateSponsorshipCost,
  addPricingRate,
  getCostLogs
} = require('../controllers/adminController');

const authMiddleware = require('../middleware/auth');
const { isModeratorOrAdmin, isSuperadmin } = require('../middleware/adminMiddleware');

// 1. Moderator & Superadmin shared routes
router.get('/stats', authMiddleware, isModeratorOrAdmin, getModeratorStats);
router.get('/data', authMiddleware, isModeratorOrAdmin, getModeratorData);
router.patch('/toggle/:type/:id', authMiddleware, isModeratorOrAdmin, toggleActiveStatus);
router.post('/scrape', authMiddleware, isModeratorOrAdmin, simulateWebScraping);
router.patch('/approve-organizer/:id', authMiddleware, isModeratorOrAdmin, approveOrganizer);
router.post('/invite-sponsor', authMiddleware, isModeratorOrAdmin, inviteSponsor);
router.get('/sponsorships', authMiddleware, isModeratorOrAdmin, getAllSponsorships);
router.patch('/sponsorships/:id/toggle', authMiddleware, isModeratorOrAdmin, toggleSponsorshipStatus);
router.patch('/sponsorships/:id/cost', authMiddleware, isModeratorOrAdmin, updateSponsorshipCost);
router.post('/sponsorship-pricing', authMiddleware, isModeratorOrAdmin, addPricingRate);
router.get('/sponsorships/:id/logs', authMiddleware, isModeratorOrAdmin, getCostLogs);

// 2. Superadmin exclusive routes
router.patch('/super/moderator/:id/toggle', authMiddleware, isSuperadmin, toggleModeratorStatus);
router.patch('/super/features', authMiddleware, isSuperadmin, updateFeatureSettings);
router.patch('/super/maintenance', authMiddleware, isSuperadmin, updateMaintenanceSettings);

module.exports = router;
