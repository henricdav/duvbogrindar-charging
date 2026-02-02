import pool from '../../server/db/db.js';

/**
 * GET /api/chargers
 * List all chargers
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
    const result = await pool.query('SELECT id, name FROM chargers ORDER BY id');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching chargers:', error);
    res.status(500).json({ error: 'Failed to fetch chargers' });
  }
}
