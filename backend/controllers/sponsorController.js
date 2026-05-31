const pool = require('../config/db');

// Helper to resolve the effective daily rate for a page key on a given date
async function getEffectiveRate(pageKey, dateStr) {
  const result = await pool.query(`
    SELECT price_per_day 
    FROM sponsorship_pricing_rates 
    WHERE page_key = $1 AND effective_date <= $2::DATE
    ORDER BY effective_date DESC, id DESC 
    LIMIT 1
  `, [pageKey, dateStr]);

  if (result.rows.length > 0) {
    return parseFloat(result.rows[0].price_per_day);
  }
  
  // Hardcoded default fallbacks if somehow DB seed is missing
  const fallbacks = {
    'dashboard': 15000.00,
    'competitions': 10000.00,
    'matchmaking': 12000.00,
    'teams': 8000.00
  };
  return fallbacks[pageKey] || 10000.00;
}

// 1. Create a new Sponsorship Ad campaign (Sponsor role only)
const createAd = async (req, res) => {
  const { title, target_url, image_url, pages, start_date, end_date } = req.body;
  const sponsorId = req.userId;

  if (!title || !target_url || !image_url || !pages || !Array.isArray(pages) || pages.length === 0 || !start_date || !end_date) {
    return res.status(400).json({ message: 'Semua bidang data kampanye iklan wajib diisi dengan lengkap.' });
  }

  // Validate start date <= end date
  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return res.status(400).json({ message: 'Rentang tanggal mulai dan selesai iklan tidak valid.' });
  }

  try {
    // A. Calculate campaign duration in days
    const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // B. Calculate price per day based on historical pricing rates active on the start date
    let pricePerDay = 0;
    const validPages = ['dashboard', 'competitions', 'matchmaking', 'teams'];
    
    for (const page of pages) {
      if (!validPages.includes(page)) {
        return res.status(400).json({ message: `Halaman target tidak valid: "${page}".` });
      }
      const rate = await getEffectiveRate(page, start_date);
      pricePerDay += rate;
    }

    const totalCost = pricePerDay * duration;

    // C. Save campaign in sponsorships table
    const result = await pool.query(`
      INSERT INTO sponsorships (sponsor_id, title, target_url, image_url, pages, start_date, end_date, total_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [sponsorId, title, target_url, image_url, pages, start_date, end_date, totalCost]);

    res.status(201).json({
      message: `Kampanye iklan "${title}" berhasil didaftarkan!`,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('[createAd]', err);
    res.status(500).json({ message: 'Gagal membuat kampanye iklan sponsor.' });
  }
};

// 2. Fetch all ads created by the active Sponsor (Sponsor role only)
const getMyAds = async (req, res) => {
  const sponsorId = req.userId;

  try {
    const result = await pool.query(`
      SELECT s.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', cl.id,
                   'old_cost', cl.old_cost,
                   'new_cost', cl.new_cost,
                   'reason', cl.reason,
                   'modified_at', cl.modified_at,
                   'modifier_name', u.name
                 ) ORDER BY cl.id DESC
               ) FILTER (WHERE cl.id IS NOT NULL),
               '[]'::json
             ) as modification_logs
      FROM sponsorships s
      LEFT JOIN sponsorship_cost_logs cl ON s.id = cl.sponsorship_id
      LEFT JOIN users u ON cl.modified_by = u.id
      WHERE s.sponsor_id = $1
      GROUP BY s.id
      ORDER BY s.id DESC
    `, [sponsorId]);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('[getMyAds]', err);
    res.status(500).json({ message: 'Gagal mengambil daftar kampanye iklan Anda.' });
  }
};

// 3. Get pricing rates active on a specific date (Sponsor & Moderator)
const getPricing = async (req, res) => {
  // Read date parameter, default to today
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const pages = ['dashboard', 'competitions', 'matchmaking', 'teams'];
    const rates = {};

    for (const page of pages) {
      rates[page] = await getEffectiveRate(page, dateStr);
    }

    res.json({
      data: {
        date: dateStr,
        rates
      }
    });

  } catch (err) {
    console.error('[getPricing]', err);
    res.status(500).json({ message: 'Gagal mengambil data konfigurasi tarif iklan.' });
  }
};

// 4. Retrieve a randomized active ad targeting a specific page (Public API)
const getActiveAd = async (req, res) => {
  const { page } = req.query; // 'dashboard', 'competitions', 'matchmaking', 'teams'

  if (!page) {
    return res.status(400).json({ message: 'Halaman target penayangan (page) wajib ditentukan.' });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, target_url, image_url 
      FROM sponsorships 
      WHERE is_active = true 
        AND CURRENT_DATE BETWEEN start_date AND end_date
        AND $1 = ANY(pages)
      ORDER BY RANDOM() 
      LIMIT 1
    `, [page]);

    if (result.rows.length === 0) {
      return res.json({ data: null });
    }

    res.json({ data: result.rows[0] });

  } catch (err) {
    console.error('[getActiveAd]', err);
    res.status(500).json({ message: 'Gagal memuat iklan sponsor aktif.' });
  }
};

// 5. Track Penayangan (Impressions) in batch (Public API)
const trackImpression = async (req, res) => {
  const { adIds } = req.body; // Array of ad IDs

  if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'Daftar ID iklan wajib disertakan.' });
  }

  try {
    await pool.query(`
      UPDATE sponsorships 
      SET impressions = impressions + 1 
      WHERE id = ANY($1)
    `, [adIds]);

    res.json({ message: 'Penayangan iklan berhasil dicatat.' });

  } catch (err) {
    console.error('[trackImpression]', err);
    res.status(500).json({ message: 'Gagal menyimpan statistik penayangan iklan.' });
  }
};

// 6. Track Klik (Click) on ad link (Public API)
const trackClick = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      UPDATE sponsorships 
      SET clicks = clicks + 1 
      WHERE id = $1
      RETURNING id, clicks
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Iklan tidak ditemukan.' });
    }

    res.json({ 
      message: 'Klik iklan berhasil dicatat.',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('[trackClick]', err);
    res.status(500).json({ message: 'Gagal menyimpan statistik klik iklan.' });
  }
};

module.exports = {
  createAd,
  getMyAds,
  getPricing,
  getActiveAd,
  trackImpression,
  trackClick
};
