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
    const usersRes = await pool.query('SELECT id, name, email, university, prodi, role, is_active FROM users ORDER BY role ASC, id DESC');
    
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
  if (!url) {
    return res.status(400).json({ message: 'URL sumber wajib disertakan.' });
  }

  try {
    // Artificial simulation delay of 1.5 seconds for scraping & AI parsing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const urlLower = url.toLowerCase();
    let template = {};

    if (urlLower.includes('instagram') || urlLower.includes('tiktok') || urlLower.includes('dribbble') || urlLower.includes('behance')) {
      // Instagram / Social / Design Template
      template = {
        title: 'Instagram Creative UI/UX Poster Design Contest 2026',
        organizer: 'Instagram Creators ID',
        categorySlug: 'ui-ux',
        description: 'Tantangan desain poster dan interface media sosial interaktif berskala nasional untuk memperingati hari kreativitas digital. Terbuka bagi seluruh mahasiswa aktif!',
        prize: 'Juara 1: Rp 10.000.000, Juara 2: Rp 5.000.000, Juara 3: Rp 3.000.000',
        minMembers: 1,
        maxMembers: 1,
        registrationModel: 'hosted',
        isFree: true,
        daysOffset: 30
      };
    } else if (urlLower.includes('github') || urlLower.includes('devpost') || urlLower.includes('hackathon') || urlLower.includes('hack')) {
      // Tech Hackathon Template
      template = {
        title: 'Global Tech Innovation Hackathon 2026',
        organizer: 'GitHub Developer Union',
        categorySlug: 'web-dev',
        description: 'Tantangan Hackathon Global berdurasi 48 jam penuh untuk memecahkan masalah pemanasan global dan efisiensi energi menggunakan teknologi web app modern dan kecerdasan buatan.',
        prize: 'Juara 1: Rp 50.000.000 + Trip San Francisco, Juara 2: Rp 25.000.000, Juara 3: Rp 15.000.000',
        minMembers: 3,
        maxMembers: 5,
        registrationModel: 'hosted',
        isFree: true,
        daysOffset: 15
      };
    } else {
      // Data Science / General Science Template
      template = {
        title: 'National Mathematics & Data Olympiad 2026',
        organizer: 'Ikatan Ilmuwan Data Indonesia',
        categorySlug: 'data-science',
        description: 'Olimpiade bergengsi tingkat nasional untuk menguji kemahiran analitis statistika terapan, visualisasi data interaktif, dan pemodelan prediktif machine learning tingkat lanjut.',
        prize: 'Juara 1: Rp 20.000.000 + Piala Rektor, Juara 2: Rp 10.000.000, Juara 3: Rp 5.000.000',
        minMembers: 2,
        maxMembers: 3,
        registrationModel: 'hosted',
        isFree: false,
        daysOffset: 20
      };
    }

    // Generate deadline date dynamically
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + template.daysOffset);
    const deadlineStr = deadlineDate.toISOString().split('T')[0];

    // Return high-fidelity prefilled metadata payload
    res.json({
      message: 'Scraping & Analisis AI Berhasil!',
      data: {
        title: template.title,
        organizer: template.organizer,
        categorySlug: template.categorySlug,
        description: template.description,
        prize: template.prize,
        minMembers: template.minMembers,
        maxMembers: template.maxMembers,
        registrationModel: template.registrationModel,
        isFree: template.isFree,
        deadline: deadlineStr,
        sourceUrl: url
      }
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

module.exports = {
  getModeratorStats,
  getModeratorData,
  toggleActiveStatus,
  simulateWebScraping,
  toggleModeratorStatus,
  updateFeatureSettings,
  updateMaintenanceSettings
};
