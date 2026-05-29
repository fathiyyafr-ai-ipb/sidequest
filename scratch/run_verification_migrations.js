const { Pool } = require('/Users/fahmi/Documents/Play Ground/SideQuest/Prototype3/sidequest/backend/node_modules/pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sidequest2',
  password: 'moalhilap',
  port: 5432,
});

async function main() {
  try {
    console.log('=== STARTING DATABASE MIGRATION FOR VERIFICATION & OTHER COLS ===');

    console.log('1. Adding verification and region columns to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS university_city VARCHAR(100)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS university_province VARCHAR(100)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS office_address TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)');
    console.log('   Success adding columns.');

    console.log('2. Auto-verifying and approving all existing seed users...');
    await pool.query('UPDATE users SET is_verified = true, is_approved = true');
    console.log('   Success updating existing users.');

    console.log('=== MIGRATION COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

main();
