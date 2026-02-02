import axios from 'axios';
import pool from '../db/db.js';

/**
 * Fetch spot prices from Nord Pool for SE3 area
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
async function fetchNordPoolPrices(fromDate, toDate) {
  try {
    // Nord Pool API typically returns prices for the current and next day
    // We'll fetch data and filter by date range
    const response = await axios.get('https://www.nordpoolgroup.com/api/marketdata/page/10', {
      params: {
        currency: 'SEK',
        area: 'SE3'
      }
    });

    if (!response.data || !response.data.data || !response.data.data.Rows) {
      console.log('No price data found from Nord Pool');
      return [];
    }

    const prices = [];
    const rows = response.data.data.Rows;

    for (const row of rows) {
      if (row.IsExtraRow || !row.Columns) continue;

      const hour = row.Name; // Format like "00 - 01"
      
      for (const col of row.Columns) {
        if (col.Name === 'SE3' && col.Value) {
          // Extract date from column group or use response date
          // Nord Pool typically returns hourly data
          // The value is in SEK/MWh, we need to convert to SEK/kWh
          const pricePerMWh = parseFloat(col.Value.replace(/\s/g, '').replace(',', '.'));
          const pricePerKWh = pricePerMWh / 1000;

          // Try to construct timestamp from hour and date
          // This is simplified; actual implementation may need date parsing
          prices.push({
            hour,
            price: pricePerKWh
          });
        }
      }
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch Nord Pool prices:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch and store spot prices from Nord Pool
 */
async function fetchAndStorePrices() {
  try {
    console.log('Fetching spot prices from Nord Pool...');
    
    const response = await axios.get('https://www.nordpoolgroup.com/api/marketdata/page/10', {
      params: {
        currency: 'SEK',
        area: 'SE3'
      }
    });

    if (!response.data || !response.data.data || !response.data.data.Rows) {
      console.log('No price data found from Nord Pool');
      return 0;
    }

    const rows = response.data.data.Rows;
    let insertedCount = 0;

    // Get the date range from the data
    const dateFrom = response.data.data.DataStartdate;
    const dateTo = response.data.data.DataEnddate;

    console.log(`Processing price data from ${dateFrom} to ${dateTo}`);

    // Process each hour row
    for (const row of rows) {
      if (row.IsExtraRow || !row.Columns) continue;

      // Extract hour from row name (e.g., "00 - 01" => 0)
      const hourMatch = row.Name.match(/^(\d{2})/);
      if (!hourMatch) continue;
      
      const hour = parseInt(hourMatch[1]);

      // Process each day column
      for (const col of row.Columns) {
        // Find SE3 column or specific date columns
        if (col.Value && col.Name) {
          try {
            const pricePerMWh = parseFloat(col.Value.replace(/\s/g, '').replace(',', '.'));
            if (isNaN(pricePerMWh)) continue;
            
            const pricePerKWh = pricePerMWh / 1000;

            // Create timestamp - this is simplified
            // In production, you'd parse the actual date from column headers
            const baseDate = new Date(dateFrom);
            baseDate.setUTCHours(hour, 0, 0, 0);

            await pool.query(
              `INSERT INTO spotprices (ts, price_sek_per_kwh) 
               VALUES ($1, $2) 
               ON CONFLICT (ts) 
               DO UPDATE SET price_sek_per_kwh = EXCLUDED.price_sek_per_kwh`,
              [baseDate.toISOString(), pricePerKWh]
            );
            insertedCount++;
          } catch (err) {
            // Skip invalid entries
            continue;
          }
        }
      }
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
  fetchNordPoolPrices,
  fetchAndStorePrices,
  getPrices
};
