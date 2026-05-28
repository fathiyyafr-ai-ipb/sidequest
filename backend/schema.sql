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
  role VARCHAR(20) DEFAULT 'peserta'
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Seed Data Awal
INSERT INTO categories (slug, name) VALUES 
('ui-ux', 'UI/UX Design'), 
('data-science', 'Data Science'), 
('web-dev', 'Web Development');

-- Seed Users (Fathiyya, Aqilah, Gilbran)
INSERT INTO users (name, email, password, university, prodi, avatar_color, bio, role) VALUES 
('Fathiyya Fitriani Refananda', 'fathiyya@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Artificial Intelligence', 'bg-blue-500', 'Mahasiswa tingkat akhir', 'peserta'),
('Aqilah Callysta Abygail Febyan', 'aqilah@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Software Engineering', 'bg-purple-500', 'Mahasiswa yang tertarik dengan frontend development', 'peserta'),
('M. Gilbran Firdiansyah', 'gilbran@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Computer Science', 'bg-green-500', 'Mahasiswa backend developer pemula', 'peserta');

-- Seed Skills
INSERT INTO skills (name, tag_class) VALUES 
('UI/UX', 'tag-purple'),
('Figma', 'tag-purple'),
('Postgres', 'tag-blue'),
('Frontend Dev', 'tag-purple'),
('React', 'tag-blue'),
('Node.js', 'tag-green');

-- Map User Skills
INSERT INTO user_skills (user_id, skill_id) VALUES 
(1, 1), (1, 2), (1, 3), -- Fathiyya: UI/UX, Figma, Postgres
(2, 4), (2, 5),         -- Aqilah: Frontend Dev, React
(3, 6), (3, 3);         -- Gilbran: Node.js, Postgres



