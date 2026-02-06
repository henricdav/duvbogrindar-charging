import priceService from '../../server/services/priceService.js';

/**
 * GET /api/prices?from=&to=
 * Get spot prices time series
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
}
