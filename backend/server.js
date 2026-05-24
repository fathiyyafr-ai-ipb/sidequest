const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const userRoutes = require('./routes/userRoutes');
const matchmakingRoutes = require('./routes/matchmakingRoutes');

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend SideQuest berjalan di http://localhost:${PORT}`);
});