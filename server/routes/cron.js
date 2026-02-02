import express from 'express';
import energyService from '../services/energyService.js';
import priceService from '../services/priceService.js';

const router = express.Router();

// Endpoint for Vercel Cron Jobs to trigger data updates
// POST /api/cron/update-data
router.post('/update-data', async (req, res) => {
  try {
    console.log('Manual data update triggered...');
    
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

    console.log('Manual data update completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Data update completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during manual data update:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Data update failed',
      message: error.message 
    });
  }
});

export default router;
