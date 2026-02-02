import settingsService from '../../server/services/settingsService.js';

/**
 * Handle /api/settings endpoints
 * GET /api/settings - Get all settings
 * GET /api/settings/pricing - Get pricing configuration
 * PUT /api/settings/pricing - Update pricing configuration
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the URL to determine which endpoint was called
  const { url } = req;
  const isPricingEndpoint = url.includes('/pricing');

  try {
    if (req.method === 'GET') {
      if (isPricingEndpoint) {
        // GET /api/settings/pricing
        const config = await settingsService.getPricingConfig();
        return res.json(config);
      } else {
        // GET /api/settings
        const settings = await settingsService.getAllSettings();
        return res.json(settings);
      }
    } else if (req.method === 'PUT') {
      if (!isPricingEndpoint) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      // PUT /api/settings/pricing
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
      return res.json(updatedConfig);
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Error in settings endpoint:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
