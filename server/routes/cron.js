import express from 'express';
import energyService from '../services/energyService.js';
import priceService from '../services/priceService.js';

const router = express.Router();

// Endpoint for Vercel Cron Jobs to trigger data updates
// POST /api/cron/update-data
router.post('/update-data', async (req, res) => {
  try {
    console.log('Scheduled/manual data update triggered...');
    
    // Fetch data for full calendar days (last 7 complete days)
    const toDate = new Date();
    toDate.setHours(23, 59, 59, 999); // End of today
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    fromDate.setHours(0, 0, 0, 0); // Start of 7 days ago
    
    console.log(`Fetching data for full calendar days: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

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
});

export default router;
