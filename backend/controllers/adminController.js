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

    res.json({
      data: {
        users: {
          total: parseInt(usersCount.rows[0].count, 10),
          active: parseInt(usersCount.rows[0].active, 10),
        },
        competitions: {
          total: parseInt(compsCount.rows[0].count, 10),
          active: parseInt(compsCount.rows[0].active, 10),
        },
        teams: {
          total: parseInt(teamsCount.rows[0].count, 10),
          active: parseInt(teamsCount.rows[0].active, 10),
        },
        settings
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

module.exports = {
  getModeratorStats,
  getModeratorData,
  toggleActiveStatus,
  simulateWebScraping,
  toggleModeratorStatus,
  updateFeatureSettings,
  updateMaintenanceSettings,
  approveOrganizer
};
