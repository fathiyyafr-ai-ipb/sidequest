const pool = require('../config/db');

/**
 * Mengambil daftar rekomendasi kandidat matchmaking (peserta lain)
 * Menerima query parameter: skill (filter chip)
 */
const getMatchmaking = async (req, res) => {
  try {
    const userId = req.userId || 1; // default to 1 if no auth header for safety

    // 1. Ambil skill user yang sedang login untuk kalkulasi kecocokan
    const mySkillsRes = await pool.query(
      `SELECT s.name FROM skills s 
       JOIN user_skills us ON s.id = us.skill_id 
       WHERE us.user_id = $1`,
      [userId]
    );
    const mySkills = mySkillsRes.rows.map(s => s.name);

    // Ambil info universitas user login
    const myUserRes = await pool.query('SELECT university FROM users WHERE id = $1', [userId]);
    const myUni = myUserRes.rows.length > 0 ? myUserRes.rows[0].university : '';

    // 2. Ambil seluruh user lain dengan role 'peserta'
    const result = await pool.query(`
      SELECT id, name, email, university as uni, prodi, avatar_color as "avatarColor", bio, experience, achievements, online 
      FROM users 
      WHERE id != $1 AND role = 'peserta'
      ORDER BY id ASC
    `, [userId]);

    const formattedMatches = [];

    // Definisi kategori skill sesuai filter chip di frontend
    const skillCategoryMap = {
      'frontend': ['Frontend Dev', 'React', 'React.js', 'Vue.js', 'TypeScript', 'CSS', 'Flutter', 'React Native'],
      'backend': ['Backend', 'Node.js', 'Database', 'DevOps', 'Laravel', 'PHP', 'MySQL', 'Go', 'Microservices'],
      'ui-ux': ['UI/UX', 'Figma', 'User Research', 'Ilustrasi', 'Branding'],
      'data-science': ['Machine Learning', 'Python', 'Data Science', 'R Language', 'Data Visualization', 'Statistics'],
      'business': ['Business Dev', 'Pitching', 'Market Research', 'Financial Modeling', 'Excel', 'Pitch Deck'],
      'sosial': ['Community Building', 'Advokasi', 'NGO Management', 'Social Media', 'Sosial Impact Design', 'Facilitation', 'Komunitas', 'Fieldwork', 'Advokasi Kebijakan'],
      'public-speaking': ['Public Speaking', 'MC', 'Storytelling', 'Presentasi', 'Debat', 'Copywriting', 'Presentasi Bisnis', 'Video Pitch', 'Persuasion'],
      'sains-riset': ['Lab Research', 'Biologi Molekuler', 'Academic Writing', 'SPSS', 'Kimia Analitik', 'Lab Work', 'Data Sains Eksperimen', 'Scientific Writing', 'Fisika Komputasi', 'Simulasi Numerik']
    };

    const filterSkill = req.query.skill;

    for (const row of result.rows) {
      // 3. Ambil skill untuk kandidat ini
      const skillsRes = await pool.query(`
        SELECT s.name 
        FROM skills s 
        JOIN user_skills us ON s.id = us.skill_id 
        WHERE us.user_id = $1
      `, [row.id]);
      
      const skills = skillsRes.rows.map(s => s.name);

      // Cek filter chip
      if (filterSkill && filterSkill !== 'all') {
        const allowedSkills = skillCategoryMap[filterSkill] || [];
        const hasMatchingSkill = skills.some(s => allowedSkills.includes(s));
        if (!hasMatchingSkill) {
          continue; // Lewati kandidat yang tidak punya skill di kategori terfilter
        }
      }

      // 4. Hitung kecocokan (compat) secara dinamis & stabil
      let compat = 70 + ((row.id * 7) % 20); // base deterministik (70 - 90%)
      
      // Bonus jika satu universitas
      if (myUni && row.uni && myUni.toLowerCase() === row.uni.toLowerCase()) {
        compat += 5;
      }
      
      // Bonus jika memiliki skill yang saling melengkapi (overlap atau irisan)
      const sharedSkills = skills.filter(s => mySkills.includes(s));
      if (sharedSkills.length > 0) {
        compat += 3;
      }

      compat = Math.min(95, Math.max(60, compat)); // batas: 60% - 95%

      // 5. Cek status koneksi antara user login dengan kandidat
      const connRes = await pool.query(`
        SELECT status, sender_id 
        FROM connections 
        WHERE (sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1)
      `, [userId, row.id]);

      let connectionStatus = 'none'; // default
      if (connRes.rows.length > 0) {
        const conn = connRes.rows[0];
        if (conn.status === 'accepted') {
          connectionStatus = 'connected';
        } else if (conn.status === 'pending') {
          connectionStatus = conn.sender_id === userId ? 'sent' : 'received';
        } else if (conn.status === 'rejected') {
          connectionStatus = 'rejected';
        }
      }

      // Parse exp & prestasi dari JSONB
      const exp = row.experience || ['Siap berkolaborasi!'];
      const prestasi = (row.achievements || []).map(p => {
        if (p.includes(' — ')) return p.split(' — ')[0];
        return p;
      });

      formattedMatches.push({
        id: row.id,
        name: row.name,
        uni: row.uni,
        prodi: row.prodi,
        avatarColor: row.avatarColor || 'bg-primary',
        online: row.online,
        compat,
        skills,
        exp,
        prestasi,
        connectionStatus
      });
    }

    res.json({ data: formattedMatches });
  } catch (err) {
    console.error('[matchmakingController.getMatchmaking]', err);
    res.status(500).json({ message: 'Gagal mengambil data matchmaking' });
  }
};

/**
 * Mengirim permintaan koneksi (Connect) ke kandidat lain
 */
const connectUser = async (req, res) => {
  const userId = req.userId;
  const { receiverId } = req.body;

  try {
    if (!receiverId) {
      return res.status(400).json({ message: 'ReceiverId wajib diset' });
    }

    // 1. Cek apakah user mencoba connect ke diri sendiri
    if (parseInt(receiverId, 10) === userId) {
      return res.status(400).json({ message: 'Anda tidak dapat mengirim koneksi ke diri sendiri' });
    }

    // 2. Cek apakah penerima ada
    const receiverCheck = await pool.query('SELECT name FROM users WHERE id = $1', [receiverId]);
    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Kandidat tidak ditemukan' });
    }

    const receiverName = receiverCheck.rows[0].name;

    // 3. Periksa apakah sudah ada relasi koneksi antara kedua user ini
    const existingRes = await pool.query(`
      SELECT id, sender_id, receiver_id, status 
      FROM connections 
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
    `, [userId, receiverId]);

    const senderRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const senderName = senderRes.rows[0].name;

    if (existingRes.rows.length > 0) {
      const conn = existingRes.rows[0];

      if (conn.status === 'accepted') {
        return res.json({ message: `Anda sudah terhubung dengan ${receiverName}!` });
      }

      if (conn.status === 'pending') {
        // Jika permintaan dikirim oleh orang lain (kandidat), dan kita mengklik Connect/Accept
        if (parseInt(conn.sender_id, 10) === parseInt(receiverId, 10)) {
          // Terima permohonan koneksi secara otomatis
          await pool.query(`
            UPDATE connections 
            SET status = 'accepted' 
            WHERE id = $1
          `, [conn.id]);

          // Kirim notifikasi sukses ke pengirim awal
          await pool.query(`
            INSERT INTO notifications (user_id, title, message) 
            VALUES ($1, $2, $3)
          `, [
            receiverId,
            'Koneksi Diterima',
            `${senderName} menerima permintaan koneksi Anda! Sekarang Anda dapat berkolaborasi.`
          ]);

          return res.json({ message: `Anda sekarang terhubung dengan ${receiverName}!` });
        } else {
          // Permintaan dikirim oleh kita sendiri dan masih pending
          return res.json({ message: `Permintaan koneksi Anda ke ${receiverName} sedang tertunda.` });
        }
      }

      if (conn.status === 'rejected') {
        // Jika ditolak sebelumnya, reset status menjadi pending dengan pengirim kita
        await pool.query(`
          UPDATE connections 
          SET sender_id = $1, receiver_id = $2, status = 'pending', created_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [userId, receiverId, conn.id]);

        // Kirim notifikasi ke penerima
        await pool.query(`
          INSERT INTO notifications (user_id, title, message) 
          VALUES ($1, $2, $3)
        `, [
          receiverId,
          'Permintaan Koneksi Baru',
          `${senderName} ingin terhubung dengan Anda di Matchmaker! Cek dashboard untuk mulai berkolaborasi.`
        ]);

        return res.json({ message: `Permintaan koneksi berhasil dikirim ke ${receiverName}!` });
      }
    }

    // 4. Masukkan koneksi baru jika belum ada relasi sama sekali
    await pool.query(`
      INSERT INTO connections (sender_id, receiver_id, status) 
      VALUES ($1, $2, 'pending')
    `, [userId, receiverId]);

    // Kirim notifikasi ke penerima
    await pool.query(`
      INSERT INTO notifications (user_id, title, message) 
      VALUES ($1, $2, $3)
    `, [
      receiverId,
      'Permintaan Koneksi Baru',
      `${senderName} ingin terhubung dengan Anda di Matchmaker! Cek dashboard untuk mulai berkolaborasi.`
    ]);

    res.json({ message: `Permintaan koneksi berhasil dikirim ke ${receiverName}!` });
  } catch (err) {
    console.error('[matchmakingController.connectUser]', err);
    res.status(500).json({ message: 'Gagal mengirim permintaan koneksi' });
  }
};

module.exports = {
  getMatchmaking,
  connectUser
};
