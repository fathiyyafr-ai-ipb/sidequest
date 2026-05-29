const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// 1. Middleware to verify if user is Moderator or Superadmin
const isModeratorOrAdmin = async (req, res, next) => {
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

    if (user.role !== 'moderator' && user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya untuk Moderator atau Superadmin' });
    }

    req.user = user; // Attach full user object for subsequent middleware/controllers
    next();
  } catch (err) {
    console.error('[isModeratorOrAdmin]', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Middleware to verify if user is Superadmin
const isSuperadmin = async (req, res, next) => {
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

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya untuk Superadmin' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[isSuperadmin]', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Middleware to check platform-wide status (Maintenance Mode & Feature Flags)
const checkPlatformStatus = async (req, res, next) => {
  // Allow auth routes always so that admins/moderators can log in to bypass maintenance mode
  if (req.originalUrl && (req.originalUrl.startsWith('/api/auth') || req.originalUrl.includes('/auth'))) {
    return next();
  }

  try {
    // A. Ambil semua konfigurasi dari database
    const settingsRes = await pool.query('SELECT * FROM platform_settings');
    const settings = {};
    settingsRes.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    // B. Cek role user aktif jika ada token
    let currentUserRole = null;
    let currentUserActive = true;
    const token = req.header('Authorization');
    
    if (token) {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret_key_sidequest');
        const userRes = await pool.query('SELECT role, is_active FROM users WHERE id = $1', [decoded.userId]);
        if (userRes.rows.length > 0) {
          currentUserRole = userRes.rows[0].role;
          currentUserActive = userRes.rows[0].is_active;
        }
      } catch (e) {
        // Abaikan jika token tidak valid/kadaluarsa, biarkan authMiddleware menangani jika rute tersebut membutuhkan auth
      }
    }

    // Jika akun user aktif dideaktivasi, block akses
    if (currentUserActive === false) {
      return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh administrator.' });
    }

    const isAdminOrMod = currentUserRole === 'superadmin' || currentUserRole === 'moderator';

    // C. Verifikasi Maintenance Mode
    if (settings['maintenance_mode'] === 'true' && !isAdminOrMod) {
      return res.status(503).json({ message: 'Platform dalam pemeliharaan' });
    }

    // D. Verifikasi Feature Toggles
    const path = req.baseUrl + req.path;
    const isOrganizerOrAdminPath = path.includes('/organizer') || path.includes('/admin');

    if (!isAdminOrMod && !isOrganizerOrAdminPath) {
      // 1. Fitur Eksplorasi Lomba
      if (path.startsWith('/api/competitions') && settings['feature_competitions'] === 'inactive') {
        return res.status(403).json({ message: 'Fitur eksplorasi lomba dinonaktifkan sementara oleh administrator' });
      }
      // 2. Fitur Tim & Rekrutmen
      if (path.startsWith('/api/teams') && settings['feature_teams'] === 'inactive') {
        return res.status(403).json({ message: 'Fitur tim & rekrutmen dinonaktifkan sementara oleh administrator' });
      }
      // 3. Fitur Matchmaking / Rekomendasi
      if (path.startsWith('/api/matchmaking') && settings['feature_matchmaking'] === 'inactive') {
        return res.status(403).json({ message: 'Fitur matchmaking dinonaktifkan sementara oleh administrator' });
      }
    }

    next();
  } catch (err) {
    console.error('[checkPlatformStatus]', err);
    next(); // Biarkan request berlanjut jika ada kegagalan internal setting
  }
};

module.exports = {
  isModeratorOrAdmin,
  isSuperadmin,
  checkPlatformStatus,
};
