import axios from 'axios';
import pool from '../db/db.js';

/**
 * Fetch spot prices from elprisetjustnu.se for SE3 area (Stockholm)
 * API Documentation: https://www.elprisetjustnu.se/
 * 
 * @param {Date} date - Date to fetch prices for
 * @returns {Array} Array of price records with timestamp and price
 */
async function fetchElprisetJustNuPrices(date) {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_SE3.json`;
    
    console.log(`Fetching prices from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Duvbo-Grindar-Charging-Portal/1.0'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.log('No price data found from elprisetjustnu.se');
      return [];
    }

    const prices = [];
    
    // The API returns an array of hourly prices
    // Each entry typically has: time_start, time_end, SEK_per_kWh, EUR_per_kWh
    // IMPORTANT: time_start is in Swedish timezone (CET/CEST), e.g., "2024-01-15T00:00:00+01:00"
    // We need to normalize to start of hour in Swedish timezone to match energy data
    for (const entry of response.data) {
      if (entry.time_start && entry.SEK_per_kWh !== undefined) {
        // Parse the timestamp (expected format: ISO 8601 with timezone)
        const timestamp = new Date(entry.time_start);
        const pricePerKWh = parseFloat(entry.SEK_per_kWh);
        
        if (!isNaN(pricePerKWh) && !isNaN(timestamp.getTime())) {
          prices.push({
            timestamp: timestamp,
            price: pricePerKWh
          });
        }
      }
    }
    
    console.log(`Sample timestamps from API:`, prices.slice(0, 2).map(p => ({
      original: p.timestamp.toISOString(),
      hourStart: new Date(p.timestamp.getFullYear(), p.timestamp.getMonth(), 
                          p.timestamp.getDate(), p.timestamp.getHours()).toISOString()
    })))

    console.log(`Fetched ${prices.length} price records for ${year}-${month}-${day}`);
    return prices;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`No price data available for date: ${date.toISOString().split('T')[0]}`);
      return [];
    }
    console.error('Failed to fetch prices from elprisetjustnu.se:', error.message);
    throw error;
  }
}

/**
 * Fetch and store spot prices from elprisetjustnu.se
 * Fetches prices for today and tomorrow (if available)
 */
async function fetchAndStorePrices() {
  try {
    console.log('Fetching spot prices from elprisetjustnu.se...');
    
    let insertedCount = 0;
    const today = new Date();
    
    // Fetch today's prices
    const todayPrices = await fetchElprisetJustNuPrices(today);
    
    for (const priceData of todayPrices) {
      try {
        await pool.query(
          `INSERT INTO spotprices (ts, price_sek_per_kwh) 
           VALUES ($1, $2) 
           ON CONFLICT (ts) 
           DO UPDATE SET price_sek_per_kwh = EXCLUDED.price_sek_per_kwh`,
          [priceData.timestamp.toISOString(), priceData.price]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Failed to insert price for ${priceData.timestamp}:`, err.message);
      }
    }
    
    // Fetch tomorrow's prices (if available after 13:00)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    try {
      const tomorrowPrices = await fetchElprisetJustNuPrices(tomorrow);
      
      for (const priceData of tomorrowPrices) {
        try {
          await pool.query(
            `INSERT INTO spotprices (ts, price_sek_per_kwh) 
             VALUES ($1, $2) 
             ON CONFLICT (ts) 
             DO UPDATE SET price_sek_per_kwh = EXCLUDED.price_sek_per_kwh`,
            [priceData.timestamp.toISOString(), priceData.price]
          );
          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert price for ${priceData.timestamp}:`, err.message);
        }
      }
    } catch (error) {
      // Tomorrow's prices might not be available yet, that's OK
      console.log("Tomorrow's prices not yet available (expected before 13:00)");
    }

    console.log(`Stored ${insertedCount} price records`);
    return insertedCount;
  } catch (error) {
    console.error('Failed to fetch and store prices:', error.message);
    throw error;
  }
}

/**
 * Get spot prices from database
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
async function getPrices(fromDate, toDate) {
  try {
    const result = await pool.query(
      `SELECT ts, price_sek_per_kwh 
       FROM spotprices 
       WHERE ts >= $1 AND ts <= $2 
       ORDER BY ts`,
      [fromDate, toDate]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get prices from database:', error.message);
    throw error;
  }
}

export default {
  fetchAndStorePrices,
  getPrices
};
