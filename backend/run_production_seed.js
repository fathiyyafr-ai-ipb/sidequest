/**
 * SideQuest — run_production_seed.js
 * Runs seed_demo_data.sql against the production database.
 * Usage:
 *   DATABASE_URL="postgresql://..." node run_production_seed.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dns = require('dns');
const net = require('net');

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('Usage: DATABASE_URL="postgresql://user:pass@host:port/dbname" node run_production_seed.js');
  process.exit(1);
}

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port, 10) || 5432,
  database: dbUrl.pathname.slice(1),
  family: 4,
  ssl: { rejectUnauthorized: false },
  stream: () => {
    const socket = new net.Socket();
    const origConnect = socket.connect;
    socket.connect = function(options, cb) {
      if (options && typeof options === 'object') {
        options.family = 4;
        return origConnect.call(this, options, cb);
      }
      return origConnect.call(this, { port: options, host: arguments[1], family: 4 }, arguments[2]);
    };
    return socket;
  }
});

async function runProductionSeed() {
  console.log('=== SIDEQUEST PRODUCTION DATABASE SEED ===');
  console.log(`  Target host: ${dbUrl.hostname}`);
  console.log(`  Target DB  : ${dbUrl.pathname.slice(1)}`);
  console.log('');
  
  const client = await pool.connect();
  
  try {
    // Test connectivity
    await client.query('SELECT 1');
    console.log('✅ Production database connection established.');
    
    // Check if tables exist (post-migration state)
    const tableCheck = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'competitions'
    `);
    
    if (parseInt(tableCheck.rows[0].count, 10) === 0) {
      console.error('❌ Schema not found in production database!');
      console.error('   Please run schema.sql and all migration scripts first on production.');
      process.exit(1);
    }
    
    console.log('✅ Schema verified. Loading seed file...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed_demo_data.sql'), 'utf-8');
    console.log(`   Seed file loaded: ${Math.round(seedSql.length / 1024)} KB, ${seedSql.split('\n').length} lines`);
    
    console.log('\n⏳ Executing seed queries on production... (this may take 30-60 seconds)');
    await client.query(seedSql);
    
    // Verify final counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'peserta') AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'organizer') AS organizers,
        (SELECT COUNT(*) FROM users WHERE role = 'sponsor') AS sponsors,
        (SELECT COUNT(*) FROM competitions) AS competitions,
        (SELECT COUNT(*) FROM teams) AS teams,
        (SELECT COUNT(*) FROM connections) AS connections,
        (SELECT COUNT(*) FROM competition_registrations) AS registrations,
        (SELECT COUNT(*) FROM competition_submissions) AS submissions
    `);
    
    const r = counts.rows[0];
    console.log('\n==============================================================');
    console.log('✅  PRODUCTION SEED COMPLETE — FINAL COUNTS');
    console.log('==============================================================');
    console.log(`👤  Students   : ${r.students}   (target: 189)`);
    console.log(`🏢  Organizers : ${r.organizers} (target: 34)`);
    console.log(`💰  Sponsors   : ${r.sponsors}   (target: 14)`);
    console.log(`🏆  Competitions: ${r.competitions} (target: 38)`);
    console.log(`🤝  Teams      : ${r.teams}      (target: 64)`);
    console.log(`🔗  Connections: ${r.connections}`);
    console.log(`📝  Regs       : ${r.registrations}`);
    console.log(`📦  Submissions: ${r.submissions}`);
    console.log('==============================================================');
    console.log('\n🎉 Production database is now investor-ready!');
    
  } catch (err) {
    console.error('\n❌ PRODUCTION SEED FAILED:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

runProductionSeed();
