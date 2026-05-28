const pool = require('../config/db');

const getCompetitions = async (req, res) => {
  const { cat } = req.query;
  try {
    let query = `
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
    `;
    let values = [];

    if (cat && cat !== 'all') {
      query += ` WHERE cat.slug = $1`;
      values.push(cat);
    }

    const result = await pool.query(query, values);
    
    // Mapping data agar cocok dengan frontend (data.js)
    const formattedData = result.rows.map(row => ({
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      org: row.organizer,
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description
    }));

    res.json({ data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getCompetitionById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      organizer: row.organizer, // for detail.html
      org: row.organizer,       // for card lists
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      color_gradient: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description,
      description: row.description,
      // For detail.html compatibility
      scope: (row.tags && row.tags.length > 1) ? row.tags[1] : 'Nasional',
      registrationClose: row.deadline,
      daysUntilClose: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0
    };

    res.json({ data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const saveCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const exists = await pool.query(
      'SELECT * FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Already saved' });
    }
    await pool.query(
      'INSERT INTO saved_competitions (user_id, competition_id) VALUES ($1, $2)',
      [userId, compId]
    );
    res.json({ message: 'Competition saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const unsaveCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    await pool.query(
      'DELETE FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    res.json({ message: 'Competition unsaved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getSavedCompetitions = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(`
      SELECT c.*, cat.slug as category_slug 
      FROM competitions c 
      JOIN categories cat ON c.category_id = cat.id
      JOIN saved_competitions sc ON c.id = sc.competition_id
      WHERE sc.user_id = $1
    `, [userId]);

    const formattedData = result.rows.map(row => ({
      id: row.id,
      cat: row.category_slug,
      title: row.title,
      org: row.organizer,
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      daysLeft: row.deadline ? Math.ceil((new Date(row.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      tags: row.tags,
      color: row.color_gradient,
      emoji: row.emoji,
      free: row.is_free,
      prize: row.prize,
      desc: row.description
    }));

    res.json({ data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const registerCompetition = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const exists = await pool.query(
      'SELECT * FROM competition_registrations WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Already registered' });
    }
    await pool.query(
      'INSERT INTO competition_registrations (user_id, competition_id) VALUES ($1, $2)',
      [userId, compId]
    );
    res.json({ message: 'Successfully registered for competition' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getRegistrationStatus = async (req, res) => {
  const userId = req.userId;
  const compId = req.params.id;
  try {
    const result = await pool.query(
      'SELECT * FROM competition_registrations WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    const saved = await pool.query(
      'SELECT * FROM saved_competitions WHERE user_id = $1 AND competition_id = $2',
      [userId, compId]
    );
    res.json({ 
      registered: result.rows.length > 0,
      saved: saved.rows.length > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = { 
  getCompetitions, 
  getCompetitionById,
  saveCompetition,
  unsaveCompetition,
  getSavedCompetitions,
  registerCompetition,
  getRegistrationStatus
};
