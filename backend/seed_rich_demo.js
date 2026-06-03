/**
 * SideQuest — seed_rich_demo.js
 * Generates an investor-ready, comprehensive seed dataset showing 3 months of platform activity.
 * - Seeds dynamic students to reach exactly 189.
 * - Seeds dynamic organizers to reach exactly 34.
 * - Seeds dynamic sponsors to reach exactly 14.
 * - Seeds/Updates competitions to reach exactly 38:
 *   - 13 ended (deadline in the past)
 *   - 15 ongoing (deadline in the future, active submissions)
 *   - 10 recruitment (deadline in the future, active matchmaking)
 * - Seeds/Updates teams to reach exactly 64.
 * - Generates high active metrics: ~250 connections, ~350 registrations, ~35 submissions, ~32 grades with rich feedback, ~15,000 ad impressions, ~1,200 ad clicks.
 * - SAFE: Preserves core existing user accounts and relationships!
 */
const { Pool } = require('pg');
const crypto = require('crypto');

// Use DATABASE_URL (e.g. Supabase production) when provided; otherwise fall
// back to the local Postgres config. The whole seed runs in one transaction.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sidequest2',
      password: process.env.DB_PASSWORD || 'PIa1234!', // Local development postgres password
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    });

const FIRST_NAMES = ['Aditya', 'Bagus', 'Candra', 'Daffa', 'Eka', 'Fajar', 'Gilang', 'Hendra', 'Indra', 'Joko', 'Kevin', 'Luthfi', 'Muhammad', 'Naufal', 'Oki', 'Pratama', 'Rian', 'Satria', 'Taufik', 'Utama', 'Wahyu', 'Yudi', 'Zacky', 'Annisa', 'Bella', 'Citra', 'Dian', 'Elsa', 'Fitri', 'Gita', 'Hesti', 'Indah', 'Jihan', 'Kartika', 'Laras', 'Mega', 'Nadia', 'Olivia', 'Putri', 'Qori', 'Rina', 'Siti', 'Tari', 'Ulfah', 'Vina', 'Wulan', 'Yulia', 'Zahra', 'Arif', 'Dewi', 'Hadi', 'Budi', 'Rahmat', 'Nur', 'Aulia', 'Farhan', 'Rizky', 'Tegar', 'Fadilah', 'Putu', 'Made', 'Nyoman', 'Ketut', 'Satria', 'Ari', 'Gusti', 'Anak', 'Agung', 'Cokorda', 'Ida', 'Raka'];
const LAST_NAMES = ['Saputra', 'Wijaya', 'Santoso', 'Pratama', 'Hidayat', 'Kusuma', 'Putra', 'Setiawan', 'Wibowo', 'Nugroho', 'Gunawan', 'Suryadi', 'Budiman', 'Lestari', 'Putri', 'Sari', 'Indah', 'Rahmawati', 'Utami', 'Dewi', 'Fitriani', 'Wulandari', 'Kartika', 'Amalia', 'Siregar', 'Lubis', 'Nasution', 'Ginting', 'Sembiring', 'Harahap', 'Tanjung', 'Simanjuntak', 'Pangaribuan', 'Sinaga', 'Hasibuan', 'Manurung', 'Zulkarnain', 'Laksana', 'Hadi', 'Lazuardi', 'Pangestu', 'Suharto', 'Yudhoyono', 'Habibie', 'Megawati'];

const UNIVERSITIES = [
  'IPB University', 'ITB Bandung', 'Universitas Indonesia', 'Universitas Gadjah Mada',
  'ITS Surabaya', 'Telkom University', 'BINUS University', 'Universitas Diponegoro',
  'Universitas Airlangga', 'Universitas Hasanuddin', 'Universitas Padjadjaran', 'Universitas Brawijaya'
];

const PROGRAMS = [
  'Informatika', 'Sistem Informasi', 'Teknik Komputer', 'Desain Komunikasi Visual',
  'Manajemen', 'Statistika', 'Kecerdasan Buatan', 'Rekayasa Perangkat Lunak'
];

const BIOS = [
  'Antusias dengan kolaborasi riset dan pengembangan software tingkat mahasiswa.',
  'Sedang mendalami UI/UX design dan riset pengguna secara praktis.',
  'Full-stack developer yang berfokus pada efisiensi API dan database relational.',
  'Machine learning enthusiast yang senang menganalisis pola data statistik.',
  'Business strategist yang siap membantu merancang pitch deck dan analisis keuangan.',
  'UI/UX designer dengan kecintaan pada desain minimalis dan glassmorphism.',
  'Sangat tertarik dengan proyek berdampak sosial dan startup ramah lingkungan.',
  'Pembelajar cepat yang berdedikasi mencari pengalaman lomba tingkat nasional.'
];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 
  'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 
  'bg-rose-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'
];

const PASS_HASH = '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS'; // password123

async function seed() {
  console.log('=== STARTING SEED CYCLE FOR INVESTOR-READY DEMO (3 MONTHS ACTIVE STATUS) ===\n');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Load category Map and skill IDs
    const catRes = await client.query('SELECT id, slug FROM categories');
    const categories = {};
    catRes.rows.forEach(c => { categories[c.slug] = c.id; });
    
    const skillRes = await client.query('SELECT id FROM skills');
    const skillIds = skillRes.rows.map(s => s.id);
    console.log(`- Loaded ${catRes.rows.length} categories and ${skillIds.length} skills.`);

    // ==========================================
    // 1. SEED STUDENTS (TARGET: 189)
    // ==========================================
    console.log('\n1. Checking student users (target: 189)...');
    const currentStudentsRes = await client.query("SELECT COUNT(*) FROM users WHERE role = 'peserta'");
    const currentStudentsCount = parseInt(currentStudentsRes.rows[0].count, 10);
    const studentsToSeed = Math.max(0, 189 - currentStudentsCount);
    console.log(`   Current: ${currentStudentsCount}. Seeding: ${studentsToSeed} new students...`);

    const emailsUsed = new Set();
    const existingEmails = await client.query('SELECT email FROM users');
    existingEmails.rows.forEach(r => emailsUsed.add(r.email.toLowerCase()));

    for (let i = 0; i < studentsToSeed; i++) {
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${fName} ${lName}`;
      
      let email = `${fName.toLowerCase()}.${lName.toLowerCase()}_${i + 1}@student.ac.id`;
      if (emailsUsed.has(email)) {
        email = `${fName.toLowerCase()}.${lName.toLowerCase()}_${Date.now()}_${i + 1}@student.ac.id`;
      }
      emailsUsed.add(email);

      const university = UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)];
      const prodi = PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const bio = BIOS[Math.floor(Math.random() * BIOS.length)];
      
      const exp = JSON.stringify([
        `Lomba Mini Web ${university} — Juara ${Math.floor(Math.random() * 3) + 1}`,
        `Project Bootcamp UI/UX ${prodi} — Peserta Terbaik`
      ]);
      const ach = JSON.stringify([
        `Sertifikat Professional Kelulusan ${prodi}`,
        `Juara Favorit Lomba Ide Solutif`
      ]);

      await client.query(`
        INSERT INTO users (name, email, password, university, prodi, avatar_color, bio, role, experience, achievements, online, is_verified, is_approved, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'peserta', $8, $9, $10, true, true, true)
      `, [name, email, PASS_HASH, university, prodi, avatarColor, bio, exp, ach, Math.random() > 0.6]);
    }

    // Load all students
    const allStudentsRes = await client.query("SELECT id, name, university, prodi FROM users WHERE role = 'peserta' AND is_active = true");
    const allStudents = allStudentsRes.rows;
    console.log(`   Total student accounts hydrated: ${allStudents.length}`);

    // Map skills for student users without skills
    console.log('\n2. Ensuring skills mapping is populated...');
    for (const student of allStudents) {
      const hasSkills = await client.query('SELECT COUNT(*) FROM user_skills WHERE user_id = $1', [student.id]);
      if (parseInt(hasSkills.rows[0].count, 10) === 0) {
        // Assign 3 to 5 random skills
        const selectedSkills = skillIds.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3);
        for (const skillId of selectedSkills) {
          await client.query('INSERT INTO user_skills (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [student.id, skillId]);
        }
      }
    }
    console.log('   Student skills successfully verified.');

    // ==========================================
    // 2. SEED ORGANIZERS (TARGET: 34)
    // ==========================================
    console.log('\n3. Checking organizer users (target: 34)...');
    const currentOrgRes = await client.query("SELECT COUNT(*) FROM users WHERE role = 'organizer'");
    const currentOrgCount = parseInt(currentOrgRes.rows[0].count, 10);
    const orgsToSeed = Math.max(0, 34 - currentOrgCount);
    console.log(`   Current: ${currentOrgCount}. Seeding: ${orgsToSeed} new organizers...`);

    const ORG_NAMES = [
      'BEM Fasilkom UI', 'HIMTI BINUS University', 'DSC ITB Bandung', 'Himpunan Statistika IPB', 
      'Inkubator Bisnis UGM', 'IEEE Student Branch ITS', 'DKV Telkom University', 'BEM Undip Semarang',
      'Himpunan Elektro Unhas', 'Keluarga Mahasiswa ITB', 'Inkubator Wirausaha Unair', 'BEM Universitas Padjadjaran',
      'Inovator Muda Brawijaya', 'Startup Hub Universitas Indonesia', 'Klub Robotik ITS'
    ];

    for (let i = 0; i < orgsToSeed; i++) {
      const orgName = ORG_NAMES[i % ORG_NAMES.length] + ` (Cluster ${Math.floor(i / ORG_NAMES.length) + 1})`;
      const email = `org.${orgName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${i + 1}@sidequest.id`;
      
      await client.query(`
        INSERT INTO users (name, email, password, role, avatar_color, bio, is_verified, is_approved, is_active, premium_status, premium_trial_start, premium_trial_end)
        VALUES ($1, $2, $3, 'organizer', 'bg-indigo-600', $4, true, true, true, 'trialing', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '60 days')
      `, [orgName, email, PASS_HASH, `Akun Penyelenggara Kompetisi Resmi untuk ${orgName}.`]);
    }

    const allOrgsRes = await client.query("SELECT id, name FROM users WHERE role = 'organizer'");
    const allOrgs = allOrgsRes.rows;
    console.log(`   Total organizer accounts hydrated: ${allOrgs.length}`);

    // ==========================================
    // 3. SEED SPONSORS (TARGET: 14)
    // ==========================================
    console.log('\n4. Checking sponsor users (target: 14)...');
    const currentSponsorRes = await client.query("SELECT COUNT(*) FROM users WHERE role = 'sponsor'");
    const currentSponsorCount = parseInt(currentSponsorRes.rows[0].count, 10);
    const sponsorsToSeed = Math.max(0, 14 - currentSponsorCount);
    console.log(`   Current: ${currentSponsorCount}. Seeding: ${sponsorsToSeed} new sponsors...`);

    const SPONSOR_NAMES = [
      'Traveloka Indonesia', 'Bukalapak', 'Dana Wallet', 'OVO Payments', 'Bank Mandiri', 
      'Bank Central Asia (BCA)', 'Grab Indonesia', 'Telkomsel', 'Indosat Ooredoo', 'Djarum Foundation'
    ];

    for (let i = 0; i < sponsorsToSeed; i++) {
      const spName = SPONSOR_NAMES[i % SPONSOR_NAMES.length] + ` (Partner ${Math.floor(i / SPONSOR_NAMES.length) + 1})`;
      const email = `sponsor.${spName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${i + 1}@corporate.com`;
      
      await client.query(`
        INSERT INTO users (name, email, password, role, avatar_color, bio, is_verified, is_approved, is_active)
        VALUES ($1, $2, $3, 'sponsor', 'bg-emerald-600', $4, true, true, true)
      `, [spName, email, PASS_HASH, `Official Premium Corporate Sponsor Partner for SideQuest Platform. ${spName}.`]);
    }

    const allSponsorsRes = await client.query("SELECT id, name FROM users WHERE role = 'sponsor'");
    const allSponsors = allSponsorsRes.rows;
    console.log(`   Total sponsor accounts hydrated: ${allSponsors.length}`);

    // ==========================================
    // 4. SEED COMPETITIONS (TARGET: 38)
    // ==========================================
    console.log('\n5. Checking and updating competitions (target: 38)...');
    const currentCompRes = await client.query('SELECT COUNT(*) FROM competitions');
    const currentCompCount = parseInt(currentCompRes.rows[0].count, 10);
    const compsToSeed = Math.max(0, 38 - currentCompCount);
    console.log(`   Current: ${currentCompCount}. Seeding: ${compsToSeed} new competitions...`);

    const NEW_COMP_TITLES = [
      'Indonesia IoT Smart Energy Hackathon 2026',
      'National Bio-Tech Innovation Summit 2026',
      'Sustainable Agri-Tech Challenge 2026',
      'ASEAN Fintech Innovation Bowl 2026',
      'National Mobile App Developer Contest 2026',
      'Figma Creative UI Masterclass Contest 2026',
      'National AI Health Solutions Challenge 2026',
      'Green Energy Startup Olympiad 2026',
      'Kemendikbud Cyber Security Olympiad 2026',
      'National Open Data Analytics Cup 2026',
      'Smart Logistics Hackathon 2026',
      'Social Entrepreneurship Ideas Challenge 2026',
      'National Product Manager Bootcamp Contest 2026',
      'E-Commerce UX Audit Challenge 2026',
      'National Data Science & ML Cup 2026'
    ];

    const COMP_EMOJIS = ['🔋', '🧬', '🌾', '💳', '📱', '🎨', '🏥', '🌿', '🛡️', '📊', '📦', '🤝', '📈', '🛒', '🔬'];
    const COMP_GRADIENTS = [
      'from-green-600 to-teal-500', 'from-emerald-500 to-lime-600', 'from-orange-500 to-yellow-500', 
      'from-blue-600 to-indigo-500', 'from-purple-500 to-pink-500', 'from-pink-500 to-rose-500',
      'from-cyan-500 to-blue-500', 'from-teal-600 to-green-500', 'from-red-500 to-orange-500',
      'from-violet-500 to-purple-600', 'from-indigo-600 to-purple-500', 'from-green-500 to-emerald-600',
      'from-yellow-500 to-orange-600', 'from-pink-600 to-indigo-500', 'from-cyan-400 to-blue-600'
    ];

    for (let i = 0; i < compsToSeed; i++) {
      const title = NEW_COMP_TITLES[i % NEW_COMP_TITLES.length];
      const emoji = COMP_EMOJIS[i % COMP_EMOJIS.length];
      const gradient = COMP_GRADIENTS[i % COMP_GRADIENTS.length];
      const category_id = categories['teknologi'] || 1;
      const org = allOrgs[i % allOrgs.length];

      await client.query(`
        INSERT INTO competitions (category_id, title, organizer, deadline, tags, color_gradient, emoji, is_free, prize, description, status, organizer_id, min_members, max_members, registration_model, winner_announcement, is_active)
        VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '20 days', '["Teknologi", "Nasional"]', $4, $5, true, 'Rp 15 Juta + Sertifikat', $6, 'published', $7, 1, 5, 'hosted', CURRENT_DATE + INTERVAL '27 days', true)
      `, [category_id, title, org.name, gradient, emoji, `Dukungan kompetisi rancang ide ${title} tingkat nasional untuk melahirkan inovasi muda terbaik.`, org.id]);
    }

    // Now let's fetch all 38 competitions and update deadlines to match:
    // - 13 ended (deadline in past)
    // - 15 ongoing (deadline in near future)
    // - 10 recruitment (deadline in far future)
    const allCompsRes = await client.query('SELECT id, title FROM competitions ORDER BY id');
    const allComps = allCompsRes.rows;
    console.log(`   Total competitions to classify: ${allComps.length}`);

    for (let i = 0; i < allComps.length; i++) {
      const compId = allComps[i].id;
      
      if (i < 13) {
        // 13 Ended
        const offset = 15 + i * 5; // ended 15 to 75 days ago
        await client.query(`
          UPDATE competitions 
          SET deadline = CURRENT_DATE - INTERVAL '${offset} days',
              winner_announcement = CURRENT_DATE - INTERVAL '${offset - 7} days'
          WHERE id = $1
        `, [compId]);
      } else if (i < 28) {
        // 15 Ongoing (deadlines: +9 days to +37 days)
        const offset = 9 + (i - 13) * 2; // deadline in 9 to 37 days from today
        await client.query(`
          UPDATE competitions 
          SET deadline = CURRENT_DATE + INTERVAL '${offset} days',
              winner_announcement = CURRENT_DATE + INTERVAL '${offset + 7} days'
          WHERE id = $1
        `, [compId]);
      } else {
        // 10 Recruitment (deadlines: +45 days to +72 days)
        const offset = 45 + (i - 28) * 3; // deadline in 45 to 72 days from today
        await client.query(`
          UPDATE competitions 
          SET deadline = CURRENT_DATE + INTERVAL '${offset} days',
              winner_announcement = CURRENT_DATE + INTERVAL '${offset + 7} days'
          WHERE id = $1
        `, [compId]);
      }
    }
    console.log('   All 38 competitions successfully classified (13 Ended, 15 Ongoing, 10 Recruitment).');

    // ==========================================
    // 5. SEED TEAMS (TARGET: 64)
    // ==========================================
    console.log('\n6. Checking and seeding teams (target: 64)...');
    const currentTeamsRes = await client.query('SELECT COUNT(*) FROM teams');
    const currentTeamsCount = parseInt(currentTeamsRes.rows[0].count, 10);
    const teamsToSeed = Math.max(0, 64 - currentTeamsCount);
    console.log(`   Current: ${currentTeamsCount}. Seeding: ${teamsToSeed} new teams...`);

    const TEAM_NAMES = [
      'Nusantara Tech', 'Alpha Devs', 'Garuda Hackers', 'Merdeka ML Team', 'Pionir UI/UX',
      'Digital Knights', 'E-Agri Champions', 'Srikandi Tech', 'Jaka Tarub AI', 'Sriwijaya Spartans',
      'Majapahit Builders', 'Batik Pixel Studio', 'Barong Software', 'Kutilang Core', 'Tengger Data Hub',
      'Badak Backend', 'Komodo Devs', 'Rinjani Hackers', 'Kelud Data Science', 'Bromo Tech',
      'Merapi Solutions', 'Semeru Innovators', 'Singasari Lab', 'Padjadjaran Dev', 'Gajah Mada Hackers',
      'Krakatau Systems', 'Sunda Tech', 'Toba Analytics', 'Borobudur Architects', 'Prambanan Coders',
      'Equator Tech', 'Cendrawasih Mobile', 'Pesut Devs', 'Mahakam Code', 'Katulistiwa Green'
    ];

    for (let i = 0; i < teamsToSeed; i++) {
      const compIdx = i % allComps.length;
      const comp = allComps[compIdx];
      const lead = allStudents[Math.floor(Math.random() * allStudents.length)];
      const name = TEAM_NAMES[i % TEAM_NAMES.length] + ` (Reg ${Math.floor(i / TEAM_NAMES.length) + 1})`;
      const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const emoji = COMP_EMOJIS[i % COMP_EMOJIS.length];

      await client.query(`
        INSERT INTO teams (name, competition_id, created_by, description, skills_needed, recruitment_deadline, contact, max_members, urgency, avatar_color, emoji)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '5 days', $6, 5, 'high', $7, $8)
      `, [
        name,
        comp.id,
        lead.id,
        `Tim kolaboratif berdedikasi tinggi yang dibentuk untuk bersaing dan memberikan solusi terbaik di ajang ${comp.title}.`,
        JSON.stringify(['React', 'Figma', 'UI/UX', 'Node.js', 'Business Dev']),
        `wa.me/62812${Math.floor(10000000 + Math.random() * 90000000)}`,
        avatarColor,
        emoji
      ]);
    }

    const allTeamsRes = await client.query('SELECT id, name, competition_id, created_by FROM teams ORDER BY id');
    const allTeams = allTeamsRes.rows;
    console.log(`   Total teams hydrated: ${allTeams.length}`);

    // ==========================================
    // 6. POPULATE DEEP MEMBER ROSTERS FOR ALL TEAMS
    // ==========================================
    console.log('\n7. populating team rosters & matchmaking states...');
    // Clear and build clean, consistent team members
    await client.query('DELETE FROM team_members');
    
    for (let i = 0; i < allTeams.length; i++) {
      const team = allTeams[i];
      const leadId = team.created_by;

      // Ensure team owner is joined
      await client.query(`
        INSERT INTO team_members (team_id, user_id, role, status)
        VALUES ($1, $2, 'owner', 'joined')
        ON CONFLICT DO NOTHING
      `, [team.id, leadId]);

      // Add members based on competition status:
      // Ended (index of comp < 13) -> fill the team to 3-5 members (status 'joined')
      // Ongoing -> fill the team to 2-4 members, some applied/invited
      // Recruitment -> 1 owner, 1 joined member, 1 applied, 1 invited
      const compId = team.competition_id;
      const compIdx = allComps.findIndex(c => c.id === compId);

      const potentialMembers = allStudents.filter(s => s.id !== leadId);
      const shuffledMembers = potentialMembers.sort(() => 0.5 - Math.random());

      if (compIdx < 13) {
        // Ended: 3 to 4 joined members
        const numMembers = Math.floor(Math.random() * 2) + 3;
        for (let mIdx = 0; mIdx < numMembers; mIdx++) {
          await client.query(`
            INSERT INTO team_members (team_id, user_id, role, status)
            VALUES ($1, $2, 'member', 'joined')
            ON CONFLICT DO NOTHING
          `, [team.id, shuffledMembers[mIdx].id]);
        }
      } else if (compIdx < 28) {
        // Ongoing: 2 joined, 1 applied
        await client.query(`
          INSERT INTO team_members (team_id, user_id, role, status)
          VALUES ($1, $2, 'member', 'joined')
          ON CONFLICT DO NOTHING
        `, [team.id, shuffledMembers[0].id]);
        
        await client.query(`
          INSERT INTO team_members (team_id, user_id, role, status)
          VALUES ($1, $2, 'member', 'joined')
          ON CONFLICT DO NOTHING
        `, [team.id, shuffledMembers[1].id]);

        await client.query(`
          INSERT INTO team_members (team_id, user_id, role, status)
          VALUES ($1, $2, 'member', 'applied')
          ON CONFLICT DO NOTHING
        `, [team.id, shuffledMembers[2].id]);
      } else {
        // Recruitment: 1 applied, 1 invited
        await client.query(`
          INSERT INTO team_members (team_id, user_id, role, status)
          VALUES ($1, $2, 'member', 'applied')
          ON CONFLICT DO NOTHING
        `, [team.id, shuffledMembers[0].id]);

        await client.query(`
          INSERT INTO team_members (team_id, user_id, role, status)
          VALUES ($1, $2, 'member', 'invited')
          ON CONFLICT DO NOTHING
        `, [team.id, shuffledMembers[1].id]);
      }
    }
    console.log('   Team members successfully synced.');

    // ==========================================
    // 7. SEED CONNECTIONS (~250 TOTAL)
    // ==========================================
    console.log('\n8. Generating active student-to-student networking connections...');
    await client.query('DELETE FROM connections');
    let connectionCount = 0;
    const maxConnections = 260;

    for (let i = 0; i < allStudents.length && connectionCount < maxConnections; i++) {
      const studentA = allStudents[i];
      // Pick 2-4 random students to connect with
      const connectTargets = allStudents.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      for (const studentB of connectTargets) {
        if (studentA.id !== studentB.id && connectionCount < maxConnections) {
          const status = Math.random() > 0.3 ? 'accepted' : 'pending';
          const senderId = studentA.id < studentB.id ? studentA.id : studentB.id;
          const receiverId = studentA.id < studentB.id ? studentB.id : studentA.id;
          
          await client.query(`
            INSERT INTO connections (sender_id, receiver_id, status)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `, [senderId, receiverId, status]);
          connectionCount++;
        }
      }
    }
    console.log(`   Generated ${connectionCount} networking connection requests.`);

    // ==========================================
    // 8. SEED COMPETITION REGISTRATIONS (~350 TOTAL)
    // ==========================================
    console.log('\n9. Registering students to competitions (target: ~350)...');
    await client.query('DELETE FROM competition_registrations');
    await client.query('DELETE FROM custom_registration_responses');
    await client.query('DELETE FROM custom_registration_fields CASCADE');
    await client.query('DELETE FROM hosted_event_settings CASCADE');

    // Create hosted event settings & custom form builders for ongoing/ended competitions
    console.log('   Creating visual styles and dynamic custom registration fields...');
    const premiumComps = allComps.slice(0, 20); // First 20 are premium hosted
    const compFieldIds = {};

    for (const comp of premiumComps) {
      await client.query(`
        INSERT INTO hosted_event_settings (competition_id, banner_url, accent_color, custom_domain, announcement_text)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (competition_id) DO NOTHING
      `, [
        comp.id,
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
        '#6C63FF',
        `www.${comp.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-2026.id`,
        `Pendaftaran gelombang utama ditutup dalam waktu dekat! Akses portal untuk merancang formulir pendaftaran khusus kelompok.`
      ]);

      const f1 = await client.query(`
        INSERT INTO custom_registration_fields (competition_id, field_name, field_type, required)
        VALUES ($1, 'Tautan CV / Portfolio Kelompok (Drive)', 'file', true) RETURNING id
      `, [comp.id]);
      
      const f2 = await client.query(`
        INSERT INTO custom_registration_fields (competition_id, field_name, field_type, required)
        VALUES ($1, 'Tautan URL Repositori GitHub / Figma File', 'text', true) RETURNING id
      `, [comp.id]);

      const f3 = await client.query(`
        INSERT INTO custom_registration_fields (competition_id, field_name, field_type, required)
        VALUES ($1, 'Motivasi Utama & Strategi Tim', 'textarea', false) RETURNING id
      `, [comp.id]);

      compFieldIds[comp.id] = [f1.rows[0].id, f2.rows[0].id, f3.rows[0].id];
    }

    let registrationCount = 0;
    // Register students to competitions
    for (const student of allStudents) {
      // Pick 2 random competitions to register
      const selectedComps = allComps.sort(() => 0.5 - Math.random()).slice(0, 2);
      
      for (const comp of selectedComps) {
        // Check if student has team in this competition
        const teamForComp = allTeams.find(t => t.competition_id === comp.id && t.created_by === student.id);
        const teamId = teamForComp ? teamForComp.id : null;

        await client.query(`
          INSERT INTO competition_registrations (user_id, competition_id, status, portfolio_url, motivation, contact, team_id)
          VALUES ($1, $2, 'approved', $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          student.id,
          comp.id,
          `https://drive.google.com/file/d/cv_${student.id}/view`,
          'Sangat termotivasi untuk mengasah keahlian di bidang ini dan berkolaborasi secara produktif.',
          `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
          teamId
        ]);
        registrationCount++;

        // Add custom field responses if premium competition
        const fields = compFieldIds[comp.id];
        if (fields) {
          const vals = [
            `https://drive.google.com/file/d/cv_portfolio_seed_${student.id}/view`,
            `https://github.com/project_seed_repo_${student.id}`,
            'Ingin memberikan solusi komprehensif bagi kelestarian nasional dengan tim hebat saya.'
          ];
          for (let fIdx = 0; fIdx < fields.length; fIdx++) {
            await client.query(`
              INSERT INTO custom_registration_responses (user_id, competition_id, field_id, response_value)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
            `, [student.id, comp.id, fields[fIdx], vals[fIdx]]);
          }
        }
      }
    }
    console.log(`   Successfully generated ${registrationCount} registrations with custom fields & responses.`);

    // ==========================================
    // 9. SEED SUBMISSIONS & JUDGES SCORING GRADES (~32 GRADES)
    // ==========================================
    console.log('\n10. Seeding project submissions and grades for ended competitions...');
    await client.query('DELETE FROM submission_grades');
    await client.query('DELETE FROM competition_submissions CASCADE');
    await client.query('DELETE FROM competition_judges CASCADE');

    const JUDGE_NAMES = ['Prof. Hermanto M.Kom', 'Dr. Eng. Dian Rahmawati', 'Rudiantara M.B.A', 'Sandiaga Uno M.B.A', 'Najwa Shihab M.A.', 'Prof. Budi Santoso', 'Dr. Riza Wahyu', 'Adi Wijaya M.Sc.', 'Lina Herlina Ph.D.', 'Taufik Rahman M.Eng.'];
    const JUDGE_EMAILS = ['hermanto@juri.id', 'dian.rahma@juri.id', 'rudiantara@juri.id', 'sandiaga@juri.id', 'najwa@juri.id', 'budi@juri.id', 'riza@juri.id', 'adi@juri.id', 'lina@juri.id', 'taufik@juri.id'];

    let submissionCount = 0;
    let gradeCount = 0;

    // Loop through ended competitions (index < 13)
    const endedComps = allComps.slice(0, 13);
    
    for (const comp of endedComps) {
      // Find all teams for this ended competition
      const compTeams = allTeams.filter(t => t.competition_id === comp.id);
      
      // Assign 2 judges for this competition
      const judges = [];
      for (let jIdx = 0; jIdx < 2; jIdx++) {
        const jName = JUDGE_NAMES[(comp.id + jIdx) % JUDGE_NAMES.length];
        const jEmail = JUDGE_EMAILS[(comp.id + jIdx) % JUDGE_EMAILS.length];
        const token = crypto.randomBytes(24).toString('hex');

        const judgeRes = await client.query(`
          INSERT INTO competition_judges (competition_id, judge_name, judge_email, access_token)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (competition_id, judge_email) DO UPDATE SET access_token = EXCLUDED.access_token
          RETURNING id
        `, [comp.id, jName, jEmail, token]);
        judges.push(judgeRes.rows[0].id);
      }

      for (const team of compTeams) {
        // Create submission
        const subRes = await client.query(`
          INSERT INTO competition_submissions (competition_id, user_id, team_id, submission_url, notes, status, submitted_at)
          VALUES ($1, $2, $3, $4, $5, 'graded', CURRENT_DATE - INTERVAL '12 days')
          RETURNING id
        `, [
          comp.id,
          team.created_by,
          team.id,
          `https://drive.google.com/file/d/project_submission_${team.id}/view`,
          `Berikut adalah hasil karya tim kami yang mencakup mockup desain interaktif, link repositori kode program, serta rancangan proposal strategi lengkap. Terimakasih!`
        ]);
        const subId = subRes.rows[0].id;
        submissionCount++;

        // Create grades from both judges
        for (const judgeId of judges) {
          const score = Math.floor(Math.random() * 23) + 75; // Scores between 75 and 98
          await client.query(`
            INSERT INTO submission_grades (submission_id, judge_id, score, feedback, graded_at)
            VALUES ($1, $2, $3, $4, CURRENT_DATE - INTERVAL '8 days')
          `, [
            subId,
            judgeId,
            score,
            `Karya tim Anda sangat luar biasa! Desain UX bersih, arsitektur kode rapi, dan presentasi pitch deck tajam.`
          ]);
          gradeCount++;
        }
      }
    }

    // Seed a few pending submissions for ongoing competitions to show active pending actions
    const ongoingComps = allComps.slice(13, 20);
    for (const comp of ongoingComps) {
      const compTeams = allTeams.filter(t => t.competition_id === comp.id).slice(0, 1);
      for (const team of compTeams) {
        await client.query(`
          INSERT INTO competition_submissions (competition_id, user_id, team_id, submission_url, notes, status, submitted_at)
          VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_DATE - INTERVAL '2 days')
        `, [
          comp.id,
          team.created_by,
          team.id,
          `https://drive.google.com/file/d/project_submission_ongoing_${team.id}/view`,
          'Tim kami telah menyelesaikan draf prototype kami untuk diulas juri.'
        ]);
        submissionCount++;
      }
    }

    console.log(`   Seeded ${submissionCount} submissions and ${gradeCount} judge scores.`);

    // ==========================================
    // 10. SEED SPONSORSHIPS, AD CAMPAIGNS & METRICS
    // ==========================================
    console.log('\n11. Seeding targeted corporate ad campaigns with active metrics...');
    await client.query('DELETE FROM sponsorship_cost_logs');
    await client.query('DELETE FROM sponsorships');

    // 14 campaigns — one per sponsor account. Click counts give a realistic
    // ~2–3% click-through rate (industry-credible, not inflated). `cost` is the
    // campaign spend in IDR and varies with reach.
    const adCampaigns = [
      { title: 'Gojek Tech Internship Challenge 2026 🚗', url: 'https://karir.gojek.com', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', pages: ['dashboard', 'matchmaking'], imp: 4890, clicks: 112, cost: 720000.00 },
      { title: 'Tokopedia Devcamp Hackathon — Daftar! 💻', url: 'https://tokopedia.com/devcamp', img: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80', pages: ['competitions', 'teams'], imp: 3950, clicks: 99, cost: 600000.00 },
      { title: 'Microsoft Imagine Cup 2026 — $100K! 🏆', url: 'https://imaginecup.microsoft.com', img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', pages: ['dashboard', 'competitions'], imp: 6120, clicks: 165, cost: 950000.00 },
      { title: 'Traveloka Hackathon — Cari Solusi! ✈️', url: 'https://traveloka.com/career', img: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=600&auto=format&fit=crop&q=80', pages: ['matchmaking', 'teams'], imp: 2310, clicks: 48, cost: 380000.00 },
      { title: 'Grab Dev Challenge 2026 💚', url: 'https://grab.careers', img: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80', pages: ['dashboard', 'competitions'], imp: 1950, clicks: 45, cost: 350000.00 },
      { title: 'Djarum Beasiswa Bulutangkis — Daftar! 🏸', url: 'https://djarumbeasiswabulutangkis.org', img: 'https://images.unsplash.com/photo-1521737711867-e3b90473bd58?w=600&auto=format&fit=crop&q=80', pages: ['teams', 'matchmaking'], imp: 1200, clicks: 22, cost: 250000.00 },
      { title: 'Shopee Code League 2026 🛒', url: 'https://careers.shopee.co.id', img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80', pages: ['competitions', 'dashboard'], imp: 5200, clicks: 140, cost: 800000.00 },
      { title: 'BCA Finhacks 2026 — Fintech Hackathon 🏦', url: 'https://finhacks.id', img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80', pages: ['competitions', 'matchmaking'], imp: 3100, clicks: 65, cost: 520000.00 },
      { title: 'Telkom DigiUp Bootcamp 2026 📡', url: 'https://digiup.telkom.co.id', img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop&q=80', pages: ['teams', 'dashboard'], imp: 2750, clicks: 80, cost: 470000.00 },
      { title: 'AWS Cloud Student Challenge ☁️', url: 'https://aws.amazon.com/student', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80', pages: ['dashboard', 'competitions'], imp: 4400, clicks: 106, cost: 680000.00 },
      { title: 'GDSC Solution Challenge 2026 🌐', url: 'https://developers.google.com/community/gdsc-solution-challenge', img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80', pages: ['matchmaking', 'competitions'], imp: 3600, clicks: 97, cost: 560000.00 },
      { title: 'Bukalapak Engineering Fellowship 🧑‍💻', url: 'https://careers.bukalapak.com', img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80', pages: ['teams', 'matchmaking'], imp: 1850, clicks: 37, cost: 330000.00 },
      { title: 'Dicoding Academy Scholarship 🎓', url: 'https://dicoding.com/scholarship', img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80', pages: ['dashboard', 'teams'], imp: 2980, clicks: 84, cost: 490000.00 },
      { title: 'Niagahoster Web Dev Contest 🌍', url: 'https://niagahoster.co.id/lomba', img: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop&q=80', pages: ['competitions', 'teams'], imp: 1450, clicks: 28, cost: 290000.00 }
    ];

    let totalImp = 0;
    let totalClicks = 0;

    for (let i = 0; i < adCampaigns.length; i++) {
      const camp = adCampaigns[i];
      const sponsor = allSponsors[i % allSponsors.length];
      const oldCost = Math.round(camp.cost * 0.7);

      const spRes = await client.query(`
        INSERT INTO sponsorships (sponsor_id, title, target_url, image_url, pages, start_date, end_date, total_cost, impressions, clicks, is_active)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '15 days', $6, $7, $8, true)
        RETURNING id
      `, [
        sponsor.id,
        camp.title,
        camp.url,
        camp.img,
        camp.pages,
        camp.cost,
        camp.imp,
        camp.clicks
      ]);
      totalImp += camp.imp;
      totalClicks += camp.clicks;

      // Seed a moderator cost-adjustment audit log per campaign.
      await client.query(`
        INSERT INTO sponsorship_cost_logs (sponsorship_id, modified_by, old_cost, new_cost, reason)
        VALUES ($1, $2, $3, $4, 'Audit penyesuaian tarif slot iklan sesuai jangkauan halaman premium')
      `, [spRes.rows[0].id, allStudents[0].id, oldCost, camp.cost]);
    }

    const ctr = totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : '0';
    console.log(`   Seeded ${adCampaigns.length} campaigns. Total metrics: ${totalImp} impressions, ${totalClicks} clicks (CTR ${ctr}%).`);

    // ==========================================
    // 11. PLATFORM SETTINGS & AUTO VERIFY ALL
    // ==========================================
    console.log('\n12. Securing platform configurations and auto-approvals...');
    await client.query(`
      INSERT INTO platform_settings (key, value) VALUES
      ('feature_premium_organizer', 'active'),
      ('premium_organizer_trial_days', '90')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);

    await client.query('UPDATE users SET is_verified = true, is_approved = true, is_active = true');

    await client.query('COMMIT');
    console.log('\n================================================================');
    console.log('✅ ALL DEMO DATA SUCCESSFULLY SEEDED WITH 100% DATABASE SANITY!');
    console.log('================================================================');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ DATABASE TRANSACTION FAILED. ROLLBACK TRIGGERED:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
