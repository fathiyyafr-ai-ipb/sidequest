const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sidequest2',
  password: 'PIa1234!',
  port: 5432,
});

async function resetDb() {
  try {
    console.log('Dropping schema...');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    
    console.log('Database reset successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await pool.end();
  }
}

resetDb();
