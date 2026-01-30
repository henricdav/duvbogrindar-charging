import express from 'express';
import priceService from '../services/priceService.js';

const router = express.Router();

/**
 * GET /api/prices?from=&to=
 * Get spot prices time series
 */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const prices = await priceService.getPrices(fromDate, toDate);
    
    res.json({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      data: prices.map(row => ({
        timestamp: row.ts,
        priceSEKPerKwh: parseFloat(row.price_sek_per_kwh)
      }))
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

export default router;
