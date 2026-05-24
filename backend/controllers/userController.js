const pool = require('../config/db');

const getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.userId; // Support params or auth middleware
    
    // Ambil data user
    const userRes = await pool.query('SELECT id, name, email, university, prodi, avatar_color, bio FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).send("User not found");

    // Ambil skill user
    const skillRes = await pool.query(`
      SELECT s.name as label, s.tag_class as cls 
      FROM skills s 
      JOIN user_skills us ON s.id = us.skill_id 
      WHERE us.user_id = $1
    `, [userId]);

    const user = userRes.rows[0];
    const userData = {
      id: user.id,
      name: user.name,
      fullName: user.name, // compatibility
      email: user.email,
      prodi: user.prodi,
      studyProgram: user.prodi, // compatibility
      uni: user.university,
      university: user.university, // compatibility
      bio: user.bio,
      initials: user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U',
      skills: skillRes.rows,
      stats: { lombaIkuti: 7, timAktif: 3, undangan: 2, matchRate: "92%" }
    };
    res.json({ data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId || 1; 
    const { name, university, prodi, bio } = req.body;

    const updateQuery = `
      UPDATE users 
      SET name = COALESCE($1, name),
          university = COALESCE($2, university),
          prodi = COALESCE($3, prodi),
          bio = COALESCE($4, bio)
      WHERE id = $5 RETURNING id, name, email, university, prodi, bio
    `;

    const result = await pool.query(updateQuery, [name, university, prodi, bio, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = result.rows[0];
    const userData = {
      id: updatedUser.id,
      name: updatedUser.name,
      fullName: updatedUser.name,
      email: updatedUser.email,
      prodi: updatedUser.prodi,
      studyProgram: updatedUser.prodi,
      uni: updatedUser.university,
      university: updatedUser.university,
      bio: updatedUser.bio,
      initials: updatedUser.name ? updatedUser.name.split(' ').map(n => n[0]).join('') : 'U',
      skills: [],
      stats: { lombaIkuti: 7, timAktif: 3, undangan: 2, matchRate: "92%" }
    };

    res.json({ message: "Profile updated successfully", data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = { getProfile, updateProfile };
