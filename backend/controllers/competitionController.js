const pool = require('../config/db');

// Mengambil seluruh kompetisi yang berstatus 'published' (untuk umum/peserta)
const getCompetitions = async (req, res) => {
  const { cat } = req.query;
  try {
    let query = `
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 'published'
    `;
    let values = [];

    if (cat && cat !== 'all') {
      query += ` AND cat.slug = $1`;
      values.push(cat);
    }

    query += ` ORDER BY c.deadline ASC`;

    const result = await pool.query(query, values);
    
    const formattedData = result.rows.map(row => ({
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      org: row.organizer,
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description
    }));

    res.json({ data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Mengambil kompetisi berdasarkan ID
const getCompetitionById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      organizer: row.organizer,
      org: row.organizer,
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      color_gradient: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description,
      description: row.description,
      scope: (row.tags && row.tags.length > 1) ? row.tags[1] : 'Nasional',
      registrationClose: row.deadline,
      daysUntilClose: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      status: row.status,
      minMembers: row.min_members,
      maxMembers: row.max_members,
      registrationModel: row.registration_model,
      winnerAnnouncement: row.winner_announcement
    };

    res.json({ data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Menyimpan bookmark kompetisi
const saveCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const exists = await pool.query(
      'SELECT * FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Already saved' });
    }
    await pool.query(
      'INSERT INTO saved_competitions (user_id, competition_id) VALUES ($1, $2)',
      [userId, compId]
    );
    res.json({ message: 'Competition saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Menghapus bookmark kompetisi
const unsaveCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    await pool.query(
      'DELETE FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    res.json({ message: 'Competition unsaved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Mengambil seluruh bookmark kompetisi milik peserta
const getSavedCompetitions = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(`
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
      JOIN saved_competitions sc ON c.id = sc.competition_id
      WHERE sc.user_id = $1
    `, [userId]);

    const formattedData = result.rows.map(row => ({
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      org: row.organizer,
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description
    }));

    res.json({ data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Mendaftar kompetisi (Hosted -> Pending dengan Notifikasi, Non-Hosted -> Approved otomatis)
const registerCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  const { teamId, portfolioUrl, motivation, contact } = req.body;
  try {
    // Ambil info kompetisi
    const compRes = await pool.query(
      'SELECT title, organizer_id, registration_model, min_members, max_members FROM competitions WHERE id = $1',
      [compId]
    );
    if (compRes.rows.length === 0) {
      return res.status(404).json({ message: 'Lomba tidak ditemukan' });
    }
    const comp = compRes.rows[0];

    const exists = await pool.query(
      `SELECT * FROM competition_registrations 
       WHERE (user_id = $1 AND competition_id = $2)
          OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = $1 AND status = 'joined') AND competition_id = $2)`,
      [userId, compId]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Sudah terdaftar di lomba ini' });
    }

    const isTeamComp = comp.min_members > 1 || comp.max_members > 1;

    // Jika lomba bertipe kelompok dan hosted, lakukan validasi tim
    if (comp.registration_model === 'hosted' && isTeamComp) {
      if (!teamId) {
        return res.status(400).json({ message: 'Lomba kelompok memerlukan tim untuk didaftarkan.' });
      }

      // 1. Validasi Kepemilikan Tim (Hanya Owner yang boleh mendaftarkan)
      const ownerCheck = await pool.query(
        "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'",
        [teamId, userId]
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Hanya pembuat (owner) tim yang dapat mendaftarkan tim ini ke kompetisi.' });
      }

      // 2. Validasi Jumlah Anggota Tim (Descriptive error)
      const countRes = await pool.query(
        "SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'joined'",
        [teamId]
      );
      const count = parseInt(countRes.rows[0].count, 10) || 0;

      if (count < comp.min_members || count > comp.max_members) {
        return res.status(400).json({
          message: `Jumlah anggota tim masih belum sesuai (Dibutuhkan antara ${comp.min_members} sampai ${comp.max_members} orang, tim Anda saat ini: ${count} orang).`
        });
      }
    }

    const regStatus = comp.registration_model === 'hosted' ? 'pending' : 'approved';

    await pool.query(
      `INSERT INTO competition_registrations 
        (user_id, competition_id, status, portfolio_url, motivation, contact, team_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, compId, regStatus, portfolioUrl || null, motivation || null, contact || null, teamId || null]
    );

    // Ambil nama pendaftar untuk pesan notifikasi
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userRes.rows.length > 0 ? userRes.rows[0].name : 'Peserta';

    // Kirim notifikasi jika pendaftaran bertipe hosted
    if (comp.registration_model === 'hosted' && comp.organizer_id) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, applicant_id)
        VALUES ($1, $2, $3, $4)
      `, [
        comp.organizer_id,
        'Pendaftaran Baru Lomba',
        `${userName} telah mendaftar sebagai calon peserta lomba "${comp.title}"! Tinjau portofolionya segera.`,
        userId
      ]);
    }

    res.json({ 
      message: comp.registration_model === 'hosted' 
        ? 'Pendaftaran berhasil dikirim! Menunggu persetujuan penyelenggara.' 
        : 'Pendaftaran berhasil disetujui secara otomatis!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Mengambil status registrasi kompetisi
const getRegistrationStatus = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT status FROM competition_registrations 
       WHERE (user_id = $1 AND competition_id = $2)
          OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = $1 AND status = 'joined') AND competition_id = $2)`,
      [userId, compId]
    );
    const saved = await pool.query(
      'SELECT * FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    
    res.json({ 
      registered: result.rows.length > 0,
      registrationStatus: result.rows.length > 0 ? result.rows[0].status : null,
      saved: saved.rows.length > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// ==========================================
// ── ORGANIZER ENDPOINTS ───────────────────
// ==========================================

// Mengambil lomba yang dikelola oleh organizer aktif
const getOrganizerCompetitions = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(`
      SELECT c.*, cat.slug as category_slug, cat.name as category_name
      FROM competitions c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.organizer_id = $1
      ORDER BY c.id DESC
    `, [userId]);

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Membuat lomba baru (default: Draft)
const createCompetition = async (req, res) => {
  const userId = req.userId;
  const { title, organizer, categorySlug, deadline, tags, colorGradient, emoji, isFree, prize, description, minMembers, maxMembers, registrationModel } = req.body;
  try {
    const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [categorySlug || 'web-dev']);
    const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : 3;

    const result = await pool.query(`
      INSERT INTO competitions 
        (category_id, title, organizer, deadline, tags, color_gradient, emoji, is_free, prize, description, status, organizer_id, min_members, max_members, registration_model)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13, $14)
      RETURNING *
    `, [
      categoryId,
      title,
      organizer,
      deadline || null,
      tags ? JSON.stringify(tags) : '["Teknologi", "Nasional"]',
      colorGradient || 'from-blue-500 to-indigo-600',
      emoji || '🏆',
      isFree !== undefined ? isFree : true,
      prize || 'Sertifikat & Tropy',
      description || '',
      userId,
      minMembers || 1,
      maxMembers || 5,
      registrationModel || 'hosted'
    ]);

    res.status(201).json({ message: 'Lomba draft berhasil dibuat!', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Memperbarui informasi detail lomba
const updateCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  const { title, organizer, categorySlug, deadline, tags, colorGradient, emoji, isFree, prize, description, minMembers, maxMembers, registrationModel } = req.body;
  try {
    // Pastikan milik organizer tersebut
    const check = await pool.query('SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2', [compId, userId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau kompetisi tidak ditemukan' });
    }

    const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1', [categorySlug || 'web-dev']);
    const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : 3;

    await pool.query(`
      UPDATE competitions
      SET category_id = $1, title = $2, organizer = $3, deadline = $4, tags = $5, 
          color_gradient = $6, emoji = $7, is_free = $8, prize = $9, description = $10,
          min_members = $11, max_members = $12, registration_model = $13
      WHERE id = $14 AND organizer_id = $15
    `, [
      categoryId,
      title,
      organizer,
      deadline || null,
      tags ? JSON.stringify(tags) : '["Teknologi", "Nasional"]',
      colorGradient || 'from-blue-500 to-indigo-600',
      emoji || '🏆',
      isFree !== undefined ? isFree : true,
      prize || 'Sertifikat & Tropy',
      description || '',
      minMembers || 1,
      maxMembers || 5,
      registrationModel || 'hosted',
      compId,
      userId
    ]);

    res.json({ message: 'Lomba berhasil diperbarui!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mempublikasikan lomba (Draft -> Published)
const publishCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const result = await pool.query(`
      UPDATE competitions 
      SET status = 'published' 
      WHERE id = $1 AND organizer_id = $2
      RETURNING *
    `, [compId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau kompetisi tidak ditemukan' });
    }

    res.json({ message: 'Lomba berhasil dipublikasikan!', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mengumumkan hasil pemenang kompetisi
const announceCompetitionResults = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  const { announcement } = req.body;
  try {
    const result = await pool.query(`
      UPDATE competitions 
      SET winner_announcement = $1 
      WHERE id = $2 AND organizer_id = $3
      RETURNING *
    `, [announcement, compId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau kompetisi tidak ditemukan' });
    }

    res.json({ message: 'Pengumuman pemenang berhasil dipublikasikan!', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mengambil daftar pelamar / calon peserta pendaftaran
const getCompetitionApplicants = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    // Pastikan ini adalah milik organizer tersebut
    const check = await pool.query('SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2', [compId, userId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau kompetisi tidak ditemukan' });
    }

    const result = await pool.query(`
      SELECT cr.status, cr.registered_at as "registeredAt",
             cr.portfolio_url as "portfolioUrl", cr.motivation, cr.contact, cr.team_id as "teamId",
             t.name as "teamName",
             u.id as "userId", u.name, u.email, u.university, u.prodi, u.avatar_color as "avatarColor", u.bio
      FROM competition_registrations cr
      JOIN users u ON cr.user_id = u.id
      LEFT JOIN teams t ON cr.team_id = t.id
      WHERE cr.competition_id = $1
      ORDER BY cr.registered_at DESC
    `, [compId]);

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Menerima atau menolak pendaftaran calon peserta lomba
const respondCompetitionApplicant = async (req, res) => {
  const userId = req.userId; // organizer
  const compId = req.params.id;
  const targetUserId = req.params.userId; // participant
  const { action } = req.body; // 'approve' or 'reject'
  try {
    // Pastikan ini adalah milik organizer tersebut
    const check = await pool.query('SELECT id, title FROM competitions WHERE id = $1 AND organizer_id = $2', [compId, userId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau kompetisi tidak ditemukan' });
    }
    const comp = check.rows[0];

    const dbStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await pool.query(`
      UPDATE competition_registrations
      SET status = $1
      WHERE competition_id = $2 AND user_id = $3
      RETURNING *
    `, [dbStatus, compId, targetUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pendaftaran tidak ditemukan' });
    }

    // Kirim notifikasi otomatis ke peserta
    const notifTitle = action === 'approve' ? 'Pendaftaran Lomba Disetujui' : 'Pendaftaran Lomba Ditolak';
    const notifMsg = action === 'approve' 
      ? `Selamat! Pendaftaran Anda di kompetisi "${comp.title}" telah disetujui penyelenggara.` 
      : `Mohon maaf, pendaftaran Anda di kompetisi "${comp.title}" ditolak penyelenggara.`;

    await pool.query(`
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
    `, [targetUserId, notifTitle, notifMsg]);

    res.json({ message: `Peserta berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { 
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
};
