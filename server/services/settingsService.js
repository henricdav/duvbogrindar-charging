import pool from '../db/db.js';

/**
 * Get a setting value by key
 * @param {string} key - The setting key
 * @returns {Promise<string|null>} - The setting value or null if not found
 */
async function getSetting(key) {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get all settings
 * @returns {Promise<Array>} - Array of all settings
 */
async function getAllSettings() {
  try {
    const result = await pool.query('SELECT key, value, description FROM settings ORDER BY key');
    return result.rows;
  } catch (error) {
    console.error('Failed to get all settings:', error.message);
    throw error;
  }
}

/**
 * Set a setting value
 * @param {string} key - The setting key
 * @param {string} value - The setting value
 * @returns {Promise<void>}
 */
async function setSetting(key, value) {
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get pricing configuration
 * @returns {Promise<Object>} - Pricing configuration object
 */
async function getPricingConfig() {
  try {
    const useFixedPrice = await getSetting('use_fixed_price');
    const fixedPrice = await getSetting('fixed_price_sek_per_kwh');
    const vatPercentage = await getSetting('vat_percentage');
    const fixedCost = await getSetting('fixed_cost_sek_per_kwh');

    return {
      useFixedPrice: useFixedPrice === 'true',
      fixedPriceSEKPerKwh: parseFloat(fixedPrice || '0'),
      vatPercentage: parseFloat(vatPercentage || '25'),
      fixedCostSEKPerKwh: parseFloat(fixedCost || '0')
    };
  } catch (error) {
    console.error('Failed to get pricing config:', error.message);
    throw error;
  }
}

/**
 * Update pricing configuration
 * @param {Object} config - Pricing configuration
 * @returns {Promise<void>}
 */
async function updatePricingConfig(config) {
  try {
    if (config.useFixedPrice !== undefined) {
      await setSetting('use_fixed_price', config.useFixedPrice.toString());
    }
    if (config.fixedPriceSEKPerKwh !== undefined) {
      await setSetting('fixed_price_sek_per_kwh', config.fixedPriceSEKPerKwh.toString());
    }
    if (config.vatPercentage !== undefined) {
      await setSetting('vat_percentage', config.vatPercentage.toString());
    }
    if (config.fixedCostSEKPerKwh !== undefined) {
      await setSetting('fixed_cost_sek_per_kwh', config.fixedCostSEKPerKwh.toString());
    }
  } catch (error) {
    console.error('Failed to update pricing config:', error.message);
    throw error;
  }
}

export default {
  getSetting,
  getAllSettings,
  setSetting,
  getPricingConfig,
  updatePricingConfig
};
