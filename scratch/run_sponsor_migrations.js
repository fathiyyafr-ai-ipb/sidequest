const pool = require('../backend/config/db');

async function main() {
  console.log('=== STARTING SPONSORSHIP SYSTEM SCHEMA MIGRATION ===');
  
  try {
    // 1. Create sponsorship_pricing_rates
    console.log('Creating "sponsorship_pricing_rates" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsorship_pricing_rates (
        id SERIAL PRIMARY KEY,
        page_key VARCHAR(50) NOT NULL,
        price_per_day DECIMAL(12, 2) NOT NULL,
        effective_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index
    console.log('Creating index idx_rates_key_effective...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rates_key_effective 
      ON sponsorship_pricing_rates(page_key, effective_date)
    `);

    // 2. Create sponsorships
    console.log('Creating "sponsorships" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id SERIAL PRIMARY KEY,
        sponsor_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        target_url TEXT NOT NULL,
        image_url TEXT NOT NULL,
        pages VARCHAR(50)[] NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_cost DECIMAL(12, 2) NOT NULL,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create sponsorship_cost_logs
    console.log('Creating "sponsorship_cost_logs" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsorship_cost_logs (
        id SERIAL PRIMARY KEY,
        sponsorship_id INT REFERENCES sponsorships(id) ON DELETE CASCADE,
        modified_by INT REFERENCES users(id) ON DELETE SET NULL,
        old_cost DECIMAL(12, 2) NOT NULL,
        new_cost DECIMAL(12, 2) NOT NULL,
        reason TEXT,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Seeding baseline rates if empty
    console.log('Seeding initial pricing rates (effective 2026-05-01)...');
    const checkRates = await pool.query('SELECT COUNT(*) FROM sponsorship_pricing_rates');
    if (parseInt(checkRates.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO sponsorship_pricing_rates (page_key, price_per_day, effective_date) VALUES 
        ('dashboard', 15000.00, '2026-05-01'::DATE),
        ('competitions', 10000.00, '2026-05-01'::DATE),
        ('matchmaking', 12000.00, '2026-05-01'::DATE),
        ('teams', 8000.00, '2026-05-01'::DATE)
      `);
      console.log('   Baseline pricing seeded successfully.');
    } else {
      console.log('   Rates already exist. Skipping seed.');
    }

    console.log('\n✅ SPONSORSHIP MIGRATIONS COMPLETED SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ SPONSORSHIP MIGRATION FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

main();
