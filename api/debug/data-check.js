import pool from '../../server/db/db.js';

/**
 * GET /api/debug/data-check
 * Debug endpoint to check what data exists in the database
 * Helps diagnose timestamp and data issues
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Check hourly_energy table
    const energyCount = await pool.query('SELECT COUNT(*) as count FROM hourly_energy');
    const energySample = await pool.query(`
      SELECT charger_id, ts, kwh, 
             ts AT TIME ZONE 'Europe/Stockholm' as ts_swedish,
             DATE_TRUNC('hour', ts AT TIME ZONE 'Europe/Stockholm') as hour_swedish
      FROM hourly_energy 
      ORDER BY ts DESC 
      LIMIT 5
    `);

    // Check spotprices table
    const priceCount = await pool.query('SELECT COUNT(*) as count FROM spotprices');
    const priceSample = await pool.query(`
      SELECT ts, price_sek_per_kwh,
             ts AT TIME ZONE 'Europe/Stockholm' as ts_swedish,
             DATE_TRUNC('hour', ts AT TIME ZONE 'Europe/Stockholm') as hour_swedish
      FROM spotprices 
      ORDER BY ts DESC 
      LIMIT 5
    `);

    // Check if there are any matches
    const joinCheck = await pool.query(`
      SELECT 
        he.charger_id,
        he.ts as energy_ts,
        he.ts AT TIME ZONE 'Europe/Stockholm' as energy_ts_swedish,
        sp.ts as price_ts,
        sp.ts AT TIME ZONE 'Europe/Stockholm' as price_ts_swedish,
        he.kwh,
        sp.price_sek_per_kwh
      FROM hourly_energy he
      INNER JOIN spotprices sp ON 
        DATE_TRUNC('hour', he.ts AT TIME ZONE 'Europe/Stockholm') = 
        DATE_TRUNC('hour', sp.ts AT TIME ZONE 'Europe/Stockholm')
      LIMIT 5
    `);

    // Get date range of data
    const energyRange = await pool.query(`
      SELECT 
        MIN(ts) as min_ts, 
        MAX(ts) as max_ts,
        MIN(ts AT TIME ZONE 'Europe/Stockholm') as min_ts_swedish,
        MAX(ts AT TIME ZONE 'Europe/Stockholm') as max_ts_swedish
      FROM hourly_energy
    `);
    
    const priceRange = await pool.query(`
      SELECT 
        MIN(ts) as min_ts, 
        MAX(ts) as max_ts,
        MIN(ts AT TIME ZONE 'Europe/Stockholm') as min_ts_swedish,
        MAX(ts AT TIME ZONE 'Europe/Stockholm') as max_ts_swedish
      FROM spotprices
    `);

    res.json({
      hourly_energy: {
        total_count: energyCount.rows[0].count,
        date_range: energyRange.rows[0],
        sample: energySample.rows
      },
      spotprices: {
        total_count: priceCount.rows[0].count,
        date_range: priceRange.rows[0],
        sample: priceSample.rows
      },
      join_test: {
        matched_rows: joinCheck.rows.length,
        sample_matches: joinCheck.rows
      },
      diagnosis: {
        energy_has_data: parseInt(energyCount.rows[0].count) > 0,
        prices_have_data: parseInt(priceCount.rows[0].count) > 0,
        join_works: joinCheck.rows.length > 0,
        potential_issue: joinCheck.rows.length === 0 && 
                        parseInt(energyCount.rows[0].count) > 0 && 
                        parseInt(priceCount.rows[0].count) > 0 
                        ? 'Data exists but timestamps don\'t match - check timezone handling'
                        : 'Check if data has been fetched'
      }
    });
  } catch (error) {
    console.error('Error in data check:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
