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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
('Farah Nadia', 'farah@telkom.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'Telkom University', 'Desain Komunikasi Visual', 'bg-pink-500', 'UI/UX Designer dan Illustrator digital.', 'peserta', '["Redot Design Award 2024", "COMPFEST Design — Juara 2"]', '["Best Design", "Creative Award"]', false);

-- Seed Skills
INSERT INTO skills (name, tag_class) VALUES 
('UI/UX', 'tag-purple'),
('Figma', 'tag-purple'),
('Postgres', 'tag-blue'),
('Frontend Dev', 'tag-purple'),
('React', 'tag-blue'),
('Node.js', 'tag-green'),
('User Research', 'tag-purple'),
('Backend', 'tag-green'),
('DevOps', 'tag-blue'),
('Business Dev', 'tag-orange'),
('Pitching', 'tag-orange'),
('Market Research', 'tag-orange'),
('Machine Learning', 'tag-green'),
('Python', 'tag-blue'),
('Data Science', 'tag-green'),
('React.js', 'tag-blue'),
('Vue.js', 'tag-blue'),
('TypeScript', 'tag-purple'),
('CSS', 'tag-pink'),
('Ilustrasi', 'tag-pink'),
('Branding', 'tag-purple');

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
(9, 2), (9, 20), (9, 21), (9, 1); -- Farah




