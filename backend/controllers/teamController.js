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

module.exports = {
  getMine,
  getCandidates
};
