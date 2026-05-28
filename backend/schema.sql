-- Schema untuk database sidequest2

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  organizer VARCHAR(200),
  deadline DATE,
  tags JSONB,
  color_gradient VARCHAR(100),
  emoji VARCHAR(10),
  is_free BOOLEAN DEFAULT true,
  prize VARCHAR(100),
  description TEXT
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  university VARCHAR(100),
  prodi VARCHAR(100),
  avatar_color VARCHAR(20),
  bio TEXT,
  role VARCHAR(20) DEFAULT 'peserta',
  experience JSONB,
  achievements JSONB,
  online BOOLEAN DEFAULT false
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  skills_needed JSONB,
  recruitment_deadline DATE,
  contact VARCHAR(100),
  max_members INT DEFAULT 5,
  urgency VARCHAR(20) DEFAULT 'normal',
  avatar_color VARCHAR(50) DEFAULT 'bg-primary',
  emoji VARCHAR(10) DEFAULT '💻'
);

CREATE TABLE team_members (
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('joined', 'invited', 'applied')),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE saved_competitions (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, competition_id)
);

CREATE TABLE competition_registrations (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, competition_id)
);

CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  tag_class VARCHAR(50)
);

CREATE TABLE user_skills (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  team_id INT REFERENCES teams(id) ON DELETE SET NULL,
  applicant_id INT REFERENCES users(id) ON DELETE SET NULL
);

-- Seed Data Awal
INSERT INTO categories (slug, name) VALUES 
('ui-ux', 'UI/UX Design'), 
('data-science', 'Data Science'), 
('web-dev', 'Web Development');

-- Seed Users (Fathiyya, Aqilah, Gilbran, and Matchmaker Candidates)
INSERT INTO users (name, email, password, university, prodi, avatar_color, bio, role, experience, achievements, online) VALUES 
('Fathiyya Fitriani Refananda', 'fathiyya@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Artificial Intelligence', 'bg-blue-500', 'Mahasiswa tingkat akhir yang menyukai AI dan Web Dev.', 'peserta', '["Hackathon Nasional 2025 — Juara 2", "Hult Prize Campus Round 2025 — Top 10", "Ksatria Data UI 2024 — Peserta"]', '["Ksatria Data 2024 — Juara 1 Kategori ML", "Dokumentasi Terbaik — Gemastik XVI 2024", "Google DSC Speaker"]', true),
('Aqilah Callysta Abygail Febyan', 'aqilah@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Software Engineering', 'bg-purple-500', 'Mahasiswa yang tertarik dengan frontend development.', 'peserta', '["Web Dev Competition 2025 — Finalist", "UI/UX Design Challenge — Juara 3"]', '["Best UI Design", "Frontend Champion"]', true),
('M. Gilbran Firdiansyah', 'gilbran@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Computer Science', 'bg-green-500', 'Mahasiswa backend developer pemula.', 'peserta', '["Belum memiliki riwayat lomba resmi"]', '["Sertifikat Backend Dev Dicoding", "Hackerrank SQL Gold Badge"]', true),
('Aurel Salsabila', 'aurel@itb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'ITB Bandung', 'Sistem dan Teknologi Informasi', 'bg-purple-500', 'UI/UX Designer yang berfokus pada riset pengguna.', 'peserta', '["Hult Prize 2025 — Juara 1", "COMPFEST Design Finalist"]', '["Ksatria Data", "Dokumentasi Terbaik"]', true),
('Bimo Prasetyo', 'bimo@its.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'ITS Surabaya', 'Teknik Komputer', 'bg-blue-500', 'Backend Developer yang menyukai DevOps.', 'peserta', '["Gemastik XVI — Juara 2", "Hackathon Smart City 2025"]', '["Hackaton Champion", "Ksatria Data"]', true),
('Citra Dewi', 'citra@ugm.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Gadjah Mada', 'Manajemen', 'bg-green-500', 'Business Developer yang menyukai ide startup.', 'peserta', '["ASEAN BPC 2025 — Finalist", "Startup Weekend 2024"]', '["Best Pitch Award", "Top Presenter"]', false),
('Dimas Arfian', 'dimas@binus.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'BINUS University', 'Computer Science', 'bg-orange-500', 'Machine Learning Engineer dengan fokus Deep Learning.', 'peserta', '["Kaggle Competition — Top 5%", "Data Olympiad 2025"]', '["Ksatria Data", "Kaggle Expert"]', true),
('Evan Wijaya', 'evan@ui.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas UI', 'Ilmu Komputer', 'bg-cyan-500', 'Frontend Developer dengan fokus React/TypeScript.', 'peserta', '["Google DSC Lead 2025", "Web Dev Competition — Juara 1"]', '["Best Developer", "Google Badge"]', true),
('Farah Nadia', 'farah@telkom.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Telkom University', 'Desain Komunikasi Visual', 'bg-pink-500', 'UI/UX Designer dan Illustrator digital.', 'peserta', '["Redot Design Award 2024", "COMPFEST Design — Juara 2"]', '["Best Design", "Creative Award"]', false),
('Galih Permana', 'galih@ub.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Brawijaya', 'Sistem Informasi', 'bg-indigo-500', 'Kandidat Backend Developer yang suka tantangan.', 'peserta', '["Gemastik XVI — Peserta", "INAICTA 2024 Finalist"]', '["Inovator Muda"]', true),
('Hana Kusuma', 'hana@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Statistika', 'bg-teal-500', 'Data Scientist yang menyukai statistik terapan.', 'peserta', '["National Statistics Olympiad 2025 — Juara 3", "Data Analytics Bootcamp"]', '["Statistika Award", "Best Analysis"]', false),
('Ivan Santoso', 'ivan@binus.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'BINUS University', 'Mobile Application & Technology', 'bg-lime-600', 'Mobile Developer Flutter & Native.', 'peserta', '["Google Play Best App 2024", "Mobile Hackathon — Juara 1"]', '["Best App", "Google Play Badge"]', true),
('Jessica Tanaka', 'jessica@unpad.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Padjadjaran', 'Administrasi Bisnis', 'bg-amber-500', 'Business Strategist dengan fokus model keuangan.', 'peserta', '["Young Entrepreneur Award 2025", "HIPMI Cup — Finalist"]', '["Best Business Plan"]', true),
('Kevin Rahmadan', 'kevin@its.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'ITS Surabaya', 'Teknik Informatika', 'bg-violet-500', 'DevOps & Backend Engineer yang mahir Docker & Go.', 'peserta', '["AWS Cloud Hackathon — Juara 2", "ICPC Asia Regional 2024"]', '["Cloud Expert", "DevOps Certified"]', false),
('Lina Maharani', 'lina@undip.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Diponegoro', 'Teknik Informatika', 'bg-rose-500', 'Computer Vision & Deep Learning researcher.', 'peserta', '["GEMASTIK XVII AI Track — Juara 1", "IEEE Student Paper Award"]', '["AI Champion", "Best Paper"]', true),
('Maya Putri', 'maya@ui.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Indonesia', 'Ilmu Kesejahteraan Sosial', 'bg-emerald-500', 'Social Innovator yang menyukai community building.', 'peserta', '["Koordinator Volunteer UNDP 2025", "Hult Prize Sosial — Juara 1 Campus"]', '["Social Leader Award", "Volunteer of the Year"]', true),
('Naufal Hakim', 'naufal@ugm.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'UGM Yogyakarta', 'Sociology', 'bg-teal-600', 'Sociopreneur yang menyukai pemberdayaan masyarakat.', 'peserta', '["Youth Changemaker UNICEF 2025", "Social Entrepreneurship Program"]', '["Best Impact Project", "SDGs Champion"]', false),
('Olivia Rahma', 'olivia@unpad.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'UNPAD Bandung', 'Hubungan Internasional', 'bg-lime-500', 'Global youth leader yang aktif di advokasi.', 'peserta', '["MUN Harvard 2025 — Best Delegate", "Internship UNFPA Indonesia"]', '["Best Delegate", "Global Youth Leader"]', true),
('Petra Wijaksono', 'petra@unair.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Airlangga', 'Ilmu Komunikasi', 'bg-sky-500', 'TEDx speaker & MC yang menyukai storytelling.', 'peserta', '["Juara 1 Lomba Debat Nasional 2025", "TEDx Speaker UI 2024"]', '["Best Speaker", "TEDx Alumni"]', true),
('Qila Ramadhani', 'qila@unhas.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Hasanuddin', 'Sastra Indonesia', 'bg-fuchsia-500', 'Orator & Copywriter yang aktif di Parlemen Debat.', 'peserta', '["Juara 2 Debat Parlemen Nasional 2025", "Brand Storytelling Workshop Facilitator"]', '["Best Orator", "Juara Debat Regional"]', false),
('Raka Santanu', 'raka@binus.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Bina Nusantara', 'Marketing Communication', 'bg-orange-600', 'Presenter bisnis & Pitching consultant.', 'peserta', '["Startup Pitch Competition — Juara 1", "Marketing Hackathon 2025 Finalist"]', '["Best Pitch", "Top Presenter"]', true),
('Sinta Larasati', 'sinta@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Biokimia', 'bg-green-700', 'Riset Biokimia & Penulisan Ilmiah.', 'peserta', '["LKTIN ITS 2025 — Juara 2", "Riset BRIN Bidang Biokimia"]', '["Best Research Paper", "Young Scientist Award"]', false),
('Taufik Hidayat', 'taufik@itb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'ITB Bandung', 'Kimia', 'bg-cyan-700', 'Riset Kimia Analitik & Penulisan Ilmiah.', 'peserta', '["Juara 1 Lomba Kimia Nasional 2025", "Publikasi Jurnal Scopus 2024"]', '["Olimpiade Gold", "Scopus Author"]', true),
('Ulfah Mardiyah', 'ulfah@undip.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Universitas Diponegoro', 'Fisika', 'bg-blue-700', 'Fisika Komputasi & Simulasi Numerik.', 'peserta', '["Physics Olympiad Nasional — Juara 3", "IEEE Student Branch Project"]', '["Physics Award", "IEEE Member"]', false);

-- Seed Skills
INSERT INTO skills (id, name, tag_class) VALUES 
(1, 'UI/UX', 'tag-purple'),
(2, 'Figma', 'tag-purple'),
(3, 'Postgres', 'tag-blue'),
(4, 'Frontend Dev', 'tag-purple'),
(5, 'React', 'tag-blue'),
(6, 'Node.js', 'tag-green'),
(7, 'User Research', 'tag-purple'),
(8, 'Backend', 'tag-green'),
(9, 'DevOps', 'tag-blue'),
(10, 'Business Dev', 'tag-orange'),
(11, 'Pitching', 'tag-orange'),
(12, 'Market Research', 'tag-orange'),
(13, 'Machine Learning', 'tag-green'),
(14, 'Python', 'tag-blue'),
(15, 'Data Science', 'tag-green'),
(16, 'React.js', 'tag-blue'),
(17, 'Vue.js', 'tag-blue'),
(18, 'TypeScript', 'tag-purple'),
(19, 'CSS', 'tag-pink'),
(20, 'Ilustrasi', 'tag-pink'),
(21, 'Branding', 'tag-purple'),
(22, 'Laravel', 'tag-purple'),
(23, 'PHP', 'tag-blue'),
(24, 'MySQL', 'tag-blue'),
(25, 'R Language', 'tag-green'),
(26, 'Data Visualization', 'tag-green'),
(27, 'Statistics', 'tag-blue'),
(28, 'Flutter', 'tag-purple'),
(29, 'Dart', 'tag-blue'),
(30, 'React Native', 'tag-blue'),
(31, 'iOS/Android', 'tag-purple'),
(32, 'Financial Modeling', 'tag-orange'),
(33, 'Excel', 'tag-green'),
(34, 'Pitch Deck', 'tag-orange'),
(35, 'Go', 'tag-blue'),
(36, 'Microservices', 'tag-blue'),
(37, 'Docker', 'tag-blue'),
(38, 'Kubernetes', 'tag-purple'),
(39, 'TensorFlow', 'tag-green'),
(40, 'Computer Vision', 'tag-green'),
(41, 'NLP', 'tag-green'),
(42, 'Community Building', 'tag-orange'),
(43, 'Advokasi', 'tag-orange'),
(44, 'NGO Management', 'tag-teal'),
(45, 'Social Media', 'tag-pink'),
(46, 'Sosial Impact Design', 'tag-green'),
(47, 'Facilitation', 'tag-teal'),
(48, 'Komunitas', 'tag-green'),
(49, 'Fieldwork', 'tag-teal'),
(50, 'Advokasi Kebijakan', 'tag-teal'),
(51, 'Networking', 'tag-blue'),
(52, 'Social Research', 'tag-green'),
(53, 'NGO', 'tag-teal'),
(54, 'Public Speaking', 'tag-orange'),
(55, 'MC', 'tag-pink'),
(56, 'Storytelling', 'tag-orange'),
(57, 'Presentasi', 'tag-orange'),
(58, 'Debat', 'tag-orange'),
(59, 'Copywriting', 'tag-pink'),
(60, 'Presentasi Bisnis', 'tag-orange'),
(61, 'Video Pitch', 'tag-orange'),
(62, 'Persuasion', 'tag-orange'),
(63, 'Lab Research', 'tag-green'),
(64, 'Biologi Molekuler', 'tag-green'),
(65, 'Academic Writing', 'tag-blue'),
(66, 'SPSS', 'tag-blue'),
(67, 'Kimia Analitik', 'tag-green'),
(68, 'Lab Work', 'tag-green'),
(69, 'Data Sains Eksperimen', 'tag-green'),
(70, 'Scientific Writing', 'tag-blue'),
(71, 'Fisika Komputasi', 'tag-blue'),
(72, 'Simulasi Numerik', 'tag-blue');

ALTER SEQUENCE skills_id_seq RESTART WITH 73;

-- Map User Skills
INSERT INTO user_skills (user_id, skill_id) VALUES 
(1, 1), (1, 2), (1, 3), -- Fathiyya
(2, 4), (2, 5),         -- Aqilah
(3, 6), (3, 3),         -- Gilbran
(4, 1), (4, 2), (4, 7), -- Aurel
(5, 8), (5, 6), (5, 3), (5, 9), -- Bimo
(6, 10), (6, 11), (6, 12), -- Citra
(7, 13), (7, 14), (7, 15), -- Dimas
(8, 16), (8, 17), (8, 18), (8, 19), -- Evan
(9, 2), (9, 20), (9, 21), (9, 1), -- Farah
(10, 22), (10, 23), (10, 24), (10, 8), -- Galih
(11, 25), (11, 26), (11, 27), (11, 14), -- Hana
(12, 28), (12, 29), (12, 30), (12, 31), -- Ivan
(13, 32), (13, 10), (13, 33), (13, 34), -- Jessica
(14, 35), (14, 36), (14, 37), (14, 38), -- Kevin
(15, 39), (15, 40), (15, 41), (15, 15), -- Lina
(16, 42), (16, 43), (16, 44), (16, 45), -- Maya
(17, 46), (17, 47), (17, 48), (17, 49), -- Naufal
(18, 50), (18, 51), (18, 52), (18, 53), -- Olivia
(19, 54), (19, 55), (19, 56), (19, 57), -- Petra
(20, 11), (20, 58), (20, 56), (20, 59), -- Qila
(21, 60), (21, 54), (21, 61), (21, 62), -- Raka
(22, 63), (22, 64), (22, 65), (22, 66), -- Sinta
(23, 67), (23, 68), (23, 69), (23, 70), -- Taufik
(24, 71), (24, 14), (24, 72), (24, 65); -- Ulfah




