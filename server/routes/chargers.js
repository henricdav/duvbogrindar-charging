import express from 'express';
import pool from '../db/db.js';
import energyService from '../services/energyService.js';

const router = express.Router();

/**
 * GET /api/chargers
 * List all chargers
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM chargers ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chargers:', error);
    res.status(500).json({ error: 'Failed to fetch chargers' });
  }
});

/**
 * GET /api/chargers/:id/energy?from=&to=
 * Get hourly energy consumption for a specific charger
 */
router.get('/:id/energy', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if charger exists
    const chargerResult = await pool.query('SELECT id FROM chargers WHERE id = $1', [id]);
    if (chargerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charger not found' });
    }

    const energyData = await energyService.getEnergyData(id, fromDate, toDate);
    
    res.json({
      chargerId: id,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      data: energyData.map(row => ({
        timestamp: row.ts,
        kwh: parseFloat(row.kwh)
      }))
    });
  } catch (error) {
    console.error('Error fetching energy data:', error);
    res.status(500).json({ error: 'Failed to fetch energy data' });
  }
});

/**
 * GET /api/chargers/:id/cost?from=&to=
 * Get hourly cost data for a specific charger (joins energy and spot prices)
 */
router.get('/:id/cost', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if charger exists
    const chargerResult = await pool.query('SELECT id FROM chargers WHERE id = $1', [id]);
    if (chargerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charger not found' });
    }

    // Join energy and price data
    const result = await pool.query(
      `SELECT 
        he.ts as timestamp,
        he.kwh,
        sp.price_sek_per_kwh,
        (he.kwh * sp.price_sek_per_kwh) as cost_sek
       FROM hourly_energy he
       LEFT JOIN spotprices sp ON DATE_TRUNC('hour', he.ts) = DATE_TRUNC('hour', sp.ts)
       WHERE he.charger_id = $1 AND he.ts >= $2 AND he.ts <= $3
       ORDER BY he.ts`,
      [id, fromDate, toDate]
    );

    const totalKwh = result.rows.reduce((sum, row) => sum + parseFloat(row.kwh), 0);
    const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.cost_sek || 0), 0);

    res.json({
      chargerId: id,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      summary: {
        totalKwh: totalKwh.toFixed(2),
        totalCostSEK: totalCost.toFixed(2),
        averagePriceSEKPerKwh: totalKwh > 0 ? (totalCost / totalKwh).toFixed(4) : 0
      },
      data: result.rows.map(row => ({
        timestamp: row.timestamp,
        kwh: parseFloat(row.kwh),
        priceSEKPerKwh: row.price_sek_per_kwh ? parseFloat(row.price_sek_per_kwh) : null,
        costSEK: row.cost_sek ? parseFloat(row.cost_sek) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching cost data:', error);
    res.status(500).json({ error: 'Failed to fetch cost data' });
  }
});

export default router;
