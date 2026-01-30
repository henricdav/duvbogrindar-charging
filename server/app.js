import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import chargersRouter from './routes/chargers.js';
import pricesRouter from './routes/prices.js';
import energyService from './services/energyService.js';
import priceService from './services/priceService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chargers', chargersRouter);
app.use('/api/prices', pricesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Duvbo Grindar Charging API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chargers: '/api/chargers',
      energy: '/api/chargers/:id/energy?from=&to=',
      cost: '/api/chargers/:id/cost?from=&to=',
      prices: '/api/prices?from=&to='
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Cron job to update energy and price data every 30 minutes
// This runs at 00 and 30 minutes past every hour
cron.schedule('0,30 * * * *', async () => {
  console.log('Running scheduled data update...');
  
  try {
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

    console.log('Scheduled data update completed successfully');
  } catch (error) {
    console.error('Error during scheduled data update:', error.message);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Cron job scheduled: Data updates every 30 minutes');
  
  // Perform initial data fetch on startup
  setTimeout(async () => {
    console.log('Performing initial data fetch...');
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);

      await priceService.fetchAndStorePrices();
      await energyService.fetchAllChargersEnergy(fromDate, toDate);
      console.log('Initial data fetch completed');
    } catch (error) {
      console.error('Error during initial data fetch:', error.message);
    }
  }, 5000); // Wait 5 seconds after startup
});

export default app;
