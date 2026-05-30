const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sidequest2',
      password: process.env.DB_PASSWORD, // Loaded dynamically from gitignored .env file
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    });

module.exports = pool;
