const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'sidequest2',
  password: 'PIa1234!',
  port: 5432
});

async function seed() {
  await client.connect();

  // Hapus data lama dan reset sequence
  await client.query(`DELETE FROM competitions`);
  await client.query(`DELETE FROM categories`);
  await client.query(`ALTER SEQUENCE categories_id_seq RESTART WITH 1`);
  await client.query(`ALTER SEQUENCE competitions_id_seq RESTART WITH 1`);

  // Insert kategori
  await client.query(`
    INSERT INTO categories (slug, name) VALUES 
    ('teknologi',    'Teknologi'),
    ('bisnis',       'Bisnis'),
    ('sosial',       'Social Impact'),
    ('desain',       'Desain'),
    ('sains',        'Sains')
  `);

  // Insert 20 lomba dari berbagai kategori
  await client.query(`
    INSERT INTO competitions 
      (category_id, title, organizer, deadline, tags, color_gradient, emoji, is_free, prize, description)
    VALUES
      -- TEKNOLOGI (cat_id=1)
      (1, 'Gemastik XVII — Pengembangan Perangkat Lunak', 'Kemendikbud Ristek RI',
       '2026-05-14', '["Teknologi","Nasional"]',
       'from-primary to-purple-500', '🏆', true, null,
       'Kompetisi TIK mahasiswa nasional. Bidang PPL: web, mobile, desktop.'),

      (1, 'Hackathon Nasional 2026 — Smart City', 'Kemenkominfo',
       '2026-06-10', '["Teknologi","Hackathon"]',
       'from-blue-500 to-primary', '🌆', true, null,
       'Hackathon 48 jam membangun solusi smart city inovatif.'),

      (1, 'Google Solution Challenge 2026', 'Google Developer Student Clubs',
       '2026-07-15', '["Teknologi","Global"]',
       'from-red-400 to-orange-400', '⚡', true, null,
       'Bangun solusi untuk SDGs menggunakan teknologi Google.'),

      (1, 'ICPC Asia Regional 2026', 'ACM International Collegiate Programming Contest',
       '2026-08-01', '["Teknologi","Programming"]',
       'from-indigo-500 to-blue-600', '💻', false, 'Rp 10 Juta',
       'Kompetisi pemrograman kompetitif tingkat Asia untuk tim mahasiswa.'),

      (1, 'Microsoft Imagine Cup 2026', 'Microsoft',
       '2026-08-20', '["Teknologi","Inovasi"]',
       'from-blue-400 to-cyan-500', '🪟', true, 'USD 100,000',
       'Kompetisi inovasi teknologi terbesar dari Microsoft untuk mahasiswa.'),

      (1, 'AWS Build On ASEAN 2026', 'Amazon Web Services',
       '2026-09-05', '["Teknologi","Cloud"]',
       'from-orange-400 to-yellow-400', '☁️', true, 'USD 25,000',
       'Bangun solusi berbasis cloud AWS untuk permasalahan nyata di ASEAN.'),

      -- BISNIS (cat_id=2)
      (2, 'ASEAN Business Plan Competition 2026', 'ASEAN Youth Council',
       '2026-05-21', '["Bisnis","ASEAN"]',
       'from-orange-400 to-accent', '💼', false, 'Rp 500rb',
       'Kompetisi rencana bisnis tingkat ASEAN untuk mahasiswa.'),

      (2, 'Startup Weekend Jakarta 2026', 'Techstars × ANGIN',
       '2026-07-20', '["Bisnis","Startup"]',
       'from-yellow-400 to-orange-400', '🚀', false, 'Mentoring',
       '54 jam dari ide ke pitch deck. Gabung komunitas startup terbaik.'),

      (2, 'Young Entrepreneur Challenge 2026', 'HIPMI',
       '2026-06-15', '["Bisnis","Wirausaha"]',
       'from-emerald-400 to-green-500', '💰', false, 'Rp 50 Juta',
       'Kompetisi wirausaha muda terbaik nasional dari HIPMI.'),

      (2, 'Idea-thon Kewirausahaan Nasional', 'Kemenparekraf',
       '2026-07-01', '["Bisnis","Kreatif"]',
       'from-pink-400 to-rose-500', '💡', true, 'Rp 30 Juta',
       'Kompetisi ide bisnis inovatif berbasis ekonomi kreatif.'),

      -- SOSIAL (cat_id=3)
      (3, 'Hult Prize 2026 — Campus Round', 'Hult International Business School',
       '2026-06-03', '["Social Impact","Internasional"]',
       'from-green-400 to-teal-500', '🌱', true, null,
       'Kompetisi startup sosial terbesar di dunia untuk mahasiswa.'),

      (3, 'Youth Innovation Challenge 2026', 'UNDP Indonesia',
       '2026-06-28', '["Social Impact","SDGs"]',
       'from-teal-400 to-cyan-500', '🌍', true, 'USD 5,000',
       'Kompetisi inovasi sosial untuk menjawab tantangan SDGs di Indonesia.'),

      (3, 'Sociopreneur Competition IYREF 2026', 'Indonesia Youth Renewable Energy Forum',
       '2026-07-10', '["Social Impact","Energi"]',
       'from-lime-400 to-green-500', '♻️', true, 'Rp 20 Juta',
       'Kompetisi kewirausahaan sosial berbasis energi terbarukan.'),

      -- DESAIN (cat_id=4)
      (4, 'National UI/UX Design Challenge', 'Tokopedia × Google DSC',
       '2026-06-25', '["Desain","UI/UX"]',
       'from-pink-400 to-purple-400', '🎨', true, null,
       'Desain pengalaman pengguna terbaik untuk platform e-commerce.'),

      (4, 'Redot Design Award 2026', 'Red Dot GmbH & Co. KG',
       '2026-08-15', '["Desain","Internasional"]',
       'from-red-500 to-pink-500', '🔴', false, 'Trophy + Lisensi',
       'Penghargaan desain bergengsi tingkat internasional untuk karya inovatif.'),

      (4, 'Compfest UI Design Competition', 'Fasilkom UI',
       '2026-07-05', '["Desain","UI/UX","Nasional"]',
       'from-violet-500 to-purple-600', '🖌️', true, 'Rp 15 Juta',
       'Kompetisi desain UI/UX bergengsi dari Fasilkom Universitas Indonesia.'),

      -- SAINS (cat_id=5)
      (5, 'Lomba Karya Tulis Ilmiah Nasional', 'ITS Surabaya',
       '2026-06-30', '["Sains","Ilmiah"]',
       'from-cyan-500 to-blue-500', '🔬', false, 'Rp 200rb',
       'LKTIN bidang teknologi, sains, dan inovasi untuk mahasiswa.'),

      (5, 'Physics Olympiad Tingkat Mahasiswa 2026', 'HFI (Himpunan Fisika Indonesia)',
       '2026-07-20', '["Sains","Fisika"]',
       'from-sky-400 to-blue-500', '⚛️', false, 'Rp 10 Juta',
       'Olimpiade fisika mahasiswa tingkat nasional yang bergengsi.'),

      (5, 'Pagelaran Mahasiswa Nasional (GEMASTIK) Sains Data', 'Kemendikbud',
       '2026-08-10', '["Sains","Data Science"]',
       'from-cyan-400 to-teal-400', '📊', true, null,
       'Kompetisi sains data nasional dalam rangkaian GEMASTIK XVII.'),

      (5, 'National Science Bowl Indonesia 2026', 'BRIN (Badan Riset dan Inovasi Nasional)',
       '2026-09-15', '["Sains","Multidisiplin"]',
       'from-blue-500 to-indigo-600', '🧪', true, 'Rp 25 Juta',
       'Kompetisi sains multidisiplin untuk mahasiswa Indonesia.')
  `);

  console.log('✅ Seed selesai: 5 kategori + 20 lomba berhasil dimasukkan.');

  // Clean and Seed Team Data
  console.log('Seeding demo team and members...');
  await client.query(`DELETE FROM team_members`);
  await client.query(`DELETE FROM teams`);
  await client.query(`ALTER SEQUENCE teams_id_seq RESTART WITH 1`);

  await client.query(`
    INSERT INTO teams (id, name, competition_id, created_by) VALUES 
    (1, 'team Metaverse', 1, 1)
  `);
  await client.query(`ALTER SEQUENCE teams_id_seq RESTART WITH 2`);

  await client.query(`
    INSERT INTO team_members (team_id, user_id, role, status) VALUES 
    (1, 1, 'owner', 'joined'),
    (1, 2, 'member', 'joined')
  `);
  console.log('✅ Seeding team data selesai.');

  await client.end();
}

seed().catch(e => {
  console.error('❌ Error saat seed:', e.message);
  client.end();
});
