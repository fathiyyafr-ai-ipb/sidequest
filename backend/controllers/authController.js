const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const register = async (req, res) => {
  try {
    const { email, password, confirmPassword, captchaAnswer, captchaExpected, university, role } = req.body;
    const name = req.body.name || req.body.fullName;
    const prodi = req.body.prodi || req.body.studyProgram;
    const universityCity = req.body.universityCity || null;
    const universityProvince = req.body.universityProvince || null;
    const officeAddress = req.body.officeAddress || null;
    const phoneNumber = req.body.phoneNumber || null;
    
    // 1. Password Confirmation Check
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password dan konfirmasi password tidak cocok!' });
    }

    // 2. Captcha Validation Check
    if (captchaAnswer === undefined || captchaExpected === undefined || parseInt(captchaAnswer, 10) !== parseInt(captchaExpected, 10)) {
      return res.status(400).json({ message: 'Jawaban captcha salah. Silakan coba lagi!' });
    }

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

    // 3. Localhost Development Mode Check
    const isLocalhost = req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'));
    let is_verified = false;
    let is_approved = true;
    let verification_token = null;

    if (isLocalhost) {
      is_verified = true;
      is_approved = true;
    } else {
      verification_token = crypto.randomBytes(32).toString('hex');
      if (userRole === 'organizer') {
        is_approved = false;
        is_verified = false;
      } else {
        is_approved = true;
        is_verified = false;
      }
    }

    // Insert user
    const newUser = await pool.query(
      `INSERT INTO users (
        name, email, password, university, prodi, avatar_color, bio, role, 
        is_verified, is_approved, verification_token, 
        university_city, university_province, office_address, phone_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING id, name, email, role, is_verified, is_approved, verification_token`,
      [
        name, email, hashedPassword, university || null, prodi || null, avatar_color, bio, userRole,
        is_verified, is_approved, verification_token,
        universityCity, universityProvince, officeAddress, phoneNumber
      ]
    );

    // Simulated email log for production mode
    if (!isLocalhost && verification_token) {
      console.log(`\n======================================================`);
      console.log(`📧 [SIMULATION EMAIL SENT TO: ${email}]`);
      console.log(`Tautan Verifikasi Akun Anda: http://localhost:3001/api/auth/verify?token=${verification_token}`);
      console.log(`======================================================\n`);
    }

    res.status(201).json({ 
      message: 'Registrasi berhasil. Silakan selesaikan proses verifikasi Anda.', 
      isLocalhost,
      verificationToken: verification_token,
      data: {
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

    // Check approval status
    if (user.is_approved === false) {
      return res.status(403).json({ message: 'Akun penyelenggara Anda sedang dalam peninjauan oleh operator/superadmin.' });
    }

    // Check email verification status
    if (user.is_verified === false) {
      return res.status(403).json({ message: 'Silakan verifikasi email Anda terlebih dahulu.' });
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

const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Token verifikasi tidak ditemukan.');
    }

    const result = await pool.query('SELECT * FROM users WHERE verification_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).send('Token verifikasi tidak valid atau kedaluwarsa.');
    }

    const user = result.rows[0];
    await pool.query('UPDATE users SET is_verified = true, verification_token = null WHERE id = $1', [user.id]);

    // Redirect to login page with verified=true parameter
    res.redirect('/pages/login.html?verified=true');
  } catch (error) {
    console.error('[verifyUser]', error);
    res.status(500).send('Server Error');
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

module.exports = { register, login, verifyUser, forgotPassword };

