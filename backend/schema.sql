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
  bio TEXT
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

INSERT INTO users (name, email, password, university, prodi, avatar_color, bio) VALUES 
('Fathi', 'fathi@example.com', '$2a$10$wT.VdE.zU1/t1x7H.9j.N.bO3d/R8H9J.H/yXm2E.nL.m.z1q9L/S', 'Universitas Andalas', 'Sistem Informasi', 'bg-blue-500', 'Mahasiswa tingkat akhir'),
('Rizki Aditya', 'rizki@ui.ac.id', '$2a$10$Dsxdimd8njKOD3nAUrQmm.7hLuHzCA5cnf03PrvnZ57yWkUN/bLDq', 'Universitas Indonesia', 'Teknik Informatika', 'bg-purple-500', 'Mahasiswa Teknik Informatika UI semester 6. Passionate di web development & AI.');
