const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sidequest2',
  password: 'moalhilap', // TODO: Gunakan process.env.DB_PASSWORD nanti
  port: 5432,
});

module.exports = pool;
