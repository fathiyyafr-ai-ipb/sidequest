const pool = require('../config/db');

/**
 * Mendapatkan informasi tim dari user yang sedang login
 */
const getMine = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Cari apakah user tergabung dalam sebuah tim
    const memberCheck = await pool.query(
      `SELECT team_id, role, status FROM team_members WHERE user_id = $1 AND status = 'joined'`,
      [userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.json({ data: null }); // Aman: Belum punya tim
    }

    const { team_id, role, status } = memberCheck.rows[0];

    // 2. Ambil informasi detail tim dan kompetisinya
    const teamRes = await pool.query(
      `SELECT t.id, t.name, t.competition_id, c.title as competition_title, c.organizer as competition_organizer, c.emoji as competition_emoji
       FROM teams t
       LEFT JOIN competitions c ON t.competition_id = c.id
       WHERE t.id = $1`,
      [team_id]
    );

    if (teamRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }

    const team = teamRes.rows[0];

    // 3. Ambil seluruh anggota dari tim tersebut
    const membersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.university, u.prodi, u.avatar_color, tm.role as team_role
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1 AND tm.status = 'joined'`,
      [team_id]
    );

    // 4. Ambil skills untuk masing-masing anggota tim
    const members = [];
    for (const member of membersRes.rows) {
      const skillsRes = await pool.query(
        `SELECT s.name as label, s.tag_class as cls
         FROM skills s
         JOIN user_skills us ON s.id = us.skill_id
         WHERE us.user_id = $1`,
        [member.id]
      );
      
      members.push({
        id: member.id,
        name: member.name,
        fullName: member.name,
        email: member.email,
        university: member.university,
        uni: member.university,
        prodi: member.prodi,
        avatarColor: member.avatar_color || 'bg-blue-500',
        teamRole: member.team_role,
        skills: skillsRes.rows.map(s => s.label)
      });
    }

    res.json({
      data: {
        id: team.id,
        name: team.name,
        competition: {
          id: team.competition_id,
          title: team.competition_title,
          organizer: team.competition_organizer,
          emoji: team.competition_emoji
        },
        members
      }
    });

  } catch (err) {
    console.error('[teamController.getMine]', err);
    res.status(500).json({ message: 'Gagal mengambil informasi tim' });
  }
};

/**
 * Mendapatkan rekomendasi kandidat mahasiswa (seperti Gilbran) yang belum memiliki tim
 */
const getCandidates = async (req, res) => {
  try {
    const userId = req.userId;

    // Ambil list user dengan role peserta, selain user itu sendiri,
    // dan yang belum tergabung dalam tim manapun (status joined)
    const candidatesRes = await pool.query(
      `SELECT id, name, email, university, prodi, avatar_color, bio
       FROM users
       WHERE role = 'peserta'
         AND id != $1
         AND id NOT IN (SELECT user_id FROM team_members WHERE status = 'joined')
       LIMIT 10`,
      [userId]
    );

    const candidates = [];
    for (const c of candidatesRes.rows) {
      // Ambil skills masing-masing kandidat
      const skillsRes = await pool.query(
        `SELECT s.name as label, s.tag_class as cls
         FROM skills s
         JOIN user_skills us ON s.id = us.skill_id
         WHERE us.user_id = $1`,
        [c.id]
      );

      candidates.push({
        id: c.id,
        name: c.name,
        fullName: c.name,
        email: c.email,
        university: c.university,
        uni: c.university,
        prodi: c.prodi,
        avatarColor: c.avatar_color || 'bg-blue-500',
        bio: c.bio || 'Siap berkolaborasi!',
        skills: skillsRes.rows.map(s => s.label)
      });
    }

    res.json({ data: candidates });

  } catch (err) {
    console.error('[teamController.getCandidates]', err);
    res.status(500).json({ message: 'Gagal mengambil rekomendasi kandidat' });
  }
};

/**
 * Mendapatkan daftar seluruh tim yang membuka rekrutmen
 * Menerima query parameter: cat (kategori)
 */
const getTeams = async (req, res) => {
  const { cat } = req.query;
  try {
    let query = `
      SELECT t.*, c.title as competition_title, c.organizer as competition_organizer, 
             c.emoji as competition_emoji, cat.slug as category_slug
      FROM teams t
      JOIN competitions c ON t.competition_id = c.id
      JOIN categories cat ON c.category_id = cat.id
    `;
    let values = [];

    if (cat && cat !== 'all') {
      query += ` WHERE cat.slug = $1`;
      values.push(cat);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, values);

    const formattedTeams = [];
    for (const row of result.rows) {
      // Hitung jumlah anggota dinamis yang joined
      const membersCountRes = await pool.query(
        `SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'joined'`,
        [row.id]
      );
      const membersCount = parseInt(membersCountRes.rows[0].count) || 0;

      formattedTeams.push({
        id: row.id,
        nama: row.name,
        lomba: row.competition_title,
        cat: row.category_slug,
        anggota: membersCount,
        maxAnggota: row.max_members,
        slot: Math.max(0, row.max_members - membersCount),
        skills: row.skills_needed || [],
        deadline: row.recruitment_deadline ? new Date(row.recruitment_deadline).toISOString().split('T')[0] : '-',
        kontak: row.contact,
        desc: row.description,
        avatarColor: row.avatar_color,
        emoji: row.emoji,
        urgency: row.urgency
      });
    }

    res.json({ data: formattedTeams });
  } catch (err) {
    console.error('[teamController.getTeams]', err);
    res.status(500).json({ message: 'Gagal mengambil daftar rekrutmen tim' });
  }
};

/**
 * Membuat rekrutmen tim baru oleh user yang terotentikasi
 */
const createTeam = async (req, res) => {
  const userId = req.userId;
  const { name, competition_id, description, skills_needed, recruitment_deadline, contact, max_members, category } = req.body;

  try {
    // 1. Validasi input wajib
    if (!name || !competition_id) {
      return res.status(400).json({ message: 'Nama tim dan kompetisi wajib diisi' });
    }

    // 2. Tentukan emoji dan warna gradien berdasarkan kategori jika tidak ada
    const catColorMap = {
      teknologi: "bg-primary",
      bisnis: "bg-orange-500",
      sosial: "bg-green-500",
      desain: "bg-pink-500",
      sains: "bg-blue-500"
    };
    const catEmojiMap = {
      teknologi: "💻",
      bisnis: "💼",
      sosial: "🌱",
      desain: "🎨",
      sains: "⚛️"
    };
    const color = catColorMap[category] || 'bg-primary';
    const emoji = catEmojiMap[category] || '💻';

    // 3. Masukkan tim baru ke database
    const teamRes = await pool.query(
      `INSERT INTO teams (name, competition_id, created_by, description, skills_needed, recruitment_deadline, contact, max_members, avatar_color, emoji)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name, 
        competition_id, 
        userId, 
        description, 
        JSON.stringify(skills_needed || []), 
        recruitment_deadline || null, 
        contact || '', 
        max_members || 5,
        color,
        emoji
      ]
    );

    const newTeam = teamRes.rows[0];

    // 4. Daftarkan pembuat tim sebagai Owner di team_members
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, 'owner', 'joined')`,
      [newTeam.id, userId]
    );

    res.status(201).json({
      message: 'Rekrutmen tim berhasil dibuat',
      data: newTeam
    });

  } catch (err) {
    console.error('[teamController.createTeam]', err);
    res.status(500).json({ message: 'Gagal membuat rekrutmen tim baru' });
  }
};

/**
 * Mengajukan bergabung ke rekrutmen tim oleh user terotentikasi (status = applied)
 */
const applyTeam = async (req, res) => {
  const userId = req.userId;
  const teamId = parseInt(req.params.id, 10);

  try {
    // 1. Cek apakah tim ada
    const teamCheck = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }

    // 2. Cek apakah user sudah terdaftar di tim tersebut (baik owner, member, applied, dll.)
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    if (memberCheck.rows.length > 0) {
      const status = memberCheck.rows[0].status;
      if (status === 'joined') {
        return res.status(400).json({ message: 'Anda sudah bergabung dalam tim ini' });
      } else if (status === 'applied') {
        return res.status(400).json({ message: 'Anda sudah mengajukan permohonan ke tim ini' });
      } else if (status === 'invited') {
        // Otomatis bergabung jika sebelumnya diundang
        await pool.query(
          `UPDATE team_members SET status = 'joined' WHERE team_id = $1 AND user_id = $2`,
          [teamId, userId]
        );
        return res.json({ message: 'Berhasil bergabung dengan tim (menerima undangan)' });
      }
    }

    // 3. Tambahkan sebagai pelamar ('applied')
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, 'member', 'applied')`,
      [teamId, userId]
    );

    res.json({ message: 'Permintaan bergabung berhasil dikirim!' });

  } catch (err) {
    console.error('[teamController.applyTeam]', err);
    res.status(500).json({ message: 'Gagal mengirim permintaan bergabung' });
  }
};

module.exports = {
  getMine,
  getCandidates,
  getTeams,
  createTeam,
  applyTeam
};
