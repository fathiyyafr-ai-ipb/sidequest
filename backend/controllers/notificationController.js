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
              CASE 
                WHEN n.title = 'Undangan Bergabung Tim' THEN (SELECT status FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.user_id)
                ELSE (SELECT status FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.applicant_id)
              END as "memberStatus",
              (SELECT status FROM connections c WHERE c.sender_id = n.applicant_id AND c.receiver_id = n.user_id) as "connectionStatus"
       FROM notifications n 
       WHERE n.user_id = $1 
         -- Hilangkan join request yang sudah tidak 'applied' (sudah direspond) atau undangan yang sudah tidak 'invited'
         AND (
           n.team_id IS NULL OR n.applicant_id IS NULL OR
           (n.title = 'Undangan Bergabung Tim' AND (SELECT status FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.user_id) = 'invited') OR
           (n.title != 'Undangan Bergabung Tim' AND (SELECT status FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.applicant_id) = 'applied')
         )
         -- Hilangkan connection request yang sudah tidak 'pending' (sudah direspond)
         AND (
           n.team_id IS NOT NULL OR n.applicant_id IS NULL OR n.title != 'Permintaan Koneksi Baru' OR
           (SELECT status FROM connections c WHERE c.sender_id = n.applicant_id AND c.receiver_id = n.user_id) = 'pending'
         )
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
           -- Notifikasi join request yang masih pending
           (n.team_id IS NOT NULL AND n.applicant_id IS NOT NULL AND n.title != 'Undangan Bergabung Tim' AND 
            EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.applicant_id AND tm.status = 'applied'))
           OR
           -- Notifikasi undangan team yang masih pending
           (n.team_id IS NOT NULL AND n.applicant_id IS NOT NULL AND n.title = 'Undangan Bergabung Tim' AND 
            EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = n.team_id AND tm.user_id = n.user_id AND tm.status = 'invited'))
           OR
           -- Notifikasi connection request yang masih pending
           (n.team_id IS NULL AND n.applicant_id IS NOT NULL AND n.title = 'Permintaan Koneksi Baru' AND
            EXISTS (SELECT 1 FROM connections c WHERE c.sender_id = n.applicant_id AND c.receiver_id = n.user_id AND c.status = 'pending'))
           OR 
           -- Notifikasi reguler lain yang belum dibaca
           (
             (n.team_id IS NULL OR n.applicant_id IS NULL OR (n.title != 'Permintaan Koneksi Baru' AND n.title != 'Undangan Bergabung Tim')) AND 
             n.is_read = false
           )
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
