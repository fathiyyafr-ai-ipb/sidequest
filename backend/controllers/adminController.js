const pool = require('../config/db');

// 1. Get complete dashboard summary stats for Moderator/Admin
const getModeratorStats = async (req, res) => {
  try {
    // Total Users (active and inactive)
    const usersCount = await pool.query('SELECT COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM users');
    // Total Competitions
    const compsCount = await pool.query('SELECT COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM competitions');
    // Total Teams
    const teamsCount = await pool.query('SELECT COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM teams');
    
    // Platform configurations
    const settingsRes = await pool.query('SELECT * FROM platform_settings');
    const settings = {};
    settingsRes.rows.forEach(r => {
      settings[r.key] = r.value;
    });

    // ── GWA METRICS CALCULATIONS ──

    // 1. Growth (G) Metrics
    const dauRes = await pool.query('SELECT COUNT(*) as online FROM users WHERE online = true');
    const dauCount = parseInt(dauRes.rows[0].online, 10);
    const activeUsersCount = parseInt(usersCount.rows[0].active, 10);

    const completedTeamsRes = await pool.query(`
      SELECT COUNT(*) as count FROM teams t
      WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND status = 'joined') >= t.max_members
    `);
    const completedTeams = parseInt(completedTeamsRes.rows[0].count, 10);
    const totalTeams = parseInt(teamsCount.rows[0].count, 10);
    const teamCompletionRate = totalTeams > 0 ? Math.round((completedTeams / totalTeams) * 100) : 75;

    const activeCompsRes = await pool.query(`
      SELECT COUNT(*) as count FROM competitions
      WHERE is_active = true AND (deadline >= CURRENT_DATE OR deadline IS NULL)
    `);
    const activeCompetitions = parseInt(activeCompsRes.rows[0].count, 10);

    // 2. Watch (W) Metrics
    // Calculate Average Matchmaking Score based on cross-functional AI proximity logic
    const pesertasRes = await pool.query("SELECT id, name, university, prodi FROM users WHERE role = 'peserta' AND is_active = true");
    const userSkillsRes = await pool.query(`
      SELECT us.user_id, s.name 
      FROM skills s 
      JOIN user_skills us ON s.id = us.skill_id
    `);

    const userSkillsMap = {};
    userSkillsRes.rows.forEach(r => {
      if (!userSkillsMap[r.user_id]) userSkillsMap[r.user_id] = [];
      userSkillsMap[r.user_id].push(r.name);
    });

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

    let totalMatchScore = 0;
    let pairingsCount = 0;
    const pesertas = pesertasRes.rows;

    for (let i = 0; i < pesertas.length; i++) {
      const userA = pesertas[i];
      const skillsA = userSkillsMap[userA.id] || [];
      const groupA = getMajorGroup(userA.prodi);

      for (let j = i + 1; j < pesertas.length; j++) {
        const userB = pesertas[j];
        const skillsB = userSkillsMap[userB.id] || [];
        const groupB = getMajorGroup(userB.prodi);

        let score = 50;

        // Complementary skills
        const complementaryB = skillsB.filter(s => !skillsA.includes(s));
        if (complementaryB.length === 1) score += 10;
        else if (complementaryB.length >= 2) score += 20;

        const complementaryA = skillsA.filter(s => !skillsB.includes(s));
        if (complementaryA.length === 1) score += 10;
        else if (complementaryA.length >= 2) score += 20;

        // Cross-functional synergy
        if (groupA !== 'Other' && groupB !== 'Other' && groupA !== groupB) {
          score += 15;
        } else if (groupA === groupB && groupA !== 'Other') {
          score += 5;
        }

        // Shared interest skill overlaps
        const overlap = skillsB.filter(s => skillsA.includes(s));
        if (overlap.length > 0) score += 8;

        // University proximity
        if (userA.university && userB.university && userA.university.toLowerCase() === userB.university.toLowerCase()) {
          score += 5;
        }

        const compat = Math.min(99, Math.max(60, score));
        totalMatchScore += compat;
        pairingsCount++;
      }
    }

    const avgMatchmakingScore = pairingsCount > 0 ? Math.round(totalMatchScore / pairingsCount) : 84;

    const totalRegsRes = await pool.query('SELECT COUNT(*) as count FROM competition_registrations');
    const approvedRegsRes = await pool.query("SELECT COUNT(*) as count FROM competition_registrations WHERE status = 'approved'");
    const totalRegs = parseInt(totalRegsRes.rows[0].count, 10);
    const approvedRegs = parseInt(approvedRegsRes.rows[0].count, 10);
    const atsConversionRate = totalRegs > 0 ? Math.round((approvedRegs / totalRegs) * 100) : 78;

    const pendingConnRes = await pool.query("SELECT COUNT(*) as count FROM connections WHERE status = 'pending'");
    const pendingConnections = parseInt(pendingConnRes.rows[0].count, 10);

    // 3. Aware (A) Metrics (Operational heartbeat simulations with dynamic values)
    const baseLatency = 120;
    const randomVariation = Math.floor(Math.random() * 11) - 5; // -5ms to +5ms
    const apiLatency = `${baseLatency + randomVariation}ms`;

    const activeDbConns = 6 + Math.floor(Math.random() * 3); // 6 to 8 active conns
    const dbConnections = `${activeDbConns}/20`;

    const verificationSpeed = '14m';

    const chatbotLoadThreads = 2 + Math.floor(Math.random() * 4); // 2 to 5 concurrent active threads
    const chatbotLoad = `${chatbotLoadThreads} thread aktif`;

    res.json({
      data: {
        users: {
          total: parseInt(usersCount.rows[0].count, 10),
          active: activeUsersCount,
        },
        competitions: {
          total: parseInt(compsCount.rows[0].count, 10),
          active: parseInt(compsCount.rows[0].active, 10),
        },
        teams: {
          total: totalTeams,
          active: parseInt(teamsCount.rows[0].active, 10),
        },
        settings,
        gwa: {
          growth: {
            mau: activeUsersCount,
            dau: dauCount > 0 ? dauCount : 3, // fallback to min 3 online seeds
            teamCompletionRate,
            activeCompetitions
          },
          watch: {
            avgMatchmakingScore,
            atsConversionRate,
            pendingConnections
          },
          aware: {
            apiLatency,
            dbConnections,
            verificationSpeed,
            chatbotLoad
          }
        }
      }
    });
  } catch (err) {
    console.error('[getModeratorStats]', err);
    res.status(500).json({ message: 'Gagal mengambil data statistik dasbor admin.' });
  }
};

// 2. Get full rosters for Users, Competitions, and Teams
const getModeratorData = async (req, res) => {
  try {
    // Fetch users (excluding sensitive password details)
    const usersRes = await pool.query('SELECT id, name, email, university, prodi, role, is_active, is_approved, is_verified FROM users ORDER BY role ASC, id DESC');
    
    // Fetch competitions with category name
    const compsRes = await pool.query(`
      SELECT c.*, cat.name as category_name, cat.slug as category_slug
      FROM competitions c
      JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.id DESC
    `);

    // Fetch teams with creator and competition details
    const teamsRes = await pool.query(`
      SELECT t.id, t.name, t.created_at, t.max_members, t.is_active, 
             u.name as creator_name, c.title as competition_title,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND status = 'joined') as joined_members
      FROM teams t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN competitions c ON t.competition_id = c.id
      ORDER BY t.id DESC
    `);

    res.json({
      data: {
        users: usersRes.rows,
        competitions: compsRes.rows,
        teams: teamsRes.rows
      }
    });
  } catch (err) {
    console.error('[getModeratorData]', err);
    res.status(500).json({ message: 'Gagal mengambil list data moderasi.' });
  }
};

// 3. Toggle Activation Status (Users, Competitions, Teams)
const toggleActiveStatus = async (req, res) => {
  const { type, id } = req.params;
  
  if (!['users', 'competitions', 'teams'].includes(type)) {
    return res.status(400).json({ message: 'Tipe moderasi tidak valid.' });
  }

  try {
    // A. Query current status
    const selectQuery = `SELECT is_active, name FROM ${type} WHERE id = $1`;
    const checkRes = await pool.query(selectQuery, [id]);
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: `${type.slice(0, -1)} tidak ditemukan.` });
    }

    const currentStatus = checkRes.rows[0].is_active;
    const newStatus = !currentStatus;
    const itemName = checkRes.rows[0].name || checkRes.rows[0].title || 'Item';

    // Prevent Superadmin from accidentally deactivating themselves
    if (type === 'users' && parseInt(id, 10) === req.userId) {
      return res.status(400).json({ message: 'Anda tidak dapat menonaktifkan akun sendiri!' });
    }

    // Prevent Moderator (non-superadmin) from deactivating other moderators or superadmins
    if (type === 'users') {
      const userRoleCheck = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (userRoleCheck.rows.length > 0) {
        const targetRole = userRoleCheck.rows[0].role;
        if ((targetRole === 'moderator' || targetRole === 'superadmin') && req.user.role !== 'superadmin') {
          return res.status(403).json({ message: 'Akses Ditolak: Hanya Superadmin yang dapat mengubah status keaktifan akun staff (Moderator/Superadmin).' });
        }
      }
    }

    // B. Update status in database
    const updateQuery = `UPDATE ${type} SET is_active = $1 WHERE id = $2`;
    await pool.query(updateQuery, [newStatus, id]);

    res.json({
      message: `Berhasil ${newStatus ? 'mengaktifkan kembali' : 'menonaktifkan'} "${itemName}".`,
      data: {
        id,
        is_active: newStatus
      }
    });
  } catch (err) {
    console.error('[toggleActiveStatus]', err);
    res.status(500).json({ message: 'Gagal merubah status keaktifan item.' });
  }
};

// 4. Mock AI Scraping Simulation
const simulateWebScraping = async (req, res) => {
  const { url } = req.body;
  const count = parseInt(req.body.count, 10) || 1;
  
  if (!url) {
    return res.status(400).json({ message: 'URL sumber wajib disertakan.' });
  }

  try {
    // Artificial simulation delay of 1.5 seconds for scraping & AI parsing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const urlLower = url.toLowerCase();
    const scrapedItems = [];
    
    for (let i = 0; i < count; i++) {
      let title = '';
      let organizer = '';
      let categorySlug = '';
      let description = '';
      let prize = '';
      let minMembers = 1;
      let maxMembers = 5;
      let registrationModel = 'hosted';
      let isFree = true;
      let daysOffset = 20 + (i * 5);
      
      if (urlLower.includes('instagram') || urlLower.includes('tiktok') || urlLower.includes('dribbble') || urlLower.includes('behance')) {
        // Design themed templates
        const titles = [
          'Instagram Creative UI/UX Poster Design Contest 2026',
          'National Mobile App Design Awards 2026',
          'Behance Digital Illustration Challenge 2026',
          'Tokopedia × DSC UI/UX Challenge 2026',
          'Creative Brand Identity Hackathon 2026'
        ];
        const organizers = ['Instagram Creators ID', 'Mobile UI Association', 'Behance Indonesia', 'Tokopedia', 'Creative Hub Jakarta'];
        
        title = titles[i % titles.length];
        organizer = organizers[i % organizers.length];
        categorySlug = 'desain';
        description = `Tantangan desain kreatif untuk meningkatkan engagement pengguna dan memberikan sentuhan visual premium. Tema utama ke-${i+1}: 'Digital Synergy and Collaboration'. Terbuka bagi mahasiswa di seluruh Indonesia.`;
        prize = `Juara ${i+1}: Rp ${15 - i * 3} Juta + Sertifikat Internasional`;
        minMembers = 1;
        maxMembers = 3;
        isFree = i % 2 === 0;
      } else if (urlLower.includes('github') || urlLower.includes('devpost') || urlLower.includes('hackathon') || urlLower.includes('hack')) {
        // Tech themed templates
        const titles = [
          'Global Tech Innovation Hackathon 2026',
          'Open Source Software Web Dev Contest 2026',
          'Artificial Intelligence & Cloud Hack 2026',
          'Devpost Cybersecurity Hackathon 2026',
          'IoT Smart Agriculture Innovation 2026'
        ];
        const organizers = ['GitHub Developer Union', 'Fasilkom UI Labs', 'AWS Student Club', 'Cyber Security ID', 'BRIN Indonesia Tech'];
        
        title = titles[i % titles.length];
        organizer = organizers[i % organizers.length];
        categorySlug = 'teknologi';
        description = `Tantangan pemrograman berdurasi intensif untuk memecahkan masalah kompleks berskala nasional menggunakan kecerdasan buatan, web modern, dan cloud. Batch ke-${i+1}.`;
        prize = `Juara ${i+1}: Rp ${50 - i * 10} Juta + Mentoring Karir`;
        minMembers = 3;
        maxMembers = 5;
        isFree = true;
      } else {
        // Science & Business themed templates
        const titles = [
          'National Mathematics & Data Olympiad 2026',
          'Young Business Plan Strategy Summit 2026',
          'National Scientific Writing Challenge 2026',
          'Asean Sociopreneur Innovation Pitch 2026',
          'Climate Change Research Symposium 2026'
        ];
        const organizers = ['Ikatan Ilmuwan Data Indonesia', 'HIPMI Youth Association', 'ITS Surabaya Press', 'UNDP Asia Pacific', 'Kementerian LHK RI'];
        const slugs = ['sains', 'bisnis', 'sains', 'sosial', 'sosial'];
        
        title = titles[i % titles.length];
        organizer = organizers[i % organizers.length];
        categorySlug = slugs[i % slugs.length];
        description = `Ajang bergengsi tingkat nasional/regional untuk menguji kemahiran taktis, pemecahan kasus nyata, dan riset ilmiah mendalam di bidang masing-masing. Edisi tahun 2026.`;
        prize = `Juara ${i+1}: Rp ${20 - i * 4} Juta + Piala Kehormatan`;
        minMembers = 2;
        maxMembers = 4;
        isFree = i % 3 !== 0;
      }

      // Generate deadline date dynamically
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + daysOffset);
      const deadlineStr = deadlineDate.toISOString().split('T')[0];

      // Check if duplicate title exists in database
      const dupCheck = await pool.query('SELECT id FROM competitions WHERE LOWER(title) = LOWER($1)', [title]);
      const isDuplicate = dupCheck.rows.length > 0;

      scrapedItems.push({
        title,
        organizer,
        categorySlug,
        description,
        prize,
        minMembers,
        maxMembers,
        registrationModel,
        isFree,
        deadline: deadlineStr,
        sourceUrl: url,
        isDuplicate
      });
    }

    res.json({
      message: `Scraping & Analisis AI Berhasil! Menemukan ${count} kompetisi potensial.`,
      data: scrapedItems
    });

  } catch (err) {
    console.error('[simulateWebScraping]', err);
    res.status(500).json({ message: 'Gagal melakukan scraping otomatis.' });
  }
};

// 5. Toggle Moderator active status (Superadmin only)
const toggleModeratorStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const checkRes = await pool.query("SELECT is_active, name, role FROM users WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Moderator tidak ditemukan.' });
    }

    const mod = checkRes.rows[0];
    if (mod.role !== 'moderator') {
      return res.status(400).json({ message: 'Akses Ditolak: User ini bukan merupakan Moderator.' });
    }

    const newStatus = !mod.is_active;
    await pool.query("UPDATE users SET is_active = $1 WHERE id = $2", [newStatus, id]);

    res.json({
      message: `Berhasil ${newStatus ? 'mengaktifkan kembali' : 'menonaktifkan'} moderator "${mod.name}".`,
      data: {
        id,
        is_active: newStatus
      }
    });
  } catch (err) {
    console.error('[toggleModeratorStatus]', err);
    res.status(500).json({ message: 'Gagal merubah status moderator.' });
  }
};

// 6. Update platform specific feature active status (Superadmin only)
const updateFeatureSettings = async (req, res) => {
  const { featureKey, activeValue } = req.body; // activeValue is 'active' or 'inactive'
  
  if (!['feature_competitions', 'feature_teams', 'feature_matchmaking'].includes(featureKey)) {
    return res.status(400).json({ message: 'Kunci fitur tidak valid.' });
  }
  if (!['active', 'inactive'].includes(activeValue)) {
    return res.status(400).json({ message: 'Nilai toggle fitur tidak valid (harus "active" atau "inactive").' });
  }

  try {
    await pool.query(
      "INSERT INTO platform_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      [featureKey, activeValue]
    );

    res.json({
      message: `Fitur ${featureKey.replace('feature_', '').toUpperCase()} berhasil diubah menjadi: ${activeValue.toUpperCase()}.`,
      data: {
        key: featureKey,
        value: activeValue
      }
    });
  } catch (err) {
    console.error('[updateFeatureSettings]', err);
    res.status(500).json({ message: 'Gagal memperbarui konfigurasi fitur platform.' });
  }
};

// 7. Update platform-wide maintenance mode setting (Superadmin only)
const updateMaintenanceSettings = async (req, res) => {
  const { enabled } = req.body; // enabled is boolean true or false

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'Nilai maintenance mode tidak valid (harus boolean).' });
  }

  try {
    const valStr = enabled ? 'true' : 'false';
    await pool.query(
      "INSERT INTO platform_settings (key, value) VALUES ('maintenance_mode', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [valStr]
    );

    res.json({
      message: `Mode Pemeliharaan platform berhasil ${enabled ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`,
      data: {
        maintenance_mode: enabled
      }
    });
  } catch (err) {
    console.error('[updateMaintenanceSettings]', err);
    res.status(500).json({ message: 'Gagal memperbarui status pemeliharaan platform.' });
  }
};

// 8. Approve pending organizer registration (Moderator/Admin)
const approveOrganizer = async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await pool.query("SELECT role, email, is_approved, verification_token FROM users WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    const user = checkRes.rows[0];
    if (user.role !== 'organizer') {
      return res.status(400).json({ message: 'Akses Ditolak: Hanya akun dengan peran Penyelenggara Lomba yang memerlukan persetujuan manual.' });
    }

    if (user.is_approved) {
      return res.status(400).json({ message: 'Akun penyelenggara ini sudah disetujui sebelumnya.' });
    }

    // Generate token if not exists
    const crypto = require('crypto');
    const verificationToken = user.verification_token || crypto.randomBytes(32).toString('hex');

    await pool.query(
      "UPDATE users SET is_approved = true, verification_token = $1 WHERE id = $2",
      [verificationToken, id]
    );

    // Simulate email log
    console.log(`\n======================================================`);
    console.log(`📧 [ADMIN APPROVED ORGANIZER - SIMULATION EMAIL SENT TO: ${user.email}]`);
    console.log(`Tautan Verifikasi Akun Anda: http://localhost:3001/api/auth/verify?token=${verificationToken}`);
    console.log(`======================================================\n`);

    res.json({
      message: `Akun penyelenggara "${user.email}" berhasil disetujui. Email instruksi verifikasi telah dikirimkan!`,
      data: {
        id,
        is_approved: true,
        verificationToken
      }
    });
  } catch (err) {
    console.error('[approveOrganizer]', err);
    res.status(500).json({ message: 'Gagal menyetujui akun penyelenggara.' });
  }
};

// Invite a new Sponsor partner (Moderator/Superadmin)
const inviteSponsor = async (req, res) => {
  const { name, email, password, company_name } = req.body;

  if (!name || !email || !password || !company_name) {
    return res.status(400).json({ message: 'Semua bidang pendaftaran sponsor wajib diisi dengan lengkap.' });
  }

  try {
    // Check if email already exists
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar di sistem.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save in users table with role 'sponsor'
    const result = await pool.query(`
      INSERT INTO users (name, email, password, university, role, is_verified, is_approved, is_active)
      VALUES ($1, $2, $3, $4, 'sponsor', true, true, true)
      RETURNING id, name, email, university as company_name, role
    `, [name, email, hashedPassword, company_name]);

    res.status(201).json({
      message: `Akun mitra sponsor "${name}" untuk "${company_name}" berhasil dibuat!`,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('[inviteSponsor]', err);
    res.status(500).json({ message: 'Gagal membuat akun sponsor baru.' });
  }
};

// Retrieve all sponsorships on the platform (Moderator/Superadmin)
const getAllSponsorships = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as sponsor_name, u.university as company_name
      FROM sponsorships s
      JOIN users u ON s.sponsor_id = u.id
      ORDER BY s.id DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[getAllSponsorships]', err);
    res.status(500).json({ message: 'Gagal mengambil data seluruh sponsorship.' });
  }
};

// Toggle Sponsorship active status (Moderator/Superadmin)
const toggleSponsorshipStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const checkRes = await pool.query('SELECT is_active, title FROM sponsorships WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Iklan sponsor tidak ditemukan.' });
    }

    const newStatus = !checkRes.rows[0].is_active;
    await pool.query('UPDATE sponsorships SET is_active = $1 WHERE id = $2', [newStatus, id]);

    res.json({
      message: `Berhasil ${newStatus ? 'mengaktifkan kembali' : 'menonaktifkan'} iklan "${checkRes.rows[0].title}".`,
      data: { id, is_active: newStatus }
    });

  } catch (err) {
    console.error('[toggleSponsorshipStatus]', err);
    res.status(500).json({ message: 'Gagal merubah status keaktifan iklan sponsor.' });
  }
};

// Update Sponsorship Total Cost with Audit Logging (Moderator/Superadmin)
const updateSponsorshipCost = async (req, res) => {
  const { id } = req.params;
  const { total_cost, reason } = req.body;
  const moderatorId = req.userId;

  if (total_cost === undefined || isNaN(parseFloat(total_cost)) || parseFloat(total_cost) < 0) {
    return res.status(400).json({ message: 'Nominal penyesuaian biaya wajib bernilai positif.' });
  }

  try {
    const checkRes = await pool.query('SELECT total_cost, title FROM sponsorships WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Iklan sponsor tidak ditemukan.' });
    }

    const oldCost = parseFloat(checkRes.rows[0].total_cost);
    const newCost = parseFloat(total_cost);

    // 1. Update sponsorship total_cost
    await pool.query('UPDATE sponsorships SET total_cost = $1 WHERE id = $2', [newCost, id]);

    // 2. Insert into cost logs
    await pool.query(`
      INSERT INTO sponsorship_cost_logs (sponsorship_id, modified_by, old_cost, new_cost, reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, moderatorId, oldCost, newCost, reason || 'Disesuaikan oleh administrator']);

    res.json({
      message: `Biaya total iklan "${checkRes.rows[0].title}" berhasil disesuaikan dari IDR ${oldCost.toLocaleString('id-ID')} menjadi IDR ${newCost.toLocaleString('id-ID')}.`,
      data: {
        id,
        old_cost: oldCost,
        new_cost: newCost
      }
    });

  } catch (err) {
    console.error('[updateSponsorshipCost]', err);
    res.status(500).json({ message: 'Gagal melakukan penyesuaian biaya iklan.' });
  }
};

// Add a new historical daily pricing rate (Moderator/Superadmin)
const addPricingRate = async (req, res) => {
  const { page_key, price_per_day, effective_date } = req.body;

  const validPages = ['dashboard', 'competitions', 'matchmaking', 'teams'];
  if (!page_key || !validPages.includes(page_key)) {
    return res.status(400).json({ message: 'Kunci halaman target tidak valid.' });
  }

  if (price_per_day === undefined || isNaN(parseFloat(price_per_day)) || parseFloat(price_per_day) < 0) {
    return res.status(400).json({ message: 'Tarif harga per hari wajib bernilai positif.' });
  }

  if (!effective_date) {
    return res.status(400).json({ message: 'Tanggal mulai berlaku tarif wajib ditentukan.' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO sponsorship_pricing_rates (page_key, price_per_day, effective_date)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [page_key, price_per_day, effective_date]);

    res.status(201).json({
      message: `Tarif baru untuk halaman "${page_key}" berhasil ditambahkan! Berlaku mulai tanggal: ${effective_date}.`,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('[addPricingRate]', err);
    res.status(500).json({ message: 'Gagal menyimpan konfigurasi tarif harga baru.' });
  }
};

// Retrieve cost modification logs for a specific sponsorship (Moderator & Sponsor)
const getCostLogs = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT cl.*, u.name as modifier_name
      FROM sponsorship_cost_logs cl
      LEFT JOIN users u ON cl.modified_by = u.id
      WHERE cl.sponsorship_id = $1
      ORDER BY cl.id DESC
    `, [id]);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('[getCostLogs]', err);
    res.status(500).json({ message: 'Gagal memuat catatan log penyesuaian biaya.' });
  }
};

module.exports = {
  getModeratorStats,
  getModeratorData,
  toggleActiveStatus,
  simulateWebScraping,
  toggleModeratorStatus,
  updateFeatureSettings,
  updateMaintenanceSettings,
  approveOrganizer,
  inviteSponsor,
  getAllSponsorships,
  toggleSponsorshipStatus,
  updateSponsorshipCost,
  addPricingRate,
  getCostLogs
};
