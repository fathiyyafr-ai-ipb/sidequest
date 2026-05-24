const pool = require('../config/db');

const getMatchmaking = async (req, res) => {
  try {
    const userId = req.userId || 1; // get from auth middleware or default to 1

    // Mengambil user lain sebagai rekomendasi
    const result = await pool.query(`
      SELECT id, name, university as uni, prodi, avatar_color 
      FROM users 
      WHERE id != $1 
      LIMIT 5
    `, [userId]);
    
    const matches = result.rows.map(u => ({
      ...u,
      compat: Math.floor(Math.random() * 20) + 75,
      online: Math.random() > 0.5,
      skills: ['UI/UX', 'Figma', 'Postgres'],
      exp: ['Finalis Gemastik 2025'],
      prestasi: ['Ksatria Data']
    }));

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = { getMatchmaking };
