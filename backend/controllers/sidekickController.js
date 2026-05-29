const pool = require('../config/db');

const chatWithSideKick = async (req, res) => {
  try {
    const userId = req.userId || 1;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Pesan wajib dikirim' });
    }

    const cleanMsg = message.toLowerCase().trim();
    
    // 1. Get current user info to personalize response
    const userRes = await pool.query('SELECT name, university, prodi FROM users WHERE id = $1', [userId]);
    const userName = userRes.rows.length > 0 ? userRes.rows[0].name.split(' ')[0] : 'Sobat';

    let reply = '';
    const responseData = {
      competitions: [],
      users: []
    };

    // ── INTENT 1: LOMBA / COMPETITIONS SEARCH ────────────────────────────────
    if (cleanMsg.includes('lomba') || cleanMsg.includes('kompetisi') || cleanMsg.includes('hackathon') || cleanMsg.includes('contest')) {
      // Extract categories
      let categorySlug = null;
      if (cleanMsg.includes('design') || cleanMsg.includes('desain') || cleanMsg.includes('ui') || cleanMsg.includes('ux') || cleanMsg.includes('ui-ux') || cleanMsg.includes('figma')) {
        categorySlug = 'ui-ux';
      } else if (cleanMsg.includes('data') || cleanMsg.includes('science') || cleanMsg.includes('sains') || cleanMsg.includes('ml') || cleanMsg.includes('python')) {
        categorySlug = 'data-science';
      } else if (cleanMsg.includes('web') || cleanMsg.includes('dev') || cleanMsg.includes('coding') || cleanMsg.includes('frontend') || cleanMsg.includes('backend') || cleanMsg.includes('hackathon')) {
        categorySlug = 'web-dev';
      }

      let query = `
        SELECT c.id, c.title, c.organizer, c.deadline, c.emoji, c.color_gradient, cat.name as category_name
        FROM competitions c
        JOIN categories cat ON c.category_id = cat.id
      `;
      let params = [];

      if (categorySlug) {
        query += ` WHERE cat.slug = $1 LIMIT 3`;
        params.push(categorySlug);
      } else {
        // Try simple name search
        query += ` WHERE c.title ILIKE $1 OR c.description ILIKE $1 LIMIT 3`;
        params.push('%' + cleanMsg.replace('lomba', '').replace('kompetisi', '').replace('cari', '').trim() + '%');
      }

      const compRes = await pool.query(query, params);
      
      if (compRes.rows.length > 0) {
        reply = `Halo ${userName}! Saya menemukan beberapa rekomendasi kompetisi yang seru untuk Anda ikuti. Silakan cek detailnya langsung melalui kartu di bawah ini:`;
        responseData.competitions = compRes.rows.map(row => ({
          id: row.id,
          title: row.title,
          organizer: row.organizer,
          deadline: row.deadline,
          emoji: row.emoji || '🏆',
          colorGradient: row.color_gradient || 'from-primary to-purple-600',
          categoryName: row.category_name
        }));
      } else {
        // Fallback to general list of 3 random competitions
        const fallbackRes = await pool.query(`
          SELECT c.id, c.title, c.organizer, c.deadline, c.emoji, c.color_gradient, cat.name as category_name
          FROM competitions c
          JOIN categories cat ON c.category_id = cat.id
          LIMIT 3
        `);
        reply = `Wah ${userName}, saya tidak menemukan kompetisi yang persis seperti itu. Namun, berikut adalah beberapa kompetisi populer yang mungkin menarik minat Anda:`;
        responseData.competitions = fallbackRes.rows.map(row => ({
          id: row.id,
          title: row.title,
          organizer: row.organizer,
          deadline: row.deadline,
          emoji: row.emoji || '🏆',
          colorGradient: row.color_gradient || 'from-primary to-purple-600',
          categoryName: row.category_name
        }));
      }
    }
    // ── INTENT 2: MAHASISWA / KANDIDAT / TEAMMATE SEARCH ──────────────────────
    else if (cleanMsg.includes('mahasiswa') || cleanMsg.includes('peserta') || cleanMsg.includes('kandidat') || cleanMsg.includes('teman') || cleanMsg.includes('rekan') || cleanMsg.includes('orang') || cleanMsg.includes('partner')) {
      // Find university keywords
      let searchUni = null;
      if (cleanMsg.includes('ipb')) searchUni = '%ipb%';
      else if (cleanMsg.includes('itb')) searchUni = '%itb%';
      else if (cleanMsg.includes('its')) searchUni = '%its%';
      else if (cleanMsg.includes('ugm')) searchUni = '%gadjah%';
      else if (cleanMsg.includes('ui'))  searchUni = '%indonesia%';
      else if (cleanMsg.includes('binus')) searchUni = '%binus%';

      // Find skill keywords
      let searchSkill = null;
      const skillsRes = await pool.query('SELECT name FROM skills');
      const allSkills = skillsRes.rows.map(s => s.name.toLowerCase());
      
      for (const skill of allSkills) {
        if (cleanMsg.includes(skill)) {
          searchSkill = skill;
          break;
        }
      }

      let query = `
        SELECT DISTINCT u.id, u.name, u.university as uni, u.prodi, u.avatar_color as "avatarColor"
        FROM users u
        LEFT JOIN user_skills us ON u.id = us.user_id
        LEFT JOIN skills s ON us.skill_id = s.id
        WHERE u.id != $1 AND u.role = 'peserta'
      `;
      let params = [userId];
      let paramIndex = 2;

      if (searchUni) {
        query += ` AND u.university ILIKE $${paramIndex}`;
        params.push(searchUni);
        paramIndex++;
      }

      if (searchSkill) {
        query += ` AND s.name ILIKE $${paramIndex}`;
        params.push('%' + searchSkill + '%');
        paramIndex++;
      }

      query += ` LIMIT 3`;

      const userQueryRes = await pool.query(query, params);

      if (userQueryRes.rows.length > 0) {
        reply = `Tentu ${userName}! Saya menemukan rekan bertalenta yang sesuai dengan kriteria Anda. Anda dapat terhubung langsung dengan mereka menggunakan tombol di bawah:`;
        
        // Fetch skills for each matched user
        for (const row of userQueryRes.rows) {
          const userSkillsRes = await pool.query(`
            SELECT s.name FROM skills s
            JOIN user_skills us ON s.id = us.skill_id
            WHERE us.user_id = $1
            LIMIT 3
          `, [row.id]);
          
          responseData.users.push({
            id: row.id,
            name: row.name,
            uni: row.uni,
            prodi: row.prodi,
            avatarColor: row.avatarColor || 'bg-primary',
            skills: userSkillsRes.rows.map(s => s.name)
          });
        }
      } else {
        // Fallback to 3 random candidates
        const fallbackUsersRes = await pool.query(`
          SELECT id, name, university as uni, prodi, avatar_color as "avatarColor"
          FROM users
          WHERE id != $1 AND role = 'peserta'
          LIMIT 3
        `, [userId]);
        
        reply = `Maaf ${userName}, saya belum menemukan rekan yang persis memenuhi kriteria tersebut di database. Namun, berikut adalah beberapa mahasiswa berprestasi yang aktif di platform kami:`;
        
        for (const row of fallbackUsersRes.rows) {
          const userSkillsRes = await pool.query(`
            SELECT s.name FROM skills s
            JOIN user_skills us ON s.id = us.skill_id
            WHERE us.user_id = $1
            LIMIT 3
          `, [row.id]);
          
          responseData.users.push({
            id: row.id,
            name: row.name,
            uni: row.uni,
            prodi: row.prodi,
            avatarColor: row.avatarColor || 'bg-primary',
            skills: userSkillsRes.rows.map(s => s.name)
          });
        }
      }
    }
    // ── INTENT 3: FAQ / PLATFORM PANDUAN ────────────────────────────
    else if (cleanMsg.includes('bagaimana') || cleanMsg.includes('cara') || cleanMsg.includes('panduan') || cleanMsg.includes('gratis') || cleanMsg.includes('fitur') || cleanMsg.includes('matchmaking')) {
      if (cleanMsg.includes('matchmaking') || cleanMsg.includes('kecocokan') || cleanMsg.includes('jodoh')) {
        reply = `Sistem **AI Matchmaking** di SideQuest menganalisis profil keahlian Anda, prodi, dan minat kompetisi, kemudian menghitung persentase kecocokan secara real-time. Kami menyajikan ulasan *AI Skill-Gap Analysis* untuk membantu Anda melihat bagaimana kandidat tersebut dapat melengkapi keahlian tim Anda yang masih kosong.`;
      } else if (cleanMsg.includes('gratis') || cleanMsg.includes('bayar')) {
        reply = `Tentu saja! Platform SideQuest dapat diakses secara **100% Gratis** baik untuk mahasiswa yang ingin mencari rekan tim, maupun untuk Event Organizer (EO) yang ingin mempublikasikan kompetisi serta mengelola pendaftaran peserta kelompok.`;
      } else if (cleanMsg.includes('tim') || cleanMsg.includes('anggota') || cleanMsg.includes('kuota')) {
        reply = `Untuk kompetisi kelompok, pendaftaran hanya boleh diajukan oleh **Pemilik Tim (Team Owner)**. Sistem SideQuest secara otomatis memverifikasi bahwa jumlah anggota tim Anda saat ini telah memenuhi kuota minimal dan tidak melebihi kuota maksimal yang disyaratkan oleh Penyelenggara Lomba.`;
      } else {
        reply = `Di platform SideQuest, Anda dapat mengeksplorasi ratusan info kompetisi nasional, menggunakan sistem **AI Matchmaking** untuk menemukan rekan tim yang pas, membentuk kelompok kompetisi, dan mendaftarkan tim Anda secara instan ke event-event lomba yang diselenggarakan oleh EO terverifikasi.`;
      }
    }
    // ── INTENT 4: SMALLTALK / INTRO FALLBACK ─────────────────────────────────
    else {
      reply = `Halo ${userName}! Saya adalah **SideKick**, asisten kecerdasan buatan personal Anda di SideQuest. ⚡\n\nSaya di sini untuk membantu Anda meraih prestasi terbaik. Anda bisa bertanya seperti ini kepada saya:\n\n💬 *"Cari lomba hackathon teknologi..."*\n💬 *"Rekomendasikan mahasiswa IPB yang menguasai Figma..."*\n💬 *"Bagaimana cara sistem AI Matchmaking bekerja?"*\n\nSilakan ketik apa yang Anda butuhkan, dan saya siap membantu!`;
    }

    res.json({
      message: reply,
      data: responseData
    });

  } catch (err) {
    console.error('[sidekickController.chatWithSideKick]', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { chatWithSideKick };
