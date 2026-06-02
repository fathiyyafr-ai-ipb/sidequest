const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const userRoutes = require('./routes/userRoutes');
const matchmakingRoutes = require('./routes/matchmakingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const premiumRoutes = require('./routes/premiumRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Test Database Connection
const pool = require('./config/db');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed / Koneksi database gagal:', err.message);
  } else {
    console.log('Database connected successfully / Koneksi database PostgreSQL berhasil!');
  }
});

app.get('/api/db-check-debug', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      time: result.rows[0],
      poolOptions: {
        host: pool.options?.host,
        port: pool.options?.port,
        database: pool.options?.database,
        user: pool.options?.user,
        family: pool.options?.family,
        ssl: !!pool.options?.ssl
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        HAS_DATABASE_URL: !!process.env.DATABASE_URL,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) : null
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      poolOptions: {
        host: pool.options?.host,
        port: pool.options?.port,
        database: pool.options?.database,
        user: pool.options?.user,
        family: pool.options?.family,
        ssl: !!pool.options?.ssl
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        HAS_DATABASE_URL: !!process.env.DATABASE_URL,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) : null
      }
    });
  }
});

// Mount API Routes
const { checkPlatformStatus } = require('./middleware/adminMiddleware');
app.use(checkPlatformStatus);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/users', userRoutes);
// Untuk kompatibilitas backward jika frontend manggil /api/profile/:id langsung
app.use('/api/profile', userRoutes); 
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/notifications', notificationRoutes);
const teamRoutes = require('./routes/teamRoutes');
app.use('/api/teams', teamRoutes);
const connectionRoutes = require('./routes/connectionRoutes');
app.use('/api/connections', connectionRoutes);
const sidekickRoutes = require('./routes/sidekickRoutes');
app.use('/api/sidekick', sidekickRoutes);
app.use('/api/sponsor', sponsorRoutes);
app.use('/api/premium', premiumRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend SideQuest berjalan di http://localhost:${PORT}`);
});