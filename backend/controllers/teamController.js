const pool = require('../config/db');

/**
 * Mendapatkan informasi tim dari user yang sedang login
 */
const getMine = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Cari seluruh tim aktif yang diikuti oleh user
    const memberCheck = await pool.query(
      `SELECT team_id, role, status FROM team_members WHERE user_id = $1 AND status = 'joined'`,
      [userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.json({ data: [] }); // Kembalikan array kosong jika belum punya tim
    }

    const teams = [];

    for (const memberRow of memberCheck.rows) {
      const { team_id, role } = memberRow;

      // 2. Ambil informasi detail tim dan kompetisinya
      const teamRes = await pool.query(
        `SELECT t.id, t.name, t.competition_id, c.title as competition_title, c.organizer as competition_organizer, c.emoji as competition_emoji
         FROM teams t
         LEFT JOIN competitions c ON t.competition_id = c.id
         WHERE t.id = $1`,
        [team_id]
      );

      if (teamRes.rows.length === 0) continue;

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

      // 5. Ambil calon anggota (applicants) yang berstatus 'applied' atau 'invited'
      const applicantsRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.university, u.prodi, u.avatar_color, u.bio, tm.status as member_status
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1 AND tm.status IN ('applied', 'invited')`,
        [team_id]
      );

      const applicants = [];
      for (const applicant of applicantsRes.rows) {
        const skillsRes = await pool.query(
          `SELECT s.name as label, s.tag_class as cls
           FROM skills s
           JOIN user_skills us ON s.id = us.skill_id
           WHERE us.user_id = $1`,
          [applicant.id]
        );
        
        applicants.push({
          id: applicant.id,
          name: applicant.name,
          fullName: applicant.name,
          email: applicant.email,
          university: applicant.university,
          uni: applicant.university,
          prodi: applicant.prodi,
          avatarColor: applicant.avatar_color || 'bg-blue-500',
          bio: applicant.bio || 'Siap berkolaborasi!',
          skills: skillsRes.rows.map(s => s.label),
          status: applicant.member_status
        });
      }

      teams.push({
        id: team.id,
        name: team.name,
        role: role, // 'owner' atau 'member'
        competition: {
          id: team.competition_id,
          title: team.competition_title,
          organizer: team.competition_organizer,
          emoji: team.competition_emoji
        },
        members,
        applicants
      });
    }

    res.json({ data: teams });

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

const getTeams = async (req, res) => {
  const { cat, type } = req.query;
  const userId = req.userId || null;
  try {
    let query = `
      SELECT t.*, c.title as competition_title, c.organizer as competition_organizer, 
             c.emoji as competition_emoji, cat.slug as category_slug,
             COALESCE((
               SELECT COUNT(*) 
               FROM team_members tm
               JOIN connections conn ON 
                 ((conn.sender_id = tm.user_id AND conn.receiver_id = $1) OR (conn.receiver_id = tm.user_id AND conn.sender_id = $1))
               WHERE tm.team_id = t.id AND tm.status = 'joined' AND conn.status = 'accepted'
             ), 0) as connection_count,
             EXISTS(
               SELECT 1 
               FROM team_members tm
               JOIN connections conn ON 
                 ((conn.sender_id = tm.user_id AND conn.receiver_id = $1) OR (conn.receiver_id = tm.user_id AND conn.sender_id = $1))
               WHERE tm.team_id = t.id AND tm.status = 'joined' AND conn.status = 'accepted'
             ) as has_connection_with_member,
             EXISTS(
               SELECT 1
               FROM team_members tm
               WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.role = 'owner' AND tm.status = 'joined'
             ) as is_owner,
             EXISTS(
               SELECT 1
               FROM team_members tm
               WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.status = 'joined'
             ) as is_joined
      FROM teams t
      JOIN competitions c ON t.competition_id = c.id
      JOIN categories cat ON c.category_id = cat.id
    `;
    let values = [userId];
    let whereClauses = [];

    if (cat && cat !== 'all') {
      whereClauses.push(`cat.slug = $${whereClauses.length + 2}`);
      values.push(cat);
    }

    if (userId) {
      if (type === 'my-teams') {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.status = 'joined'
        )`);
      } else if (type === 'other-teams') {
        whereClauses.push(`NOT EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.status = 'joined'
        )`);
      }
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY connection_count DESC, t.created_at DESC';

    const result = await pool.query(query, values);

    const formattedTeams = [];
    for (const row of result.rows) {
      // Hitung jumlah anggota dinamis yang joined
      const membersCountRes = await pool.query(
        `SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'joined'`,
        [row.id]
      );
      const membersCount = parseInt(membersCountRes.rows[0].count) || 0;

      // Ambil nama dan warna avatar dari seluruh anggota tim yang tergabung
      const membersRes = await pool.query(
        `SELECT u.id, u.name, u.avatar_color
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1 AND tm.status = 'joined'
         ORDER BY tm.role DESC`,
        [row.id]
      );
      
      const membersList = membersRes.rows.map(m => ({
        id: m.id,
        name: m.name,
        avatarColor: m.avatar_color || 'bg-primary'
      }));

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
        urgency: row.urgency,
        requireConnectionToApply: row.require_connection_to_apply || false,
        hasConnectionWithMember: row.has_connection_with_member || false,
        isOwner: row.is_owner || false,
        isJoined: row.is_joined || false,
        anggotaList: membersList
      });
    }

    res.json({ data: formattedTeams });
  } catch (err) {
    console.error('[teamController.getTeams]', err);
    res.status(500).json({ message: 'Gagal mengambil daftar rekrutmen tim' });
  }
};

const createTeam = async (req, res) => {
  const userId = req.userId;
  const { name, competition_id, description, skills_needed, recruitment_deadline, contact, max_members, category, require_connection_to_apply } = req.body;

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
      `INSERT INTO teams (name, competition_id, created_by, description, skills_needed, recruitment_deadline, contact, max_members, avatar_color, emoji, require_connection_to_apply)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        emoji,
        require_connection_to_apply || false
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

const applyTeam = async (req, res) => {
  const userId = req.userId;
  const teamId = parseInt(req.params.id, 10);

  try {
    // 1. Cek apakah tim ada
    const teamCheck = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }
    const team = teamCheck.rows[0];

    // Cek proteksi koneksi pelamar
    if (team.require_connection_to_apply) {
      const connectionCheck = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM team_members tm
          JOIN connections c ON 
            ((c.sender_id = tm.user_id AND c.receiver_id = $1) OR (c.receiver_id = tm.user_id AND c.sender_id = $1))
          WHERE tm.team_id = $2 AND tm.status = 'joined' AND c.status = 'accepted'
        ) as has_connection`,
        [userId, teamId]
      );
      
      if (!connectionCheck.rows[0].has_connection) {
        return res.status(400).json({ message: 'Owner tim mewajibkan pelamar memiliki koneksi dengan salah satu anggota tim.' });
      }
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

    // 4. Kirim notifikasi ke semua anggota tim yang sudah bergabung
    const applicantNameRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const applicantName = applicantNameRes.rows[0].name;
    const teamName = team.name;

    const membersToNotify = await pool.query(
      `SELECT user_id FROM team_members WHERE team_id = $1 AND status = 'joined'`,
      [teamId]
    );

    for (const member of membersToNotify.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
        [
          member.user_id,
          'Permohonan Bergabung Baru',
          `${applicantName} mengajukan permohonan untuk bergabung dengan tim Anda, ${teamName}!`,
          teamId,
          userId
        ]
      );
    }

    res.json({ message: 'Permintaan bergabung berhasil dikirim!' });

  } catch (err) {
    console.error('[teamController.applyTeam]', err);
    res.status(500).json({ message: 'Gagal mengirim permintaan bergabung' });
  }
};

/**
 * Memproses respon owner terhadap calon anggota (approve/reject)
 */
const respondApplicant = async (req, res) => {
  const userId = req.userId; // logged-in user
  const teamId = parseInt(req.params.id, 10);
  const { applicantId, action } = req.body;

  try {
    // 1. Validasi input
    if (!applicantId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'ApplicantId dan action (approve/reject) wajib diset' });
    }

    // 2. Cek apakah user login adalah owner tim
    const ownerCheck = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'`,
      [teamId, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Hanya owner tim yang dapat memproses permohonan bergabung' });
    }

    // 3. Ambil nama tim
    const teamRes = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);
    const teamName = teamRes.rows[0].name;

    // 4. Proses aksi
    if (action === 'approve') {
      // Ubah status pelamar menjadi joined
      const updateRes = await pool.query(
        `UPDATE team_members SET status = 'joined' WHERE team_id = $1 AND user_id = $2 AND status = 'applied' RETURNING *`,
        [teamId, applicantId]
      );

      if (updateRes.rows.length === 0) {
        return res.status(400).json({ message: 'Pelamar tidak ditemukan atau permohonan tidak aktif' });
      }

      // Kirim notifikasi ke pelamar (set team_id dan applicant_id ke owner yang melakukan approve)
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
        [
          applicantId,
          'Permohonan Bergabung Diterima',
          `Selamat! Permohonan Anda untuk bergabung dengan tim ${teamName} telah diterima oleh owner.`,
          teamId,
          userId
        ]
      );

      // Kirim notifikasi ke seluruh anggota tim lainnya
      const applicantNameRes = await pool.query('SELECT name FROM users WHERE id = $1', [applicantId]);
      const applicantName = applicantNameRes.rows[0].name;

      const otherMembers = await pool.query(
        `SELECT user_id FROM team_members WHERE team_id = $1 AND status = 'joined' AND user_id != $2`,
        [teamId, applicantId]
      );

      for (const member of otherMembers.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
          [
            member.user_id,
            'Anggota Baru Bergabung',
            `${applicantName} telah bergabung dengan tim Anda, ${teamName}!`,
            teamId,
            applicantId
          ]
        );
      }

      return res.json({ message: 'Permohonan bergabung berhasil disetujui!' });

    } else if (action === 'reject') {
      // Hapus baris applied pelamar
      const deleteRes = await pool.query(
        `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 AND status = 'applied' RETURNING *`,
        [teamId, applicantId]
      );

      if (deleteRes.rows.length === 0) {
        return res.status(400).json({ message: 'Pelamar tidak ditemukan atau permohonan tidak aktif' });
      }

      // Kirim notifikasi ke pelamar
      await pool.query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
        [
          applicantId,
          'Permohonan Bergabung Belum Diterima',
          `Mohon maaf, permohonan Anda untuk bergabung dengan tim ${teamName} belum dapat diterima saat ini.`
        ]
      );

      return res.json({ message: 'Permohonan bergabung berhasil ditolak' });
    }

  } catch (err) {
    console.error('[teamController.respondApplicant]', err);
    res.status(500).json({ message: 'Gagal memproses permohonan bergabung' });
  }
};

module.exports = {
  getMine,
  getCandidates,
  getTeams,
  createTeam,
  applyTeam,
  respondApplicant,
  inviteMember,
  respondInvitation,
  getTeamById,
  updateTeam
};

/**
 * Mengundang mahasiswa untuk bergabung ke tim oleh owner tim
 */
async function inviteMember(req, res) {
  const ownerId = req.userId;
  const teamId = parseInt(req.params.id, 10);
  const { userId } = req.body; // target student being invited

  try {
    if (!userId) {
      return res.status(400).json({ message: 'UserId target wajib disertakan' });
    }

    // 1. Cek apakah tim ada
    const teamRes = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (teamRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }
    const team = teamRes.rows[0];

    // 2. Cek apakah pengundang adalah owner tim
    const ownerCheck = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'`,
      [teamId, ownerId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Hanya owner tim yang dapat mengundang anggota baru' });
    }

    // 3. Cek apakah target mahasiswa ada dan role peserta
    const targetRes = await pool.query('SELECT name, role, only_allow_connection_invites FROM users WHERE id = $1', [userId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Target mahasiswa tidak ditemukan' });
    }
    const targetUser = targetRes.rows[0];
    if (targetUser.role !== 'peserta') {
      return res.status(400).json({ message: 'Hanya pengguna mahasiswa (peserta) yang dapat diundang ke dalam tim' });
    }

    // 4. Cek apakah target sudah bergabung/diundang/melamar ke tim
    const memberCheck = await pool.query(
      'SELECT status FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    if (memberCheck.rows.length > 0) {
      const status = memberCheck.rows[0].status;
      if (status === 'joined') {
        return res.status(400).json({ message: 'Pengguna tersebut sudah tergabung dalam tim' });
      } else if (status === 'invited') {
        return res.status(400).json({ message: 'Pengguna tersebut sudah diundang sebelumnya' });
      } else if (status === 'applied') {
        return res.status(400).json({ message: 'Pengguna tersebut sudah melamar ke tim ini. Silakan setujui lamarannya di dashboard.' });
      }
    }

    // 5. Cek privasi target: jika only_allow_connection_invites = true
    if (targetUser.only_allow_connection_invites) {
      const connectionCheck = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM team_members tm
          JOIN connections c ON 
            ((c.sender_id = tm.user_id AND c.receiver_id = $1) OR (c.receiver_id = tm.user_id AND c.sender_id = $1))
          WHERE tm.team_id = $2 AND tm.status = 'joined' AND c.status = 'accepted'
        ) as has_connection`,
        [userId, teamId]
      );

      if (!connectionCheck.rows[0].has_connection) {
        return res.status(400).json({ 
          message: 'Pengguna ini mengonfigurasi agar hanya menerima undangan dari tim yang salah satu anggotanya sudah terkoneksi dengannya.' 
        });
      }
    }

    // 6. Masukkan undangan ke database
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, status) VALUES ($1, $2, 'member', 'invited')`,
      [teamId, userId]
    );

    // 7. Ambil nama kompetisi
    const compRes = await pool.query('SELECT title FROM competitions WHERE id = $1', [team.competition_id]);
    const compTitle = compRes.rows[0].title;

    // 8. Kirim notifikasi ke mahasiswa target
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'Undangan Bergabung Tim',
        `Anda diundang oleh owner untuk bergabung dengan tim "${team.name}" untuk kompetisi "${compTitle}"!`,
        teamId,
        ownerId
      ]
    );

    res.status(201).json({ message: 'Undangan bergabung berhasil dikirim!' });

  } catch (err) {
    console.error('[teamController.inviteMember]', err);
    res.status(500).json({ message: 'Gagal mengirimkan undangan bergabung' });
  }
}

/**
 * Merespons undangan bergabung dari owner tim (approve/reject)
 */
async function respondInvitation(req, res) {
  const userId = req.userId;
  const teamId = parseInt(req.params.id, 10);
  const { action } = req.body; // 'approve' atau 'reject'

  try {
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action (approve/reject) wajib diisi' });
    }

    // 1. Cek apakah ada undangan aktif
    const inviteCheck = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND status = 'invited'`,
      [teamId, userId]
    );
    if (inviteCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Undangan tidak ditemukan atau tidak aktif' });
    }

    // 2. Ambil informasi tim & nama user
    const teamRes = await pool.query('SELECT name, created_by, competition_id FROM teams WHERE id = $1', [teamId]);
    const team = teamRes.rows[0];
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userRes.rows[0].name;

    if (action === 'approve') {
      // Ubah status undangan menjadi joined
      await pool.query(
        `UPDATE team_members SET status = 'joined' WHERE team_id = $1 AND user_id = $2`,
        [teamId, userId]
      );

      // Kirim notifikasi ke owner tim
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
        [
          team.created_by,
          'Undangan Tim Diterima',
          `${userName} menerima undangan dan bergabung dengan tim Anda, ${team.name}!`,
          teamId,
          userId
        ]
      );

      // Kirim notifikasi ke seluruh anggota tim lainnya
      const otherMembers = await pool.query(
        `SELECT user_id FROM team_members WHERE team_id = $1 AND status = 'joined' AND user_id != $2 AND user_id != $3`,
        [teamId, userId, team.created_by]
      );

      for (const member of otherMembers.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, team_id, applicant_id) VALUES ($1, $2, $3, $4, $5)`,
          [
            member.user_id,
            'Anggota Baru Bergabung',
            `${userName} telah bergabung dengan tim Anda, ${team.name}!`,
            teamId,
            userId
          ]
        );
      }

      res.json({ message: 'Berhasil menyetujui undangan dan bergabung dengan tim!' });

    } else if (action === 'reject') {
      // Hapus baris undangan dari database
      await pool.query(
        `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 AND status = 'invited'`,
        [teamId, userId]
      );

      // Kirim notifikasi penolakan ke owner tim
      await pool.query(
        `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
        [
          team.created_by,
          'Undangan Tim Ditolak',
          `Mohon maaf, ${userName} menolak undangan Anda untuk bergabung dengan tim ${team.name}.`
        ]
      );

      res.json({ message: 'Undangan berhasil ditolak.' });
    }

  } catch (err) {
    console.error('[teamController.respondInvitation]', err);
    res.status(500).json({ message: 'Gagal merespons undangan tim' });
  }
}

/**
 * Mendapatkan detail tim berdasarkan ID (Hanya jika terdaftar/login)
 */
async function getTeamById(req, res) {
  const { id } = req.params;
  try {
    const teamRes = await pool.query(
      `SELECT t.*, c.title as competition_title, c.organizer as competition_organizer, c.emoji as competition_emoji
       FROM teams t
       LEFT JOIN competitions c ON t.competition_id = c.id
       WHERE t.id = $1`,
      [id]
    );

    if (teamRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }

    const team = teamRes.rows[0];
    res.json({
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        contact: team.contact,
        maxMembers: team.max_members,
        requireConnectionToApply: team.require_connection_to_apply || false,
        competitionId: team.competition_id,
        competitionTitle: team.competition_title,
        competitionOrganizer: team.competition_organizer
      }
    });
  } catch (err) {
    console.error('[teamController.getTeamById]', err);
    res.status(500).json({ message: 'Gagal mengambil detail tim' });
  }
}

/**
 * Memperbarui informasi tim (Hanya oleh Owner tim)
 */
async function updateTeam(req, res) {
  const { id } = req.params;
  const userId = req.userId;
  const { name, description, max_members, contact, require_connection_to_apply } = req.body;

  try {
    // 1. Pastikan tim ada
    const teamCheck = await pool.query('SELECT created_by FROM teams WHERE id = $1', [id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }

    // 2. Verifikasi kepemilikan (hanya owner)
    const ownerCheck = await pool.query(
      `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'`,
      [id, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Anda bukan pemilik tim ini' });
    }

    // 3. Update tim
    const updateRes = await pool.query(
      `UPDATE teams 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           max_members = COALESCE($3, max_members),
           contact = COALESCE($4, contact),
           require_connection_to_apply = COALESCE($5, require_connection_to_apply)
       WHERE id = $6
       RETURNING *`,
      [
        name,
        description,
        max_members ? parseInt(max_members, 10) : null,
        contact,
        require_connection_to_apply,
        id
      ]
    );

    res.json({
      message: 'Detail tim berhasil diperbarui',
      data: updateRes.rows[0]
    });
  } catch (err) {
    console.error('[teamController.updateTeam]', err);
    res.status(500).json({ message: 'Gagal memperbarui detail tim' });
  }
}

