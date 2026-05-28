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
('Fathiyya Fitriani Refananda', 'fathiyya@ipb.ac.id', '$2a$10$RSkZRsA7U61f4p9zkOfGR.U../8gzlcw63XpZXDWNokYJJyMEpyyS', 'IPB University', 'Artificial Intelligence', 'bg-blue-500', 'Mahasiswa tingkat akhir');
