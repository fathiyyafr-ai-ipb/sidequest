const pool = require('../config/db');

/**
 * Mendapatkan daftar notifikasi untuk user terotentikasi
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.is_read as "isRead", n.created_at as "createdAt", 
              n.team_id as "teamId", n.applicant_id as "applicantId",
              (SELECT status FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.applicant_id) as "memberStatus"
       FROM notifications n 
       WHERE n.user_id = $1 
       ORDER BY n.created_at DESC 
       LIMIT 50`,
      [userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[notificationController.getNotifications]', err);
    res.status(500).json({ message: 'Gagal mengambil notifikasi' });
  }
};

/**
 * Mendapatkan jumlah notifikasi belum dibaca / belum di-respond
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications n
       WHERE n.user_id = $1 
         AND (
           (n.team_id IS NOT NULL AND n.applicant_id IS NOT NULL AND 
            EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.applicant_id AND tm.status = 'applied'))
           OR 
           ((n.team_id IS NULL OR n.applicant_id IS NULL) AND n.is_read = false)
         )`,
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
