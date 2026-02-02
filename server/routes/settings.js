import express from 'express';
import settingsService from '../services/settingsService.js';

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * GET /api/settings/pricing
 * Get pricing configuration
 */
router.get('/pricing', async (req, res) => {
  try {
    const config = await settingsService.getPricingConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({ error: 'Failed to fetch pricing configuration' });
  }
});

/**
 * PUT /api/settings/pricing
 * Update pricing configuration
 */
router.put('/pricing', async (req, res) => {
  try {
    const { useFixedPrice, fixedPriceSEKPerKwh, vatPercentage, fixedCostSEKPerKwh } = req.body;

    // Validate input
    if (useFixedPrice !== undefined && typeof useFixedPrice !== 'boolean') {
      return res.status(400).json({ error: 'useFixedPrice must be a boolean' });
    }

    if (fixedPriceSEKPerKwh !== undefined) {
      const price = parseFloat(fixedPriceSEKPerKwh);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'fixedPriceSEKPerKwh must be a non-negative number' });
      }
    }

    if (vatPercentage !== undefined) {
      const vat = parseFloat(vatPercentage);
      if (isNaN(vat) || vat < 0 || vat > 100) {
        return res.status(400).json({ error: 'vatPercentage must be between 0 and 100' });
      }
    }

    if (fixedCostSEKPerKwh !== undefined) {
      const cost = parseFloat(fixedCostSEKPerKwh);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: 'fixedCostSEKPerKwh must be a non-negative number' });
      }
    }

    await settingsService.updatePricingConfig(req.body);
    
    // Return updated config
    const updatedConfig = await settingsService.getPricingConfig();
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating pricing config:', error);
    res.status(500).json({ error: 'Failed to update pricing configuration' });
  }
});

export default router;
