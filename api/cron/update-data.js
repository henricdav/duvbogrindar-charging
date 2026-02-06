import energyService from '../../server/services/energyService.js';
import priceService from '../../server/services/priceService.js';

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
    
    // Check if date range is provided in request body
    let fromDate, toDate;
    
    if (req.body && req.body.from && req.body.to) {
      // Use provided dates (manual fetch with user-selected date range)
      fromDate = new Date(req.body.from);
      toDate = new Date(req.body.to);
      console.log(`Using provided date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    } else {
      // Default to last 7 complete calendar days (for cron job)
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999); // End of today
      
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      fromDate.setHours(0, 0, 0, 0); // Start of 7 days ago
      
      console.log(`Using default date range (last 7 days): ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    }
    
    console.log(`Fetching data for date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Update spot prices for the same date range as energy data
    console.log('Updating spot prices...');
    await priceService.fetchAndStorePrices(fromDate, toDate);

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
