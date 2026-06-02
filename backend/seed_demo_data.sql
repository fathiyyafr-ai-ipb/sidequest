-- SQL Seed Script for Supabase SideQuest Demo Data
-- Populate Competitions, Teams, and Team Members matching the existing Users

-- 1. Clean old demo data (Zero-Downtime Safe Cascade)
TRUNCATE TABLE 
  team_members, 
  teams, 
  saved_competitions, 
  competition_registrations, 
  notifications, 
  connections, 
  competitions 
RESTART IDENTITY CASCADE;

-- 2. Seed 20 Curated Competitions
INSERT INTO competitions 
  (id, category_id, title, organizer, deadline, tags, color_gradient, emoji, is_free, prize, description)
VALUES
  -- TEKNOLOGI (cat_id=1)
  (1, 1, 'Gemastik XVII — Pengembangan Perangkat Lunak', 'Kemendikbud Ristek RI', '2026-06-30', '["Teknologi","Nasional"]', 'from-primary to-purple-500', '🏆', true, 'Medali + Uang Pembinaan', 'Kompetisi TIK mahasiswa nasional bidang software development. Sangat bergengsi.'),
  (2, 1, 'Hackathon Nasional 2026 — Smart City', 'Kemenkominfo', '2026-07-10', '["Teknologi","Hackathon"]', 'from-blue-500 to-primary', '🌆', true, 'Rp 25 Juta', 'Hackathon 48 jam membangun solusi smart city inovatif berbasis IoT.'),
  (3, 1, 'Google Solution Challenge 2026', 'Google Developer Student Clubs', '2026-07-15', '["Teknologi","Global"]', 'from-red-400 to-orange-400', '⚡', true, 'Mentoring global & USD 3,000', 'Bangun solusi untuk SDGs PBB menggunakan teknologi Google.'),
  (4, 1, 'ICPC Asia Regional 2026', 'ACM International Collegiate Programming Contest', '2026-08-01', '["Teknologi","Programming"]', 'from-indigo-500 to-blue-600', '💻', false, 'Rp 10 Juta', 'Kompetisi pemrograman kompetitif tingkat Asia Pasifik untuk tim mahasiswa.'),
  (5, 1, 'Microsoft Imagine Cup 2026', 'Microsoft', '2026-08-20', '["Teknologi","Inovasi"]', 'from-blue-400 to-cyan-500', '🪟', true, 'USD 100,000', 'Kompetisi inovasi teknologi terbesar dari Microsoft untuk mahasiswa.'),
  (6, 1, 'AWS Build On ASEAN 2026', 'Amazon Web Services', '2026-09-05', '["Teknologi","Cloud"]', 'from-orange-400 to-yellow-400', '☁️', true, 'USD 25,000', 'Bangun solusi cloud AWS untuk tantangan industri di ASEAN.'),

  -- BISNIS (cat_id=2)
  (7, 2, 'ASEAN Business Plan Competition 2026', 'ASEAN Youth Council', '2026-06-25', '["Bisnis","ASEAN"]', 'from-orange-400 to-accent', '💼', false, 'Rp 15 Juta', 'Kompetisi rencana bisnis tingkat regional untuk mahasiswa se-ASEAN.'),
  (8, 2, 'Startup Weekend Jakarta 2026', 'Techstars × ANGIN', '2026-07-20', '["Bisnis","Startup"]', 'from-yellow-400 to-orange-400', '🚀', false, 'Mentoring + Pendanaan', '54 jam membangun ide bisnis mentah menjadi prototype siap pitching.'),
  (9, 2, 'Young Entrepreneur Challenge 2026', 'HIPMI', '2026-08-05', '["Bisnis","Wirausaha"]', 'from-emerald-400 to-green-500', '💰', false, 'Rp 50 Juta', 'Pencarian wirausaha muda terbaik nasional dari jaringan HIPMI.'),
  (10, 2, 'Idea-thon Kewirausahaan Nasional', 'Kemenparekraf', '2026-09-01', '["Bisnis","Kreatif"]', 'from-pink-400 to-rose-500', '💡', true, 'Rp 30 Juta', 'Kompetisi ide bisnis inovatif berbasis pariwisata & ekonomi kreatif.'),

  -- SOSIAL (cat_id=3)
  (11, 3, 'Hult Prize 2026 — Campus Round', 'Hult International Business School', '2026-06-15', '["Social Impact","Internasional"]', 'from-green-400 to-teal-500', '🌱', true, 'Golden Ticket to Regional', 'Kompetisi wirausaha sosial bertaraf internasional terbesar di dunia.'),
  (12, 3, 'Youth Innovation Challenge 2026', 'UNDP Indonesia', '2026-07-28', '["Social Impact","SDGs"]', 'from-teal-400 to-cyan-500', '🌍', true, 'USD 5,000', 'Inovasi sosial mahasiswa menjawab tantangan SDGs di Indonesia.'),
  (13, 3, 'Sociopreneur Competition IYREF 2026', 'Indonesia Youth Renewable Energy Forum', '2026-08-10', '["Social Impact","Energi"]', 'from-lime-400 to-green-500', '♻️', true, 'Rp 20 Juta', 'Kompetisi wirausaha sosial berbasis transisi energi terbarukan.'),

  -- DESAIN (cat_id=4)
  (14, 4, 'National UI/UX Design Challenge', 'Tokopedia × Google DSC', '2026-06-28', '["Desain","UI/UX"]', 'from-pink-400 to-purple-400', '🎨', true, 'Rp 10 Juta', 'Kompetisi mendesain antarmuka & pengalaman pengguna e-commerce masa depan.'),
  (15, 4, 'Redot Design Award 2026', 'Red Dot GmbH & Co. KG', '2026-08-15', '["Desain","Internasional"]', 'from-red-500 to-pink-500', '🔴', false, 'Trophy + Winner Label', 'Penghargaan desain produk & konsep bergengsi tingkat dunia.'),
  (16, 4, 'Compfest UI Design Competition', 'Fasilkom UI', '2026-07-05', '["Desain","UI/UX","Nasional"]', 'from-violet-500 to-purple-600', '🖌️', true, 'Rp 15 Juta', 'Kompetisi desain UI/UX bergengsi skala nasional dari Universitas Indonesia.'),

  -- SAINS (cat_id=5)
  (17, 5, 'Lomba Karya Tulis Ilmiah Nasional', 'ITS Surabaya', '2026-07-30', '["Sains","Ilmiah"]', 'from-cyan-500 to-blue-500', '🔬', false, 'Rp 10 Juta', 'LKTIN riset inovatif multidisiplin untuk solusi masa depan.'),
  (18, 5, 'Physics Olympiad Tingkat Mahasiswa 2026', 'HFI (Himpunan Fisika Indonesia)', '2026-08-20', '["Sains","Fisika"]', 'from-sky-400 to-blue-500', '⚛️', false, 'Rp 10 Juta', 'Olimpiade fisika mahasiswa bergengsi untuk menguji batas analitik.'),
  (19, 5, 'Pagelaran Mahasiswa Nasional (GEMASTIK) Sains Data', 'Kemendikbud', '2026-07-15', '["Sains","Data Science"]', 'from-cyan-400 to-teal-400', '📊', true, 'Medali Gemastik', 'Kompetisi nasional pengolahan sains data dalam rangkaian Gemastik.'),
  (20, 5, 'National Science Bowl Indonesia 2026', 'BRIN (Badan Riset dan Inovasi Nasional)', '2026-09-15', '["Sains","Multidisiplin"]', 'from-blue-500 to-indigo-600', '🧪', true, 'Rp 25 Juta', 'Kompetisi trivia & pemecahan kasus sains multidisiplin nasional.');

ALTER SEQUENCE competitions_id_seq RESTART WITH 21;

-- 3. Seed 9 Curated Teams (matching the exact User IDs from schema.sql)
INSERT INTO teams 
  (id, name, competition_id, created_by, description, skills_needed, recruitment_deadline, contact, max_members, urgency, avatar_color, emoji) 
VALUES 
  -- 1. team Metaverse (created by user 1, Fathiyya)
  (1, 'team Metaverse', 1, 1, 'Membangun platform metaverse inovatif berskala nasional. Fokus pada interaksi sosial 3D.', '["Next.js", "Solidity"]', '2026-06-29', 'wa.me/628111', 4, 'normal', 'bg-primary', '🏆'),
  
  -- 2. Tim Nebula (created by user 8, Evan)
  (2, 'Tim Nebula', 1, 8, 'Tim solid dari UI, sudah punya konsep produk matang. Butuh frontend dev ahli & desainer berpengalaman.', '["Frontend Dev", "UI/UX"]', '2026-06-25', 'wa.me/628111', 5, 'hot', 'bg-primary', '💻'),
  
  -- 3. Tim Bisnis Muda (created by user 6, Citra)
  (3, 'Tim Bisnis Muda', 7, 6, 'Tim dari FEB UGM. Rencana bisnis bertema sirkular ekonomi. Butuh analis keuangan & presentasi.', '["Financial Analyst", "Presenter"]', '2026-06-20', 'discord.gg/bizmuda', 4, 'normal', 'bg-orange-500', '💼'),
  
  -- 4. Tim Hult Hijau (created by user 5, Bimo)
  (4, 'Tim Hult Hijau', 11, 5, 'Tim fokus SDGs poin 13 (iklim). Butuh periset sosial dan orang yang jago presentasi/pitching.', '["Social Researcher", "Presenter"]', '2026-06-12', 'line: hultgreen', 5, 'hot', 'bg-green-500', '🌱'),
  
  -- 5. Tim Pixel Perfect (created by user 4, Aurel)
  (5, 'Tim Pixel Perfect', 14, 4, 'UX designer berpengalaman dari Telkom mencari partner UI designer & illustrator digital.', '["UI Designer", "Illustrator"]', '2026-06-20', 'wa.me/628222', 3, 'normal', 'bg-pink-500', '🎨'),
  
  -- 6. Tim Quanta (created by user 7, Dimas)
  (6, 'Tim Quanta', 18, 7, 'Tim riset fisika dari ITB. Butuh anggota dengan basis teori kuat mekanika & numerik.', '["Fisika", "Matematika"]', '2026-07-15', 'wa.me/628333', 4, 'normal', 'bg-blue-500', '⚛️'),
  
  -- 7. Tim DataStorm (created by user 5, Bimo)
  (7, 'Tim DataStorm', 19, 5, 'Tim ML dari ITS, sudah punya dataset & baseline model. Butuh data engineer & data visualizer.', '["Machine Learning", "Python", "Data Viz"]', '2026-07-10', 'discord.gg/datastorm', 4, 'hot', 'bg-violet-500', '📊'),
  
  -- 8. Tim Sociopreneur (created by user 9, Farah)
  (8, 'Tim Sociopreneur', 12, 9, 'Tim mahasiswa beda kampus yg peduli isu sosial. Mencari business developer antusias.', '["Community Org", "Business Dev", "Social Media"]', '2026-07-20', 'ig: @sociopreneur.id', 5, 'normal', 'bg-teal-500', '🌍'),
  
  -- 9. Tim Hackstar (created by user 8, Evan)
  (9, 'Tim Hackstar', 2, 8, 'Tim hackathon pemenang 2x kompetisi. Butuh backend engineer yang andal di AWS cloud.', '["Backend Dev", "IoT", "Cloud AWS"]', '2026-07-05', 'wa.me/628444', 4, 'hot', 'bg-cyan-600', '🌆');

ALTER SEQUENCE teams_id_seq RESTART WITH 10;

-- 4. Seed Team Members (matching the exact relationships from local seed)
INSERT INTO team_members 
  (team_id, user_id, role, status) 
VALUES 
  -- 1. team Metaverse
  (1, 1, 'owner', 'joined'),
  (1, 2, 'member', 'joined'),
  
  -- 2. Tim Nebula
  (2, 8, 'owner', 'joined'),
  (2, 9, 'member', 'joined'),
  (2, 7, 'member', 'joined'),
  
  -- 3. Tim Bisnis Muda
  (3, 6, 'owner', 'joined'),
  (3, 7, 'member', 'joined'),
  
  -- 4. Tim Hult Hijau
  (4, 5, 'owner', 'joined'),
  (4, 4, 'member', 'joined'),
  (4, 6, 'member', 'joined'),
  
  -- 5. Tim Pixel Perfect
  (5, 4, 'owner', 'joined'),
  
  -- 6. Tim Quanta
  (6, 7, 'owner', 'joined'),
  (6, 4, 'member', 'joined'),
  
  -- 7. Tim DataStorm
  (7, 5, 'owner', 'joined'),
  (7, 7, 'member', 'joined'),
  
  -- 8. Tim Sociopreneur
  (8, 9, 'owner', 'joined'),
  (8, 6, 'member', 'joined'),
  
  -- 9. Tim Hackstar
  (9, 8, 'owner', 'joined'),
  (9, 5, 'member', 'joined');

-- 5. Post-seed Mapping: Link organizer_id to competitions using seeded organizer accounts
UPDATE competitions c
SET organizer_id = u.id
FROM users u
WHERE TRIM(c.organizer) = TRIM(u.name) AND u.role = 'organizer';

-- 6. Post-seed Fallbacks: Ensure all metadata parameters are fully hydrated
UPDATE competitions 
SET min_members = COALESCE(min_members, 1),
    max_members = COALESCE(max_members, 5),
    registration_model = COALESCE(registration_model, 'hosted'),
    winner_announcement = COALESCE(winner_announcement, (deadline + INTERVAL '7 days')::text)
WHERE min_members IS NULL OR max_members IS NULL OR registration_model IS NULL OR winner_announcement IS NULL;

-- 7. Log success
SELECT 'SUCCESSFULLY SEEDED SIDEQUEST DEMO DATA (20 COMPETITIONS, 9 TEAMS, AND RELATIONSHIPS)' as status_message;
