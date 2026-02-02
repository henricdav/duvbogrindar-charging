import energyService from '../../../server/services/energyService.js';
import priceService from '../../../server/services/priceService.js';

/**
 * POST /api/cron/update-data
 * Endpoint for Vercel Cron Jobs to trigger data updates
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('Scheduled/manual data update triggered...');
    
    // Fetch data for the last 7 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    // Update spot prices
    console.log('Updating spot prices...');
    await priceService.fetchAndStorePrices();

    // Update energy data for all chargers
    console.log('Updating energy data...');
    await energyService.fetchAllChargersEnergy(fromDate, toDate);

    console.log('Scheduled/manual data update completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Data update completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during scheduled/manual data update:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Data update failed',
      message: error.message 
    });
  }
}
