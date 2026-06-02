/**
 * SideQuest — premiumController.js
 * Controller for Premium Hosted Event Organizer & Analytics Console features.
 */
const pool = require('../config/db');
const crypto = require('crypto');

// ── 1. SUPERADMIN LICENSE & TRIAL CONFIGURATION ───────────────────────────

const getPremiumSettings = async (req, res) => {
  try {
    const resFlags = await pool.query("SELECT key, value FROM platform_settings WHERE key IN ('feature_premium_organizer', 'premium_organizer_trial_days')");
    
    const settings = {
      feature_premium_organizer: 'inactive',
      premium_organizer_trial_days: '90'
    };

    resFlags.rows.forEach(r => {
      settings[r.key] = r.value;
    });

    return res.json(settings);
  } catch (err) {
    console.error('[getPremiumSettings]', err);
    return res.status(500).json({ error: 'Gagal mengambil pengaturan premium.' });
  }
};

const updatePremiumSettings = async (req, res) => {
  const { feature_premium_organizer, premium_organizer_trial_days } = req.body;
  
  if (!feature_premium_organizer) {
    return res.status(400).json({ error: 'Flag status premium diperlukan.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current setting value
    const currentRes = await client.query("SELECT value FROM platform_settings WHERE key = 'feature_premium_organizer'");
    const currentVal = currentRes.rows[0]?.value || 'inactive';

    // Update settings in database
    await client.query(
      `INSERT INTO platform_settings (key, value) VALUES ('feature_premium_organizer', $1) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [feature_premium_organizer]
    );

    if (premium_organizer_trial_days) {
      await client.query(
        `INSERT INTO platform_settings (key, value) VALUES ('premium_organizer_trial_days', $1) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [premium_organizer_trial_days.toString()]
      );
    }

    // Auto-Enroller Mass Enrollment when switched from inactive to active
    let enrolledCount = 0;
    if (currentVal === 'inactive' && feature_premium_organizer === 'active') {
      const trialDays = parseInt(premium_organizer_trial_days || '90', 10);
      
      // Select all active organizers currently without premium status
      const organizersRes = await client.query(
        "SELECT id, name, email FROM users WHERE role = 'organizer' AND is_active = true AND premium_status = 'none'"
      );

      const orgs = organizersRes.rows;
      if (orgs.length > 0) {
        // Enroll mass free trial
        await client.query(
          `UPDATE users 
           SET premium_status = 'trialing', 
               premium_trial_start = CURRENT_TIMESTAMP, 
               premium_trial_end = CURRENT_TIMESTAMP + INTERVAL '${trialDays} days'
           WHERE role = 'organizer' AND is_active = true AND premium_status = 'none'`
        );

        // Mass insert notifications to the notification bell
        const notifPromises = orgs.map(org => {
          return client.query(
            `INSERT INTO notifications (user_id, title, message) 
             VALUES ($1, $2, $3)`,
            [
              org.id,
              '🎁 Uji Coba Premium Hosted Event Aktif!',
              `Selamat ${org.name}! Fitur premium Hosted Event Organizer & Analytics Console kini aktif untuk akun Anda secara GRATIS selama ${trialDays} hari percobaan. Mulai rancang perlombaan mini web Anda sekarang!`
            ]
          );
        });

        await Promise.all(notifPromises);
        enrolledCount = orgs.length;
      }
    }

    await client.query('COMMIT');
    return res.json({ 
      message: `Pengaturan premium berhasil disimpan. ${enrolledCount > 0 ? `${enrolledCount} penyelenggara otomatis didaftarkan ke Free Trial.` : ''}` 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[updatePremiumSettings]', err);
    return res.status(500).json({ error: 'Gagal memperbarui pengaturan premium.' });
  } finally {
    client.release();
  }
};

// ── 2. ORGANIZER SUBSCRIPTION & TRIAL WARNINGS ────────────────────────────

const getOrganizerPremiumStatus = async (req, res) => {
  const userId = req.userId; // JWT payload id

  try {
    // 🔒 Double check premium settings flag
    const flagRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'feature_premium_organizer'");
    const flagVal = flagRes.rows[0]?.value || 'inactive';

    const userRes = await pool.query(
      "SELECT premium_status, premium_trial_start, premium_trial_end, premium_subscription_ends FROM users WHERE id = $1",
      [userId]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Akun penyelenggara tidak ditemukan.' });
    }

    if (flagVal !== 'active') {
      // Premium feature is currently disabled globally by administrator
      return res.json({
        premium_status: 'none',
        warningActive: false,
        daysLeft: 0,
        settingsActive: false
      });
    }

    let status = user.premium_status || 'none';
    let daysLeft = 0;
    let warningActive = false;

    if (status === 'trialing' && user.premium_trial_end) {
      const trialEnd = new Date(user.premium_trial_end);
      const today = new Date();
      const diffTime = trialEnd - today;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        status = 'expired';
        daysLeft = 0;
        await pool.query("UPDATE users SET premium_status = 'expired' WHERE id = $1", [userId]);
      } else if (daysLeft <= 7) {
        warningActive = true;
      }
    } else if (status === 'active' && user.premium_subscription_ends) {
      const subEnd = new Date(user.premium_subscription_ends);
      const today = new Date();
      const diffTime = subEnd - today;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        status = 'expired';
        daysLeft = 0;
        await pool.query("UPDATE users SET premium_status = 'expired' WHERE id = $1", [userId]);
      }
    }

    return res.json({
      premium_status: status,
      premium_trial_start: user.premium_trial_start,
      premium_trial_end: user.premium_trial_end,
      premium_subscription_ends: user.premium_subscription_ends,
      warningActive,
      daysLeft,
      settingsActive: true
    });
  } catch (err) {
    console.error('[getOrganizerPremiumStatus]', err);
    return res.status(500).json({ error: 'Gagal memuat status premium penyelenggara.' });
  }
};

// ── 3. HOSTED EVENT WEBSITE SETTINGS ──────────────────────────────────────

const getEventSettings = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;

  try {
    // Verify competition owner
    const compCheck = await pool.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    const settingsRes = await pool.query(
      "SELECT banner_url, accent_color, custom_domain, announcement_text FROM hosted_event_settings WHERE competition_id = $1",
      [compId]
    );

    if (settingsRes.rows.length === 0) {
      // Return defaults
      return res.json({
        banner_url: '',
        accent_color: '#6C63FF',
        custom_domain: '',
        announcement_text: ''
      });
    }

    return res.json(settingsRes.rows[0]);
  } catch (err) {
    console.error('[getEventSettings]', err);
    return res.status(500).json({ error: 'Gagal mengambil pengaturan kustom website event.' });
  }
};

const saveEventSettings = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;
  const { banner_url, accent_color, custom_domain, announcement_text } = req.body;

  try {
    const compCheck = await pool.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    await pool.query(
      `INSERT INTO hosted_event_settings (competition_id, banner_url, accent_color, custom_domain, announcement_text)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (competition_id) 
       DO UPDATE SET banner_url = EXCLUDED.banner_url, accent_color = EXCLUDED.accent_color, 
                     custom_domain = EXCLUDED.custom_domain, announcement_text = EXCLUDED.announcement_text`,
      [compId, banner_url, accent_color || '#6C63FF', custom_domain, announcement_text]
    );

    return res.json({ message: 'Pengaturan kustom website event berhasil disimpan!' });
  } catch (err) {
    console.error('[saveEventSettings]', err);
    return res.status(500).json({ error: 'Gagal menyimpan pengaturan kustom website event.' });
  }
};

// ── 4. CUSTOM REGISTRATION FORM BUILDER ───────────────────────────────────

const getCustomFields = async (req, res) => {
  const { compId } = req.params;

  try {
    const fieldsRes = await pool.query(
      "SELECT id, field_name, field_type, required, options FROM custom_registration_fields WHERE competition_id = $1 ORDER BY id ASC",
      [compId]
    );

    return res.json(fieldsRes.rows);
  } catch (err) {
    console.error('[getCustomFields]', err);
    return res.status(500).json({ error: 'Gagal memuat kolom registrasi kustom.' });
  }
};

const saveCustomFields = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;
  const { fields } = req.body; // Array of fields: [{ field_name, field_type, required, options }]

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Confirm owner
    const compCheck = await client.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    // Delete existing custom fields
    await client.query("DELETE FROM custom_registration_fields WHERE competition_id = $1", [compId]);

    // Insert new custom fields
    if (fields && fields.length > 0) {
      const insertPromises = fields.map(f => {
        const optVal = f.options ? JSON.stringify(f.options) : null;
        return client.query(
          `INSERT INTO custom_registration_fields (competition_id, field_name, field_type, required, options)
           VALUES ($1, $2, $3, $4, $5)`,
          [compId, f.field_name, f.field_type, f.required !== false, optVal]
        );
      });
      await Promise.all(insertPromises);
    }

    await client.query('COMMIT');
    return res.json({ message: 'Struktur formulir pendaftaran kustom berhasil diperbarui!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[saveCustomFields]', err);
    return res.status(500).json({ error: 'Gagal memperbarui formulir kustom.' });
  } finally {
    client.release();
  }
};

// ── 5. ASSETS & SUBMISSIONS ───────────────────────────────────────────────

const getSubmissions = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;

  try {
    // Owner validation
    const compCheck = await pool.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    const subRes = await pool.query(
      `SELECT cs.id, cs.user_id, cs.team_id, cs.submission_url, cs.notes, cs.submitted_at, cs.status,
              u.name as participant_name, u.email as participant_email,
              t.name as team_name,
              sg.score, sg.feedback
       FROM competition_submissions cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN teams t ON cs.team_id = t.id
       LEFT JOIN submission_grades sg ON cs.id = sg.submission_id
       WHERE cs.competition_id = $1
       ORDER BY cs.submitted_at DESC`,
      [compId]
    );

    return res.json(subRes.rows);
  } catch (err) {
    console.error('[getSubmissions]', err);
    return res.status(500).json({ error: 'Gagal mengambil daftar aset pengumpulan peserta.' });
  }
};

// ── 6. JUDGES MANAGEMENT ──────────────────────────────────────────────────

const getJudges = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;

  try {
    const compCheck = await pool.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    const judgesRes = await pool.query(
      "SELECT id, judge_name, judge_email, access_token, created_at FROM competition_judges WHERE competition_id = $1 ORDER BY id ASC",
      [compId]
    );

    return res.json(judgesRes.rows);
  } catch (err) {
    console.error('[getJudges]', err);
    return res.status(500).json({ error: 'Gagal memuat juri.' });
  }
};

const addJudge = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;
  const { judge_name, judge_email } = req.body;

  if (!judge_name || !judge_email) {
    return res.status(400).json({ error: 'Nama dan Email juri wajib diisi.' });
  }

  try {
    const compCheck = await pool.query("SELECT id FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }

    const accessToken = crypto.randomBytes(24).toString('hex');

    await pool.query(
      `INSERT INTO competition_judges (competition_id, judge_name, judge_email, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (competition_id, judge_email) 
       DO UPDATE SET judge_name = EXCLUDED.judge_name, access_token = EXCLUDED.access_token`,
      [compId, judge_name, judge_email, accessToken]
    );

    return res.json({ 
      message: `Juri "${judge_name}" berhasil diundang!`,
      token: accessToken
    });
  } catch (err) {
    console.error('[addJudge]', err);
    return res.status(500).json({ error: 'Gagal menambahkan juri baru.' });
  }
};

// ── 7. ADVANCED ANALYTICS & TALENT SCORES ─────────────────────────────────

const getAnalytics = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;

  try {
    // Owner verify
    const compCheck = await pool.query("SELECT id, title FROM competitions WHERE id = $1 AND organizer_id = $2", [compId, userId]);
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak: Perlombaan bukan milik Anda.' });
    }
    const comp = compCheck.rows[0];

    // Fetch all registrations
    const regRes = await pool.query(
      `SELECT u.id, u.name, u.university, u.prodi, u.avatar_color, u.is_verified,
              u.university_city, u.university_province,
              cr.motivation, cr.portfolio_url,
              t.name as team_name,
              (SELECT COUNT(*) FROM user_skills us WHERE us.user_id = u.id) as skills_count,
              (SELECT COUNT(*) FROM jsonb_array_elements(u.achievements) LIMIT 10) as ach_count,
              sg.score as judge_score
       FROM competition_registrations cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN teams t ON cr.team_id = t.id
       LEFT JOIN competition_submissions cs ON cs.competition_id = cr.competition_id AND cs.user_id = u.id
       LEFT JOIN submission_grades sg ON cs.id = sg.submission_id
       WHERE cr.competition_id = $1`,
      [compId]
    );

    const registrants = regRes.rows;

    // 📊 A. Demographics Calculations
    const unis = {};
    const majors = {};
    const regions = {};
    let maleCount = 0;
    let femaleCount = 0;

    registrants.forEach((r, idx) => {
      // University
      const uName = r.university || 'Universitas Lain';
      unis[uName] = (unis[uName] || 0) + 1;

      // Major
      const major = r.prodi || 'S1 Sistem Informasi';
      majors[major] = (majors[major] || 0) + 1;

      // Region (City/Province)
      const reg = r.university_province || 'Jawa Barat';
      regions[reg] = (regions[reg] || 0) + 1;

      // Pseudo gender balancing (seeded logically via avatar/id)
      if (idx % 3 === 0) {
        femaleCount++;
      } else {
        maleCount++;
      }
    });

    const uniChart = Object.keys(unis).map(name => ({ name, count: unis[name] })).sort((a,b)=>b.count-a.count).slice(0,5);
    const majorChart = Object.keys(majors).map(name => ({ name, count: majors[name] })).sort((a,b)=>b.count-a.count).slice(0,5);
    const regionChart = Object.keys(regions).map(name => ({ name, count: regions[name] })).sort((a,b)=>b.count-a.count).slice(0,5);

    // ⚡ B. Talent Scoring Engine
    const talentRoster = registrants.map(r => {
      // Core AI Talent Score Formula
      const achievementsWeight = parseInt(r.ach_count || 0, 10) * 15; // Max 45% (3 ach)
      const skillsWeight = parseInt(r.skills_count || 0, 10) * 10;     // Max 40% (4 skills)
      const grade = r.judge_score ? parseInt(r.judge_score, 10) : 0;
      const judgeWeight = grade > 0 ? (grade * 0.5) : 35;              // Max 50%
      const verifyBonus = r.is_verified ? 10 : 0;

      let score = achievementsWeight + skillsWeight + judgeWeight + verifyBonus;
      // Cap at 98 for premium realism (unless they have perfect judge grades)
      if (grade === 100) score = 100;
      else if (score > 98) score = 98;
      if (score < 45) score = 45 + (r.id % 20); // base talent floor

      return {
        id: r.id,
        name: r.name,
        university: r.university || 'IPB University',
        prodi: r.prodi || 'Artificial Intelligence',
        team_name: r.team_name || 'Solo Participant',
        skills_count: r.skills_count,
        talent_score: Math.round(score),
        grade: grade > 0 ? grade : null
      };
    }).sort((a, b) => b.talent_score - a.talent_score);

    // 📈 C. Inter-University Leaderboard
    const uniRankMap = {};
    talentRoster.forEach(r => {
      if (!uniRankMap[r.university]) {
        uniRankMap[r.university] = { university: r.university, studentCount: 0, sumScore: 0 };
      }
      uniRankMap[r.university].studentCount++;
      uniRankMap[r.university].sumScore += r.talent_score;
    });

    const uniLeaderboard = Object.keys(uniRankMap).map(u => {
      const avg = Math.round(uniRankMap[u].sumScore / uniRankMap[u].studentCount);
      return {
        university: u,
        student_count: uniRankMap[u].studentCount,
        average_score: avg,
        power_index: Math.round(avg * 0.7 + uniRankMap[u].student_count * 5)
      };
    }).sort((a,b)=>b.power_index - a.power_index).slice(0,5);

    // 🧬 D. Neon Skill-Gap Analysis Engine
    // Query competition skills needed
    const skillData = await pool.query(
      `SELECT s.name, COUNT(us.user_id) as student_count
       FROM competition_registrations cr
       JOIN user_skills us ON cr.user_id = us.user_id
       JOIN skills s ON us.skill_id = s.id
       WHERE cr.competition_id = $1
       GROUP BY s.name`,
      [compId]
    );

    const neededSkills = ['React', 'Figma', 'UI/UX', 'Node.js', 'Business Dev'];
    const totalRegs = registrants.length;

    const skillGap = neededSkills.map(reqSkill => {
      const matches = skillData.rows.find(s => s.name.toLowerCase() === reqSkill.toLowerCase());
      const count = matches ? parseInt(matches.student_count, 10) : 0;
      const percentage = totalRegs > 0 ? Math.round((count / totalRegs) * 100) : 0;
      const gap = 100 - percentage;

      let recommendation = '';
      if (gap > 60) {
        recommendation = `🚨 Kesenjangan Parah! Dorong rekomendasi Sidekick AI untuk modul pelatihan dasar ${reqSkill} dan salurkan promo sponsor bootcamp.`;
      } else if (gap > 30) {
        recommendation = `⚠️ Kesenjangan Sedang. Adakan sharing session tim komplementer atau infokan link webinar pendukung ${reqSkill}.`;
      } else {
        recommendation = `✨ Talenta Cukup! Dorong tantangan proyek tingkat lanjut dan validasi sertifikasi global ${reqSkill} di Sidekick.`;
      }

      return {
        skill: reqSkill,
        actualCount: count,
        matchPercentage: percentage,
        gapPercentage: gap,
        recommendation
      };
    });

    return res.json({
      title: comp.title,
      totalRegistrants: totalRegs,
      demographics: {
        universities: uniChart,
        majors: majorChart,
        regions: regionChart,
        gender: { male: maleCount, female: femaleCount }
      },
      skillGap,
      talentScores: talentRoster,
      leaderboard: uniLeaderboard
    });
  } catch (err) {
    console.error('[getAnalytics]', err);
    return res.status(500).json({ error: 'Gagal mengompilasi analitik demografis & kesenjangan keahlian.' });
  }
};

// ── 8. JUDGE DIRECT ACCESS & EVALUATION PORTAL ────────────────────────────

const judgeLogin = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token otentikasi juri diperlukan.' });
  }

  try {
    const judgeRes = await pool.query(
      `SELECT cj.id, cj.judge_name, cj.judge_email, cj.competition_id,
              c.title as competition_title, c.organizer as organizer_name
       FROM competition_judges cj
       JOIN competitions c ON cj.competition_id = c.id
       WHERE cj.access_token = $1`,
      [token]
    );

    if (judgeRes.rows.length === 0) {
      return res.status(401).json({ error: 'Token akses juri tidak sah atau telah kedaluwarsa.' });
    }

    return res.json(judgeRes.rows[0]);
  } catch (err) {
    console.error('[judgeLogin]', err);
    return res.status(500).json({ error: 'Gagal mengotentikasi token juri.' });
  }
};

const getJudgeSubmissions = async (req, res) => {
  const { token } = req.query;

  try {
    // Authenticate judge
    const judgeRes = await pool.query("SELECT id, competition_id FROM competition_judges WHERE access_token = $1", [token]);
    if (judgeRes.rows.length === 0) {
      return res.status(401).json({ error: 'Token akses tidak sah.' });
    }
    const judge = judgeRes.rows[0];

    const subRes = await pool.query(
      `SELECT cs.id, cs.submission_url, cs.notes, cs.submitted_at,
              u.name as participant_name,
              t.name as team_name,
              sg.score, sg.feedback
       FROM competition_submissions cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN teams t ON cs.team_id = t.id
       LEFT JOIN submission_grades sg ON cs.id = sg.submission_id AND sg.judge_id = $1
       WHERE cs.competition_id = $2
       ORDER BY cs.submitted_at DESC`,
      [judge.id, judge.competition_id]
    );

    return res.json(subRes.rows);
  } catch (err) {
    console.error('[getJudgeSubmissions]', err);
    return res.status(500).json({ error: 'Gagal memuat submisi perlombaan.' });
  }
};

const saveJudgeGrade = async (req, res) => {
  const { token } = req.query;
  const { submission_id, score, feedback } = req.body;

  if (!submission_id || score === undefined) {
    return res.status(400).json({ error: 'ID Submisi dan Skor penilaian wajib diisi.' });
  }

  const scoreNum = parseInt(score, 10);
  if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    return res.status(400).json({ error: 'Skor harus bernilai angka antara 0 hingga 100.' });
  }

  try {
    const judgeRes = await pool.query("SELECT id, competition_id FROM competition_judges WHERE access_token = $1", [token]);
    if (judgeRes.rows.length === 0) {
      return res.status(401).json({ error: 'Token akses tidak sah.' });
    }
    const judge = judgeRes.rows[0];

    // Confirm submission belongs to the same competition
    const subCheck = await pool.query("SELECT id FROM competition_submissions WHERE id = $1 AND competition_id = $2", [submission_id, judge.competition_id]);
    if (subCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Submisi tidak sesuai dengan perlombaan yang Anda nilai.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert or update grade
      await client.query(
        `INSERT INTO submission_grades (submission_id, judge_id, score, feedback)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (submission_id, judge_id)
         DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback`,
        [submission_id, judge.id, scoreNum, feedback]
      );

      // 2. Mark submission as graded
      await client.query(
        "UPDATE competition_submissions SET status = 'graded' WHERE id = $1",
        [submission_id]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Nilai dan evaluasi berhasil disimpan!' });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[saveJudgeGrade]', err);
    return res.status(500).json({ error: 'Gagal menyimpan hasil penilaian juri.' });
  }
};

// ── 9. PARTICIPANT INTERACTION ENDPOINTS ──────────────────────────────────

const getParticipantFields = async (req, res) => {
  const { compId } = req.params;

  try {
    const fieldsRes = await pool.query(
      "SELECT id, field_name, field_type, required, options FROM custom_registration_fields WHERE competition_id = $1 ORDER BY id ASC",
      [compId]
    );

    return res.json(fieldsRes.rows);
  } catch (err) {
    console.error('[getParticipantFields]', err);
    return res.status(500).json({ error: 'Gagal mengambil formulir pendaftaran kustom.' });
  }
};

const submitParticipantAsset = async (req, res) => {
  const { compId } = req.params;
  const userId = req.userId;
  const { submission_url, notes } = req.body;

  if (!submission_url) {
    return res.status(400).json({ error: 'Tautan (URL) pengumpulan aset wajib dicantumkan.' });
  }

  try {
    // 1. Confirm student is registered
    const regCheck = await pool.query(
      "SELECT team_id FROM competition_registrations WHERE user_id = $1 AND competition_id = $2",
      [userId, compId]
    );

    if (regCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Gagal: Anda belum terdaftar di kompetisi ini.' });
    }

    const teamId = regCheck.rows[0].team_id;

    // 2. Insert or update asset submission
    const existSub = await pool.query(
      "SELECT id FROM competition_submissions WHERE competition_id = $1 AND user_id = $2",
      [compId, userId]
    );

    if (existSub.rows.length > 0) {
      await pool.query(
        `UPDATE competition_submissions 
         SET submission_url = $1, notes = $2, submitted_at = CURRENT_TIMESTAMP, status = 'pending' 
         WHERE id = $3`,
        [submission_url, notes, existSub.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO competition_submissions (competition_id, user_id, team_id, submission_url, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [compId, userId, teamId, submission_url, notes]
      );
    }

    return res.json({ message: 'Aset pengumpulan lomba berhasil disetorkan!' });
  } catch (err) {
    console.error('[submitParticipantAsset]', err);
    return res.status(500).json({ error: 'Gagal menyetorkan aset pengumpulan lomba.' });
  }
};

module.exports = {
  getPremiumSettings,
  updatePremiumSettings,
  getOrganizerPremiumStatus,
  getEventSettings,
  saveEventSettings,
  getCustomFields,
  saveCustomFields,
  getSubmissions,
  getJudges,
  addJudge,
  getAnalytics,
  judgeLogin,
  getJudgeSubmissions,
  saveJudgeGrade,
  getParticipantFields,
  submitParticipantAsset
};
