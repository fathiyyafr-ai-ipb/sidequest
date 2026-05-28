const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const userRoutes = require('./routes/userRoutes');
const matchmakingRoutes = require('./routes/matchmakingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

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

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/users', userRoutes);
// Untuk kompatibilitas backward jika frontend manggil /api/profile/:id langsung
app.use('/api/profile', userRoutes); 
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/notifications', notificationRoutes);
const teamRoutes = require('./routes/teamRoutes');
app.use('/api/teams', teamRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend SideQuest berjalan di http://localhost:${PORT}`);
});