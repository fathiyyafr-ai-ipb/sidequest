const pool = require('../config/db');

const getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.userId; // Support params or auth middleware
    
    // Ambil data user
    const userRes = await pool.query('SELECT id, name, email, university, prodi, avatar_color, bio, role, experience, achievements, only_allow_connection_invites FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).send("User not found");

    // Ambil skill user
    const skillRes = await pool.query(`
      SELECT s.name as label, s.tag_class as cls 
      FROM skills s 
      JOIN user_skills us ON s.id = us.skill_id 
      WHERE us.user_id = $1
    `, [userId]);

    const user = userRes.rows[0];

    // Hitung stats dinamis dari database
    const timAktifRes = await pool.query(
      `SELECT COUNT(*) FROM team_members WHERE user_id = $1 AND status = 'joined'`,
      [userId]
    );
    const timAktif = parseInt(timAktifRes.rows[0].count) || 0;

    const lombaIkutiRes = await pool.query(
      `SELECT COUNT(DISTINCT t.competition_id) 
       FROM team_members tm 
       JOIN teams t ON tm.team_id = t.id 
       WHERE tm.user_id = $1 AND tm.status = 'joined'`,
      [userId]
    );
    const lombaIkuti = parseInt(lombaIkutiRes.rows[0].count) || 0;

    const matchRate = timAktif > 0 ? "92%" : "-";

    // Ambil riwayat lomba dari tim yang diikuti user
    const teamsRes = await pool.query(`
      SELECT t.id, t.name as team_name, c.title as comp_title, c.organizer as comp_org, tm.role as team_role
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      WHERE tm.user_id = $1 AND tm.status = 'joined'
    `, [userId]);

    const riwayat = teamsRes.rows.map(r => ({
      emoji: "🏆",
      bg: "bg-primary-light",
      title: `${r.team_name} — ${r.comp_title}`,
      org: `${r.comp_org} · Peran: ${r.team_role === 'owner' ? 'Owner' : 'Member'}`,
      badge: r.team_role === 'owner' ? 'Owner' : 'Member',
      badgeCls: r.team_role === 'owner' ? 'text-accent bg-accent-light' : 'text-primary bg-primary-light'
    }));

    // Hitung undangan dinamis dari database
    const undanganRes = await pool.query(
      `SELECT COUNT(*) FROM team_members WHERE user_id = $1 AND status = 'invited'`,
      [userId]
    );
    const undangan = parseInt(undanganRes.rows[0].count) || 0;

    // Ambil tenggat daftar terdekat (deadlines) dari tim/kompetisi yang diikuti user
    const deadlinesRes = await pool.query(`
      SELECT c.id, c.title as name, c.deadline, c.emoji, c.color_gradient
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      WHERE tm.user_id = $1 AND tm.status = 'joined'
      ORDER BY c.deadline ASC
    `, [userId]);

    const deadlines = deadlinesRes.rows.map(c => {
      const d = new Date(c.deadline);
      const day = d.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      const month = monthNames[d.getMonth()] || "Mei";

      const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
      
      let left = `${daysLeft} hari`;
      let bgCls = "bg-primary-light";
      let numCls = "text-primary";
      let urgentCls = "text-primary";
      let dotCls = "bg-primary";

      if (daysLeft <= 0) {
        left = "Telah lewat";
        bgCls = "bg-red-50";
        numCls = "text-red-500";
        urgentCls = "text-red-500";
        dotCls = "bg-red-400";
      } else if (daysLeft <= 3) {
        bgCls = "bg-red-50";
        numCls = "text-red-500";
        urgentCls = "text-red-500";
        dotCls = "bg-red-400 pulse";
      } else if (daysLeft <= 10) {
        bgCls = "bg-accent-light";
        numCls = "text-accent";
        urgentCls = "text-accent";
        dotCls = "bg-accent";
      }

      return {
        id: c.id,
        name: c.name,
        day,
        month,
        left,
        bgCls,
        numCls,
        urgentCls,
        dotCls
      };
    });

    // Parse seeded experience dan gabungkan dengan riwayat tim aktif
    const parsedSeededExp = (user.experience || []).map(e => {
      let emoji = "🏆";
      let bg = "bg-primary-light";
      let badge = "Peserta";
      let badgeCls = "text-primary bg-primary-light";
      let title = e;
      let org = "Kompetisi Mahasiswa";

      if (e.includes(' — ')) {
        const parts = e.split(' — ');
        title = parts[0];
        badge = parts[1];
      }
      
      if (badge.includes('Juara') || badge.includes('Top')) {
        emoji = "🏆";
        badgeCls = "text-accent bg-accent-light";
      }

      return { emoji, bg, title, org, badge, badgeCls };
    });

    const mergedRiwayat = [...riwayat, ...parsedSeededExp];

    // Parse seeded achievements ke prestasi [{ title, sub }]
    const prestasi = (user.achievements || []).map(p => {
      if (p.includes(' — ')) {
        const parts = p.split(' — ');
        return { title: parts[0], sub: parts[1] };
      }
      return { title: p, sub: '' };
    });

    let connectionStatus = 'none';
    let connectionId = null;
    const loggedInId = req.userId; // user who made this API request
    if (loggedInId && req.params.id && parseInt(req.params.id, 10) !== loggedInId) {
      const connRes = await pool.query(`
        SELECT id, status, sender_id 
        FROM connections 
        WHERE (sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1)
      `, [loggedInId, req.params.id]);

      if (connRes.rows.length > 0) {
        const conn = connRes.rows[0];
        connectionId = conn.id;
        if (conn.status === 'accepted') {
          connectionStatus = 'connected';
        } else if (conn.status === 'pending') {
          connectionStatus = parseInt(conn.sender_id, 10) === loggedInId ? 'sent' : 'received';
        } else if (conn.status === 'rejected') {
          connectionStatus = 'rejected';
        }
      }
    }

    const userData = {
      id: user.id,
      name: user.name,
      fullName: user.name, // compatibility
      email: user.email,
      prodi: user.prodi,
      studyProgram: user.prodi, // compatibility
      uni: user.university,
      university: user.university, // compatibility
      bio: user.bio,
      initials: user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U',
      role: user.role,
      skills: skillRes.rows,
      stats: { lombaIkuti, timAktif, undangan, matchRate },
      riwayat: mergedRiwayat,
      prestasi,
      deadlines,
      connectionStatus,
      connectionId,
      onlyAllowConnectionInvites: user.only_allow_connection_invites
    };
    res.json({ data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId || 1; 
    const { name, fullName, university, studyProgram, prodi, bio, onlyAllowConnectionInvites } = req.body;

    const finalName = name || fullName;
    const finalProdi = prodi || studyProgram;

    const updateQuery = `
      UPDATE users 
      SET name = COALESCE($1, name),
          university = COALESCE($2, university),
          prodi = COALESCE($3, prodi),
          bio = COALESCE($4, bio),
          only_allow_connection_invites = COALESCE($5, only_allow_connection_invites)
      WHERE id = $6 RETURNING id, name, email, university, prodi, bio, only_allow_connection_invites
    `;

    const result = await pool.query(updateQuery, [
      finalName !== undefined ? finalName : null,
      university !== undefined ? university : null,
      finalProdi !== undefined ? finalProdi : null,
      bio !== undefined ? bio : null,
      onlyAllowConnectionInvites !== undefined ? onlyAllowConnectionInvites : null,
      userId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = result.rows[0];

    // Hitung stats dinamis dari database
    const timAktifRes = await pool.query(
      `SELECT COUNT(*) FROM team_members WHERE user_id = $1 AND status = 'joined'`,
      [userId]
    );
    const timAktif = parseInt(timAktifRes.rows[0].count) || 0;

    const lombaIkutiRes = await pool.query(
      `SELECT COUNT(DISTINCT t.competition_id) 
       FROM team_members tm 
       JOIN teams t ON tm.team_id = t.id 
       WHERE tm.user_id = $1 AND tm.status = 'joined'`,
      [userId]
    );
    const lombaIkuti = parseInt(lombaIkutiRes.rows[0].count) || 0;

    const matchRate = timAktif > 0 ? "92%" : "-";

    const userData = {
      id: updatedUser.id,
      name: updatedUser.name,
      fullName: updatedUser.name,
      email: updatedUser.email,
      prodi: updatedUser.prodi,
      studyProgram: updatedUser.prodi,
      uni: updatedUser.university,
      university: updatedUser.university,
      bio: updatedUser.bio,
      initials: updatedUser.name ? updatedUser.name.split(' ').map(n => n[0]).join('') : 'U',
      skills: [],
      stats: { lombaIkuti, timAktif, undangan: 0, matchRate },
      onlyAllowConnectionInvites: updatedUser.only_allow_connection_invites
    };

    res.json({ message: "Profile updated successfully", data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = { getProfile, updateProfile };
