import express from 'express';
import ExcelJS from 'exceljs';
import pool from '../db/db.js';
import energyService from '../services/energyService.js';
import settingsService from '../services/settingsService.js';

const router = express.Router();

/**
 * GET /api/chargers
 * List all chargers
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM chargers ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chargers:', error);
    res.status(500).json({ error: 'Failed to fetch chargers' });
  }
});

/**
 * GET /api/chargers/:id/energy?from=&to=
 * Get hourly energy consumption for a specific charger
 */
router.get('/:id/energy', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if charger exists
    const chargerResult = await pool.query('SELECT id FROM chargers WHERE id = $1', [id]);
    if (chargerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charger not found' });
    }

    const energyData = await energyService.getEnergyData(id, fromDate, toDate);
    
    res.json({
      chargerId: id,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      data: energyData.map(row => ({
        timestamp: row.ts,
        kwh: parseFloat(row.kwh)
      }))
    });
  } catch (error) {
    console.error('Error fetching energy data:', error);
    res.status(500).json({ error: 'Failed to fetch energy data' });
  }
});

/**
 * GET /api/chargers/:id/cost?from=&to=
 * Get hourly cost data for a specific charger (joins energy and spot prices)
 */
router.get('/:id/cost', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if charger exists
    const chargerResult = await pool.query('SELECT id FROM chargers WHERE id = $1', [id]);
    if (chargerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charger not found' });
    }

    // Get pricing configuration
    const pricingConfig = await settingsService.getPricingConfig();

    console.log(`Fetching cost data for charger ${id} from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Join energy and price data
    // NOTE: Both timestamps are normalized to Europe/Stockholm timezone before truncating to hour
    // This ensures Swedish electricity prices (which are per Swedish hour) match correctly
    // with energy consumption data regardless of how the timestamps were originally stored
    const result = await pool.query(
      `SELECT 
        he.ts as timestamp,
        he.kwh,
        sp.price_sek_per_kwh
       FROM hourly_energy he
       LEFT JOIN spotprices sp ON 
         DATE_TRUNC('hour', he.ts AT TIME ZONE 'Europe/Stockholm') = 
         DATE_TRUNC('hour', sp.ts AT TIME ZONE 'Europe/Stockholm')
       WHERE he.charger_id = $1 AND he.ts >= $2 AND he.ts <= $3
       ORDER BY he.ts`,
      [id, fromDate, toDate]
    );

    console.log(`Query returned ${result.rows.length} rows for charger ${id}`);
    if (result.rows.length === 0) {
      console.warn(`No data found for charger ${id} in date range ${fromDate.toISOString()} to ${toDate.toISOString()}`);
      console.warn(`This could mean: 1) No energy data in hourly_energy table, 2) Date range doesn't match available data, 3) Charger ID mismatch`);
    } else {
      console.log(`Sample data (first row):`, {
        timestamp: result.rows[0].timestamp,
        kwh: result.rows[0].kwh,
        price_sek_per_kwh: result.rows[0].price_sek_per_kwh
      });
    }

    // Calculate costs based on pricing configuration
    const dataWithCosts = result.rows.map(row => {
      let effectivePrice;
      let priceBreakdown = {};
      
      if (pricingConfig.useFixedPrice) {
        // Use fixed price (overrides everything)
        effectivePrice = pricingConfig.fixedPriceSEKPerKwh;
        priceBreakdown = {
          fixedPrice: pricingConfig.fixedPriceSEKPerKwh
        };
      } else {
        // Formula: Total = Spot price + VAT + Fixed cost per kWh
        // VAT is applied to the spot price: spotPrice * (1 + vatPercentage/100)
        const spotPrice = row.price_sek_per_kwh ? parseFloat(row.price_sek_per_kwh) : 0;
        const spotPriceWithVAT = spotPrice * (1 + pricingConfig.vatPercentage / 100);
        effectivePrice = spotPriceWithVAT + pricingConfig.fixedCostSEKPerKwh;
        
        priceBreakdown = {
          spotPrice: spotPrice,
          vat: spotPriceWithVAT - spotPrice,
          fixedCost: pricingConfig.fixedCostSEKPerKwh,
          total: effectivePrice
        };
      }

      const kwh = parseFloat(row.kwh);
      const cost = kwh * effectivePrice;

      return {
        timestamp: row.timestamp,
        kwh: kwh,
        priceSEKPerKwh: effectivePrice,
        spotPriceSEKPerKwh: row.price_sek_per_kwh ? parseFloat(row.price_sek_per_kwh) : null,
        priceBreakdown: priceBreakdown,
        costSEK: cost
      };
    });

    const totalKwh = dataWithCosts.reduce((sum, row) => sum + row.kwh, 0);
    const totalCost = dataWithCosts.reduce((sum, row) => sum + row.costSEK, 0);

    res.json({
      chargerId: id,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      pricingConfig: {
        useFixedPrice: pricingConfig.useFixedPrice,
        fixedPriceSEKPerKwh: pricingConfig.fixedPriceSEKPerKwh,
        vatPercentage: pricingConfig.vatPercentage,
        fixedCostSEKPerKwh: pricingConfig.fixedCostSEKPerKwh
      },
      summary: {
        totalKwh: totalKwh.toFixed(2),
        totalCostSEK: totalCost.toFixed(2),
        averagePriceSEKPerKwh: totalKwh > 0 ? (totalCost / totalKwh).toFixed(4) : 0
      },
      data: dataWithCosts
    });
  } catch (error) {
    console.error('Error fetching cost data:', error);
    res.status(500).json({ error: 'Failed to fetch cost data' });
  }
});

/**
 * GET /api/chargers/:id/cost/export?from=&to=
 * Export cost data to Excel
 */
router.get('/:id/cost/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameter' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if charger exists
    const chargerResult = await pool.query('SELECT id, name FROM chargers WHERE id = $1', [id]);
    if (chargerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Charger not found' });
    }
    const chargerName = chargerResult.rows[0].name;

    // Get pricing configuration
    const pricingConfig = await settingsService.getPricingConfig();

    // Get cost data
    // NOTE: Both timestamps are normalized to Europe/Stockholm timezone before truncating to hour
    // This ensures Swedish electricity prices (which are per Swedish hour) match correctly
    // with energy consumption data regardless of how the timestamps were originally stored
    const result = await pool.query(
      `SELECT 
        he.ts as timestamp,
        he.kwh,
        sp.price_sek_per_kwh
       FROM hourly_energy he
       LEFT JOIN spotprices sp ON 
         DATE_TRUNC('hour', he.ts AT TIME ZONE 'Europe/Stockholm') = 
         DATE_TRUNC('hour', sp.ts AT TIME ZONE 'Europe/Stockholm')
       WHERE he.charger_id = $1 AND he.ts >= $2 AND he.ts <= $3
       ORDER BY he.ts`,
      [id, fromDate, toDate]
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Energy Costs');

    // Add title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `Energy Consumption and Costs - ${chargerName} (${id})`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `Period: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Add pricing info
    worksheet.mergeCells('A3:F3');
    const pricingInfo = pricingConfig.useFixedPrice 
      ? `Pricing: Fixed rate ${pricingConfig.fixedPriceSEKPerKwh} SEK/kWh`
      : `Pricing: Spot price + ${pricingConfig.vatPercentage}% VAT + ${pricingConfig.fixedCostSEKPerKwh} SEK/kWh fixed cost`;
    worksheet.getCell('A3').value = pricingInfo;
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Timestamp', 'Energy (kWh)', 'Spot Price (SEK/kWh)', 'VAT', 'Fixed Cost', 'Total Price (SEK/kWh)', 'Cost (SEK)']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Add data rows
    let totalKwh = 0;
    let totalCost = 0;

    result.rows.forEach(row => {
      let effectivePrice;
      let spotPrice = row.price_sek_per_kwh ? parseFloat(row.price_sek_per_kwh) : 0;
      let vat = 0;
      let fixedCost = 0;
      
      if (pricingConfig.useFixedPrice) {
        effectivePrice = pricingConfig.fixedPriceSEKPerKwh;
      } else {
        const spotPriceWithVAT = spotPrice * (1 + pricingConfig.vatPercentage / 100);
        vat = spotPriceWithVAT - spotPrice;
        fixedCost = pricingConfig.fixedCostSEKPerKwh;
        effectivePrice = spotPriceWithVAT + fixedCost;
      }

      const kwh = parseFloat(row.kwh);
      const cost = kwh * effectivePrice;
      
      totalKwh += kwh;
      totalCost += cost;

      worksheet.addRow([
        new Date(row.timestamp).toISOString(),
        kwh,
        spotPrice || 'N/A',
        pricingConfig.useFixedPrice ? 'N/A' : vat,
        pricingConfig.useFixedPrice ? 'N/A' : fixedCost,
        effectivePrice,
        cost
      ]);
    });

    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['TOTAL', totalKwh, '', '', '', '', totalCost]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    };

    // Format columns
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 20;
    worksheet.getColumn(7).width = 15;

    // Format numbers
    worksheet.getColumn(2).numFmt = '0.00';
    worksheet.getColumn(3).numFmt = '0.0000';
    worksheet.getColumn(4).numFmt = '0.0000';
    worksheet.getColumn(5).numFmt = '0.0000';
    worksheet.getColumn(6).numFmt = '0.0000';
    worksheet.getColumn(7).numFmt = '0.00';

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=energy-costs-${id}-${Date.now()}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting cost data:', error);
    res.status(500).json({ error: 'Failed to export cost data' });
  }
});

export default router;
