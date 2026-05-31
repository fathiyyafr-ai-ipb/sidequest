const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const {
  createAd,
  getMyAds,
  getPricing,
  getActiveAd,
  trackImpression,
  trackClick
} = require('../controllers/sponsorController');

// Inline middleware to check if user is a Sponsor
const isSponsor = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Otorisasi ditolak' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const user = result.rows[0];
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh administrator.' });
    }

    if (user.role !== 'sponsor') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya untuk akun mitra Sponsor.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[isSponsor]', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 1. Campaign actions (Protected - Sponsor only)
router.post('/ads', authMiddleware, isSponsor, createAd);
router.get('/ads', authMiddleware, isSponsor, getMyAds);

// 2. Pricing configuration (Protected - Sponsor & Moderator access)
router.get('/pricing', authMiddleware, getPricing);

// 3. E2E public tracking & active ad delivery (Public)
router.get('/active-ads', getActiveAd);
router.post('/ads/impression', trackImpression);
router.post('/ads/:id/click', trackClick);

module.exports = router;
