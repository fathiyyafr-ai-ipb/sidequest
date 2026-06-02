/**
 * SideQuest — run_premium_migrations.js (backend copy)
 * SQL migration runner for Premium Hosted Event Organizer & Analytics Console features.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sidequest2',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

async function runMigrations() {
  console.log('=== STARTING PREMIUM SCHEMA MIGRATIONS ===');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Alter users table to add premium status columns
    console.log('1. Altering users table (premium columns)...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_status VARCHAR(20) DEFAULT 'none';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_trial_start TIMESTAMP DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_trial_end TIMESTAMP DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_subscription_ends TIMESTAMP DEFAULT NULL;
    `);

    // 2. Create hosted_event_settings table
    console.log('2. Creating hosted_event_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hosted_event_settings (
        competition_id INT PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
        banner_url TEXT DEFAULT NULL,
        accent_color VARCHAR(50) DEFAULT '#6C63FF',
        custom_domain VARCHAR(255) DEFAULT NULL,
        announcement_text TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create custom_registration_fields table
    console.log('3. Creating custom_registration_fields table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_registration_fields (
        id SERIAL PRIMARY KEY,
        competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
        field_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        required BOOLEAN DEFAULT true,
        options JSONB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create custom_registration_responses table
    console.log('4. Creating custom_registration_responses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_registration_responses (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
        field_id INT REFERENCES custom_registration_fields(id) ON DELETE CASCADE,
        response_value TEXT NOT NULL,
        PRIMARY KEY (user_id, competition_id, field_id)
      );
    `);

    // 5. Create competition_submissions table
    console.log('5. Creating competition_submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS competition_submissions (
        id SERIAL PRIMARY KEY,
        competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        team_id INT REFERENCES teams(id) ON DELETE SET NULL,
        submission_url TEXT NOT NULL,
        notes TEXT DEFAULT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending'
      );
    `);

    // 6. Create competition_judges table
    console.log('6. Creating competition_judges table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS competition_judges (
        id SERIAL PRIMARY KEY,
        competition_id INT REFERENCES competitions(id) ON DELETE CASCADE,
        judge_name VARCHAR(100) NOT NULL,
        judge_email VARCHAR(100) NOT NULL,
        access_token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(competition_id, judge_email)
      );
    `);

    // 7. Create submission_grades table
    console.log('7. Creating submission_grades table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_grades (
        id SERIAL PRIMARY KEY,
        submission_id INT REFERENCES competition_submissions(id) ON DELETE CASCADE,
        judge_id INT REFERENCES competition_judges(id) ON DELETE CASCADE,
        score INT NOT NULL,
        feedback TEXT DEFAULT NULL,
        graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(submission_id, judge_id)
      );
    `);

    // 8. Seed platform settings flags for premium organizer module
    console.log('8. Seeding platform settings flags...');
    await client.query(`
      INSERT INTO platform_settings (key, value) VALUES
      ('feature_premium_organizer', 'inactive'),
      ('premium_organizer_trial_days', '90')
      ON CONFLICT (key) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ ALL PREMIUM SCHEMA MIGRATIONS COMPLETED SUCCESSFULLY!');
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
