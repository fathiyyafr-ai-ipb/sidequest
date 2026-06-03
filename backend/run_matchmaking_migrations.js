/**
 * SideQuest — run_matchmaking_migrations.js
 * SQL migration runner for Connection-based Matchmaking & Team Invitation features.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Use DATABASE_URL (e.g. Supabase production) when provided; else local Postgres.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sidequest2',
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    });

async function runMigrations() {
  console.log('=== STARTING MATCHMAKING SCHEMA MIGRATIONS ===');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Alter users table to add only_allow_connection_invites
    console.log('1. Altering users table (only_allow_connection_invites column)...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS only_allow_connection_invites BOOLEAN DEFAULT false;
    `);

    // 2. Alter teams table to add require_connection_to_apply
    console.log('2. Altering teams table (require_connection_to_apply column)...');
    await client.query(`
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS require_connection_to_apply BOOLEAN DEFAULT false;
    `);

    await client.query('COMMIT');
    console.log('✅ ALL MATCHMAKING SCHEMA MIGRATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ MIGRATION ERROR:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
