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

    // Ambil info universitas & prodi user login
    const myUserRes = await pool.query('SELECT name, university, prodi FROM users WHERE id = $1', [userId]);
    const myUni = myUserRes.rows.length > 0 ? myUserRes.rows[0].university : '';
    const myUserProdi = myUserRes.rows.length > 0 ? myUserRes.rows[0].prodi || '' : '';

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

    // Helper untuk mengelompokkan prodi/major ke dalam ranah sinergi
    const getMajorGroup = (prodi) => {
      if (!prodi) return 'Other';
      const p = prodi.toLowerCase();
      if (p.includes('informatika') || p.includes('software') || p.includes('komputer') || p.includes('sistem') || p.includes('teknologi') || p.includes('data') || p.includes('artificial') || p === 'ai' || p.includes(' ai ') || p.startsWith('ai ') || p.endsWith(' ai')) {
        return 'Tech';
      }
      if (p.includes('desain') || p.includes('dkv') || p.includes('visual') || p.includes('seni') || p.includes('ilustrasi') || p.includes('multimedia') || p.includes('ui/ux') || p.includes('user research')) {
        return 'Design';
      }
      if (p.includes('manajemen') || p.includes('bisnis') || p.includes('ekonomi') || p.includes('akuntansi') || p.includes('pemasaran') || p.includes('administrasi')) {
        return 'Business';
      }
      if (p.includes('biologi') || p.includes('kimia') || p.includes('fisika') || p.includes('matematika') || p.includes('sains') || p.includes('statistika') || p.includes('biokimia')) {
        return 'Science';
      }
      if (p.includes('sosiologi') || p.includes('komunikasi') || p.includes('hukum') || p.includes('sosial') || p.includes('sastra') || p.includes('hubungan')) {
        return 'Social';
      }
      return 'Other';
    };

    const myGroup = getMajorGroup(myUserProdi);
    const filterSkill = req.query.skill;

    // ── Bulk-load skills and connection statuses for ALL candidates up front.
    // Previously this did 2 queries per candidate inside the loop (an N+1 that
    // took ~28s for ~190 users); now it's 2 queries total.
    const candidateIds = result.rows.map(r => r.id);
    const skillsByUser = new Map();
    if (candidateIds.length > 0) {
      const allSkillsRes = await pool.query(
        `SELECT us.user_id, s.name
         FROM user_skills us JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id = ANY($1)`,
        [candidateIds]
      );
      for (const r of allSkillsRes.rows) {
        if (!skillsByUser.has(r.user_id)) skillsByUser.set(r.user_id, []);
        skillsByUser.get(r.user_id).push(r.name);
      }
    }

    const connByUser = new Map();
    const allConnRes = await pool.query(
      `SELECT sender_id, receiver_id, status
       FROM connections
       WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );
    for (const conn of allConnRes.rows) {
      const other = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
      if (!connByUser.has(other)) connByUser.set(other, conn);
    }

    for (const row of result.rows) {
      // 3. Skill kandidat ini (dari bulk map, tanpa query per-baris)
      const skills = skillsByUser.get(row.id) || [];

      // Cek filter chip
      if (filterSkill && filterSkill !== 'all') {
        const allowedSkills = skillCategoryMap[filterSkill] || [];
        const hasMatchingSkill = skills.some(s => allowedSkills.includes(s));
        if (!hasMatchingSkill) {
          continue; // Lewati kandidat yang tidak punya skill di kategori terfilter
        }
      }

      // 4. Hitung kecocokan (compat) secara cerdas (Multi-Dimensional AI Scoring)
      let score = 50; // Base score
      
      // A. Skill Gap Analysis: Cari skill kandidat yang tidak dimiliki oleh user login
      const complementarySkills = skills.filter(s => !mySkills.includes(s));
      if (complementarySkills.length === 1) {
        score += 10;
      } else if (complementarySkills.length >= 2) {
        score += 20;
      }

      // B. Cross-Functional Synergy (Prodi)
      const candGroup = getMajorGroup(row.prodi);
      let hasSynergy = false;
      let synergyText = '';
      let synergyPairName = '';
      
      if (myGroup !== 'Other' && candGroup !== 'Other' && myGroup !== candGroup) {
        score += 15;
        hasSynergy = true;
        
        // Pasangan sinergi lintas disiplin
        const pair = [myGroup, candGroup].sort().join(' + ');
        synergyPairName = pair;
        if (pair === 'Design + Tech') {
          synergyText = `Sinergi Teknis & Kreatif: Kolaborasi ideal antara keahlian UI/UX visual dengan pemrograman fungsional untuk membangun aplikasi siap saji.`;
        } else if (pair === 'Business + Tech') {
          synergyText = `Sinergi Bisnis & Teknologi: Gabungan kuat untuk hackathon/business plan guna melahirkan purwarupa produk dengan validasi bisnis matang.`;
        } else if (pair === 'Science + Tech' || pair === 'Science + Social') {
          synergyText = `Sinergi Riset & Analitik: Kolaborasi metodologis dan analisis data tingkat tinggi untuk keunggulan presentasi riset ilmiah/PKM.`;
        } else {
          synergyText = `Sinergi Lintas Fungsi: Perpaduan keahlian antardisiplin ilmu (${myGroup} & ${candGroup}) untuk memberikan sudut pandang solusi yang holistik.`;
        }
      } else if (myGroup === candGroup && myGroup !== 'Other') {
        score += 5; // Same domain solid connection
        synergyText = `Rekan Seprofesi: Kemitraan sesama ahli ${myGroup} yang kuat untuk berbagi beban kerja pengembangan teknis secara intensif.`;
      }

      // C. Shared interest / Category overlap bonus
      const categoryOverlap = skills.filter(s => mySkills.includes(s));
      if (categoryOverlap.length > 0) {
        score += 8;
      }

      // D. University proximity bonus
      if (myUni && row.uni && myUni.toLowerCase() === row.uni.toLowerCase()) {
        score += 5;
      }

      const compat = Math.min(99, Math.max(60, score));

      // E. Generate AI Insight Reasoning
      let reasoning = '';
      const fnameCand = row.name.split(' ')[0];
      
      if (complementarySkills.length > 0) {
        reasoning += `${fnameCand} dapat melengkapi tim Anda dengan membawa skill penting yang belum Anda miliki: ${complementarySkills.slice(0, 2).join(' & ')}. `;
      } else {
        reasoning += `Memiliki basis keahlian ${skills.slice(0, 2).join(' & ')} yang selaras dengan profil Anda. `;
      }
      
      if (synergyText) {
        reasoning += synergyText;
      } else {
        reasoning += `Kompetensi kandidat siap mendukung kelancaran proyek dan pencapaian target prestasi tim Anda.`;
      }

      const aiInsight = {
        synergyGroup: hasSynergy ? `Sinergi ${synergyPairName}` : (myGroup === candGroup && myGroup !== 'Other' ? `Kemitraan Spesialis ${myGroup}` : 'Aliansi Strategis'),
        reasoning,
        complementarySkills: complementarySkills.slice(0, 3)
      };

      // 5. Status koneksi (dari bulk map, tanpa query per-baris)
      let connectionStatus = 'none'; // default
      const conn = connByUser.get(row.id);
      if (conn) {
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
        connectionStatus,
        aiInsight
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
            INSERT INTO notifications (user_id, title, message, applicant_id) 
            VALUES ($1, $2, $3, $4)
          `, [
            receiverId,
            'Koneksi Diterima',
            `${senderName} menerima permintaan koneksi Anda! Sekarang Anda dapat berkolaborasi.`,
            userId
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
          INSERT INTO notifications (user_id, title, message, applicant_id) 
          VALUES ($1, $2, $3, $4)
        `, [
          receiverId,
          'Permintaan Koneksi Baru',
          `${senderName} ingin terhubung dengan Anda di Matchmaker! Cek dashboard untuk mulai berkolaborasi.`,
          userId
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
      INSERT INTO notifications (user_id, title, message, applicant_id) 
      VALUES ($1, $2, $3, $4)
    `, [
      receiverId,
      'Permintaan Koneksi Baru',
      `${senderName} ingin terhubung dengan Anda di Matchmaker! Cek dashboard untuk mulai berkolaborasi.`,
      userId
    ]);

    res.json({ message: `Permintaan koneksi berhasil dikirim ke ${receiverName}!` });
  } catch (err) {
    console.error('[matchmakingController.connectUser]', err);
    res.status(500).json({ message: 'Gagal mengirim permintaan koneksi' });
  }
};

/**
 * Merespons permintaan koneksi (Approve/Reject)
 */
const respondConnection = async (req, res) => {
  const userId = req.userId;
  const connectionId = parseInt(req.params.id, 10);
  const { status } = req.body; // 'accepted' atau 'rejected'

  try {
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    // Cek apakah koneksi ada dan ditujukan ke kita
    const connCheck = await pool.query(
      'SELECT * FROM connections WHERE id = $1 AND receiver_id = $2',
      [connectionId, userId]
    );

    if (connCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Permintaan koneksi tidak ditemukan atau bukan milik Anda' });
    }

    const conn = connCheck.rows[0];

    // Update status koneksi
    await pool.query(
      'UPDATE connections SET status = $1 WHERE id = $2',
      [status === 'accepted' ? 'accepted' : 'rejected', connectionId]
    );

    // Kirim notifikasi ke pengirim permohonan koneksi
    const responderRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const responderName = responderRes.rows[0].name;

    if (status === 'accepted') {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, applicant_id) VALUES ($1, $2, $3, $4)`,
        [
          conn.sender_id,
          'Koneksi Diterima',
          `${responderName} menerima permintaan koneksi Anda! Sekarang Anda dapat berkolaborasi.`,
          userId
        ]
      );
    }

    res.json({ message: status === 'accepted' ? 'Koneksi berhasil diterima!' : 'Koneksi ditolak.' });
  } catch (err) {
    console.error('[matchmakingController.respondConnection]', err);
    res.status(500).json({ message: 'Gagal merespons permintaan koneksi' });
  }
};

module.exports = {
  getMatchmaking,
  connectUser,
  respondConnection
};
