const pool = require('../config/db');

/**
 * Mendapatkan daftar notifikasi untuk user terotentikasi
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      'SELECT id, title, message, is_read as "isRead", created_at as "createdAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[notificationController.getNotifications]', err);
    res.status(500).json({ message: 'Gagal mengambil notifikasi' });
  }
};

/**
 * Mendapatkan jumlah notifikasi belum dibaca
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unread = parseInt(result.rows[0].count, 10) || 0;
    res.json({ data: { unread } });
  } catch (err) {
    console.error('[notificationController.getUnreadCount]', err);
    res.status(500).json({ message: 'Gagal mengambil jumlah notifikasi' });
  }
};

/**
 * Menandai semua notifikasi telah dibaca
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );
    res.json({ message: 'Semua notifikasi ditandai telah dibaca' });
  } catch (err) {
    console.error('[notificationController.markAllRead]', err);
    res.status(500).json({ message: 'Gagal memperbarui status notifikasi' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAllRead
};
