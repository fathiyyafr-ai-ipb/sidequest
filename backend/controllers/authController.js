const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { email, password, university, role } = req.body;
    const name = req.body.name || req.body.fullName;
    const prodi = req.body.prodi || req.body.studyProgram;
    
    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default values
    const avatar_color = 'bg-blue-500';
    const bio = '';
    const userRole = (role === 'organizer') ? 'organizer' : 'peserta';

    // Insert user
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, university, prodi, avatar_color, bio, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role',
      [name, email, hashedPassword, university || null, prodi || null, avatar_color, bio, userRole]
    );

    // Generate token for auto-login
    const payload = { userId: newUser.rows[0].id };
    const secret = process.env.JWT_SECRET || 'secret_key_sidequest';
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'Registrasi berhasil', 
      data: {
        accessToken: token,
        user: {
          id: newUser.rows[0].id,
          name: newUser.rows[0].name,
          email: newUser.rows[0].email,
          role: newUser.rows[0].role
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    const user = result.rows[0];

    // Check active status
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh administrator.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    // Generate token
    const payload = { userId: user.id };
    const secret = process.env.JWT_SECRET || 'secret_key_sidequest';
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });

    res.json({
      message: 'Login berhasil',
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email wajib diisi' });
    }

    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email tidak ditemukan' });
    }

    res.json({
      message: 'Tautan instruksi pemulihan kata sandi telah sukses dikirim ke email Anda!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { register, login, forgotPassword };

