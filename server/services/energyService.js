import easeeService from './easeeService.js';
import pool from '../db/db.js';

/**
 * Fetch and store hourly energy data for a specific charger
 * @param {string} chargerId - The charger ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
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

    for (const entry of energyData) {
      try {
        await pool.query(
          `INSERT INTO hourly_energy (charger_id, ts, kwh) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (charger_id, ts) 
           DO UPDATE SET kwh = EXCLUDED.kwh`,
          [chargerId, entry.timestamp || entry.ts, entry.value || entry.kWh || 0]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Error inserting energy data for ${chargerId}:`, err.message);
      }
    }

    console.log(`Stored ${insertedCount} energy records for charger ${chargerId}`);
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
