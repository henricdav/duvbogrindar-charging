# Data Fetching Fix - Zero kWh Values and Calendar Days

## Issues Fixed

### Issue 1: Zero kWh Values in hourly_energy Table
**Problem:** Energy consumption values (kwh column) were showing as zero even though charging data exists.

**Root Cause:** The code was not properly detecting which field the Easee API uses for energy values, or the API might actually be returning zero values.

**Solution:**
- Enhanced logging to show ALL fields in the API response
- Logs the first entry with complete structure: `JSON.stringify(entry, null, 2)`
- Logs available field names: `Object.keys(entry)`
- Properly distinguishes between undefined/null vs actual zero values
- Skips entries only if NO energy field is found
- Warns when zero values are encountered (helps diagnose if source data is actually zero)

### Issue 2: Partial Day Fetching
**Problem:** Data was fetched from "current time - 7 days" to "current time", missing data at start/end of days.

**Root Cause:** Using `new Date()` without setting hours/minutes creates partial days.

**Solution:**
```javascript
// OLD (partial days)
const toDate = new Date();  // e.g., 2024-02-03 14:30:00
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);  // e.g., 2024-01-27 14:30:00

// NEW (full calendar days)
const toDate = new Date();
toDate.setHours(23, 59, 59, 999);  // End of today: 2024-02-03 23:59:59.999
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);
fromDate.setHours(0, 0, 0, 0);  // Start of 7 days ago: 2024-01-27 00:00:00.000
```

### Issue 3: Frontend Shows "Failed to load data"
**Problem:** No data displayed even though data might exist in database.

**Related To:**
- If kwh values are zero, costs are zero, appears as no data
- If timestamps don't match between tables, JOIN returns empty
- If no data has been fetched yet

**Solution:**
- Fixed kwh value extraction (issue 1)
- Maintained timezone-aware JOINs for Swedish electricity prices
- Added debug endpoint to diagnose

## Changes Made

### 1. energyService.js

**Enhanced Energy Value Extraction:**
```javascript
// Log first entry completely
if (insertedCount === 0) {
  console.log(`First entry for ${chargerId} - ALL fields:`, JSON.stringify(entry, null, 2));
  console.log(`Available field names:`, Object.keys(entry));
}

// Check each field explicitly
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
  console.warn(`Skipping entry: no energy value found in fields: ${Object.keys(entry).join(', ')}`);
  skippedCount++;
  continue;
}

// Warn if zero values
if (energyValue === 0 && insertedCount < 3) {
  console.log(`WARNING: Zero energy value at ${timestamp}. Full entry:`, JSON.stringify(entry));
}
```

### 2. api/cron/update-data.js & server/routes/cron.js

**Full Calendar Days:**
```javascript
// Set to end of today
const toDate = new Date();
toDate.setHours(23, 59, 59, 999);

// Set to start of 7 days ago
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);
fromDate.setHours(0, 0, 0, 0);

console.log(`Fetching data for full calendar days: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
```

### 3. api/debug/data-check.js (NEW)

**Debug Endpoint:**
- Shows count and samples from `hourly_energy` table
- Shows count and samples from `spotprices` table
- Tests if JOIN works and shows sample matches
- Displays date ranges with timezone conversions
- Provides diagnosis of what might be wrong

## Timezone Handling (KEPT)

The JOIN queries use timezone-aware matching:
```sql
LEFT JOIN spotprices sp ON 
  DATE_TRUNC('hour', he.ts AT TIME ZONE 'Europe/Stockholm') = 
  DATE_TRUNC('hour', sp.ts AT TIME ZONE 'Europe/Stockholm')
```

**Why this is important:**
- Swedish electricity prices are per Swedish hour (CET/CEST)
- elprisetjustnu.se returns timestamps like `2024-02-03T00:00:00+01:00` (midnight CET)
- When stored in PostgreSQL as TIMESTAMPTZ, converted to UTC: `2024-02-02T23:00:00Z`
- Without timezone normalization, Swedish midnight hour wouldn't match
- Normalizing both to `Europe/Stockholm` before truncating ensures correct hour matching

## Debugging

### Step 1: Trigger Data Fetch

Via UI:
1. Open the application
2. Click "🔄 Fetch Data Now" button
3. Wait for completion

Via API:
```bash
curl -X POST https://your-app.vercel.app/api/cron/update-data
```

### Step 2: Check Logs

Look for these log messages:

**Successful API Call:**
```
Easee API returned 168 entries for charger EH001
First entry for EH001 - ALL fields: {
  "timestamp": "2024-01-27T00:00:00Z",
  "value": 12.5,
  ...
}
Available field names: ["timestamp", "value", ...]
Stored 168 energy records for charger EH001
```

**Zero Values Warning:**
```
WARNING: Zero energy value for EH001 at 2024-01-27T00:00:00Z. Full entry: {...}
```

**Missing Energy Field:**
```
Skipping entry for EH001: no energy value found in fields: timestamp, someOtherField
```

### Step 3: Check Database State

Visit: `https://your-app.vercel.app/api/debug/data-check`

Response shows:
```json
{
  "hourly_energy": {
    "total_count": "1680",
    "date_range": {
      "min_ts": "2024-01-27T00:00:00Z",
      "max_ts": "2024-02-03T23:00:00Z",
      ...
    },
    "sample": [...]
  },
  "spotprices": {
    "total_count": "48",
    "sample": [...]
  },
  "join_test": {
    "matched_rows": 5,
    "sample_matches": [...]
  },
  "diagnosis": {
    "energy_has_data": true,
    "prices_have_data": true,
    "join_works": true,
    "potential_issue": "Check if data has been fetched"
  }
}
```

### Step 4: Diagnose Issues

**If `hourly_energy.total_count` is 0:**
- Data hasn't been fetched from Easee API
- Check Easee credentials (EASEE_USERNAME, EASEE_PASSWORD)
- Check if chargers exist in database
- Check Easee API authentication

**If kwh values are all zero:**
- Check logs for "First entry - ALL fields"
- Identify actual field name used by Easee API
- If API actually returns zeros, contact Easee support

**If `spotprices.total_count` is 0:**
- Electricity prices haven't been fetched
- Check if elprisetjustnu.se is accessible
- Check logs for price fetch errors

**If `join_works` is false but both tables have data:**
- Timestamp mismatch (shouldn't happen with timezone-aware JOIN)
- Check if date ranges overlap
- Check sample timestamps in debug output

## What the Logs Tell You

### Log: "First entry - ALL fields"
Shows the EXACT structure returned by Easee API.

**Example 1 - Standard format:**
```json
{
  "timestamp": "2024-01-27T00:00:00Z",
  "value": 12.5
}
```
✅ Code handles this correctly

**Example 2 - Different field name:**
```json
{
  "dateTime": "2024-01-27T00:00:00Z",
  "energyKwh": 12.5
}
```
❌ Code won't find energy value - need to add `energyKwh` to checks

**Example 3 - Nested structure:**
```json
{
  "timestamp": "2024-01-27T00:00:00Z",
  "measurements": {
    "energy": 12.5
  }
}
```
❌ Code won't find nested value - need to adjust extraction

### Log: "WARNING: Zero energy value"
Shows an entry where energy is explicitly zero.

**If this is expected:**
- Charger wasn't used during that hour
- No action needed

**If this is unexpected:**
- All hours show zero but you know charging occurred
- Contact Easee support about API data
- Check if using correct charger IDs

## Next Steps if Issues Persist

1. **Check the "First entry" log** - This tells you the exact API format
2. **Look at "Available field names"** - Shows what fields you have to work with
3. **If field names are different** - Update the energy value extraction code
4. **If values are genuinely zero** - This is a data issue with Easee API, not code issue
5. **Use the debug endpoint** - Shows what's actually in the database

## Code Locations

- Energy value extraction: `server/services/energyService.js` lines 33-62
- Full calendar days: `api/cron/update-data.js` lines 23-30
- Full calendar days (Express): `server/routes/cron.js` lines 11-18
- Debug endpoint: `api/debug/data-check.js`
- Timezone-aware JOIN: `api/chargers/[id].js` lines 99-109

## Summary

✅ Enhanced logging to see actual API response format
✅ Fixed partial day fetching to use full calendar days
✅ Improved energy value extraction with null/undefined checks
✅ Added debug endpoint for database state inspection
✅ Maintained timezone-aware JOINs for Swedish electricity prices
✅ Better error messages and warnings

The logging will now clearly show what the Easee API returns, making it easy to diagnose if the issue is:
- Wrong field names in code
- API returning zeros (data issue)
- API format changed
- Authentication problems
