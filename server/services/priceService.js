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
    for (const entry of response.data) {
      if (entry.time_start && entry.SEK_per_kWh !== undefined) {
        // Parse the timestamp (expected format: ISO 8601)
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
 * Fetches prices for the specified date range
 * @param {Date} fromDate - Start date (defaults to 7 days ago)
 * @param {Date} toDate - End date (defaults to today)
 */
async function fetchAndStorePrices(fromDate = null, toDate = null) {
  try {
    // Default to 7 days ago through today if not specified
    if (!toDate) {
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
    }
    if (!fromDate) {
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 7);
      fromDate.setHours(0, 0, 0, 0);
    }
    
    console.log(`Fetching spot prices from elprisetjustnu.se for date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);
    
    let insertedCount = 0;
    
    // Loop through each date in the range
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`Fetching prices for date: ${dateStr}`);
      
      try {
        const dayPrices = await fetchElprisetJustNuPrices(new Date(currentDate));
        
        for (const priceData of dayPrices) {
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
        // Some dates might not be available yet, that's OK
        console.log(`Prices not available for ${dateStr} (might be future date)`);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Stored ${insertedCount} price records for date range`);
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
