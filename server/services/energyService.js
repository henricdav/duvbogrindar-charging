import easeeService from './easeeService.js';
import pool from '../db/db.js';

/**
 * Fetch and store hourly energy data for a specific charger
 * @param {string} chargerId - The charger ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * 
 * Expected Easee API response format:
 * [
 *   { timestamp: "2024-01-15T00:00:00Z", value: 12.5 },
 *   { timestamp: "2024-01-15T01:00:00Z", value: 15.3 },
 *   ...
 * ]
 * Alternative field names: ts, kWh, energy
 */
async function fetchAndStoreEnergy(chargerId, fromDate, toDate) {
  try {
    const from = fromDate.toISOString();
    const to = toDate.toISOString();

    const energyData = await easeeService.getHourlyEnergy(chargerId, from, to);

    if (!energyData || energyData.length === 0) {
      console.log(`No energy data found for charger ${chargerId}`);
      return 0;
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const entry of energyData) {
      try {
        // Log the first entry to see ALL available fields
        if (insertedCount === 0) {
          console.log(`First entry for ${chargerId} - ALL fields:`, JSON.stringify(entry, null, 2));
          console.log(`Available field names:`, Object.keys(entry));
        }
        
        // Extract timestamp - check multiple possible field names
        const timestamp = entry.timestamp || entry.ts || entry.time || entry.date;
        
        // Validate that we have a timestamp
        if (!timestamp) {
          console.warn(`Skipping entry for ${chargerId}: missing timestamp. Entry data:`, JSON.stringify(entry));
          skippedCount++;
          continue;
        }

        // Extract energy value - check multiple possible field names
        // IMPORTANT: Check if value is actually zero vs undefined
        let energyValue;
        if (entry.value !== undefined && entry.value !== null) {
          energyValue = parseFloat(entry.value);
        } else if (entry.kWh !== undefined && entry.kWh !== null) {
          energyValue = parseFloat(entry.kWh);
        } else if (entry.kwh !== undefined && entry.kwh !== null) {
          energyValue = parseFloat(entry.kwh);
        } else if (entry.energy !== undefined && entry.energy !== null) {
          energyValue = parseFloat(entry.energy);
        } else {
          console.warn(`Skipping entry for ${chargerId}: no energy value found in fields: ${Object.keys(entry).join(', ')}`);
          skippedCount++;
          continue;
        }
        
        // Log if we're getting zero values
        if (energyValue === 0 && insertedCount < 3) {
          console.log(`WARNING: Zero energy value for ${chargerId} at ${timestamp}. Full entry:`, JSON.stringify(entry));
        }
        
        // Validate timestamp can be converted to a valid date
        const timestampDate = new Date(timestamp);
        if (isNaN(timestampDate.getTime())) {
          console.warn(`Skipping entry for ${chargerId}: invalid timestamp "${timestamp}". Entry data:`, JSON.stringify(entry));
          skippedCount++;
          continue;
        }

        await pool.query(
          `INSERT INTO hourly_energy (charger_id, ts, kwh) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (charger_id, ts) 
           DO UPDATE SET kwh = EXCLUDED.kwh`,
          [chargerId, timestampDate.toISOString(), energyValue]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Error inserting energy data for ${chargerId}:`, err.message);
        console.error(`Entry data:`, JSON.stringify(entry));
        skippedCount++;
      }
    }

    if (skippedCount > 0) {
      console.log(`Stored ${insertedCount} energy records for charger ${chargerId}, skipped ${skippedCount} invalid entries`);
    } else {
      console.log(`Stored ${insertedCount} energy records for charger ${chargerId}`);
    }
    
    return insertedCount;
  } catch (error) {
    console.error(`Failed to fetch and store energy for charger ${chargerId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch and store energy data for all chargers
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
async function fetchAllChargersEnergy(fromDate, toDate) {
  try {
    const result = await pool.query('SELECT id FROM chargers');
    const chargers = result.rows;

    console.log(`Fetching energy data for ${chargers.length} chargers...`);

    const promises = chargers.map(charger => 
      fetchAndStoreEnergy(charger.id, fromDate, toDate)
        .catch(err => {
          console.error(`Failed for charger ${charger.id}:`, err.message);
          return 0;
        })
    );

    const results = await Promise.all(promises);
    const totalInserted = results.reduce((sum, count) => sum + count, 0);

    console.log(`Total energy records stored: ${totalInserted}`);
    return totalInserted;
  } catch (error) {
    console.error('Failed to fetch energy for all chargers:', error.message);
    throw error;
  }
}

/**
 * Get energy data from database for a specific charger
 * @param {string} chargerId - The charger ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
async function getEnergyData(chargerId, fromDate, toDate) {
  try {
    const result = await pool.query(
      `SELECT ts, kwh 
       FROM hourly_energy 
       WHERE charger_id = $1 AND ts >= $2 AND ts <= $3 
       ORDER BY ts`,
      [chargerId, fromDate, toDate]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get energy data from database:', error.message);
    throw error;
  }
}

export default {
  fetchAndStoreEnergy,
  fetchAllChargersEnergy,
  getEnergyData
};
