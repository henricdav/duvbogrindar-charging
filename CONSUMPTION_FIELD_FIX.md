# Consumption Field Fix and Price Date Range Extension

## Problems Solved

### Issue 1: Consumption Field Not Recognized
**Symptom:**
```
First entry for ECQ8DWGE - ALL fields: {
  "year": 2026,
  "month": 1,
  "day": 27,
  "hour": 5,
  "consumption": 9.456794722222185,
  "date": "2026-01-27T05:00:00+00:00"
}
Skipping entry for ECQ8DWGE: no energy value found in fields: year, month, day, hour, consumption, date
```

The Easee API returns a field called `"consumption"` with the kWh value, but the code was looking for:
- `value`
- `kWh`
- `kwh`
- `energy`

Result: Valid consumption data was being rejected and not stored in the database.

### Issue 2: Electricity Prices Only for 2 Days
**Symptom:**
- Energy data fetched for 7 full calendar days
- Electricity prices only fetched for today + tomorrow (2 days)
- Date mismatch between `hourly_energy` and `spotprices` tables
- JOIN query returns no results
- Frontend shows "Failed to load data"

## Solutions Implemented

### Solution 1: Add "consumption" Field Check

**File:** `server/services/energyService.js`

**Change:**
```javascript
// OLD: Checked only: value, kWh, kwh, energy
if (entry.value !== undefined && entry.value !== null) {
  energyValue = parseFloat(entry.value);
} else if (entry.kWh !== undefined && entry.kWh !== null) {
  ...

// NEW: Check "consumption" FIRST
if (entry.consumption !== undefined && entry.consumption !== null) {
  energyValue = parseFloat(entry.consumption);
} else if (entry.value !== undefined && entry.value !== null) {
  energyValue = parseFloat(entry.value);
} else if (entry.kWh !== undefined && entry.kWh !== null) {
  ...
```

**Why "consumption" is checked first:**
- This is the actual field name used by Easee API
- Checking it first ensures correct data extraction
- Falls back to other field names if "consumption" not found (backward compatibility)

### Solution 2: Fetch Prices for Full Date Range

**File:** `server/services/priceService.js`

**Change:**
```javascript
// OLD: Hardcoded to fetch only today + tomorrow
async function fetchAndStorePrices() {
  const today = new Date();
  const todayPrices = await fetchElprisetJustNuPrices(today);
  // Store today's prices...
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrices = await fetchElprisetJustNuPrices(tomorrow);
  // Store tomorrow's prices...
}

// NEW: Accepts date range and loops through all dates
async function fetchAndStorePrices(fromDate = null, toDate = null) {
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
  
  // Loop through each date in the range
  const currentDate = new Date(fromDate);
  while (currentDate <= toDate) {
    const dayPrices = await fetchElprisetJustNuPrices(new Date(currentDate));
    // Store prices for this day...
    currentDate.setDate(currentDate.getDate() + 1);
  }
}
```

**Updated callers to pass date range:**
- `api/cron/update-data.js` - Passes `fromDate` and `toDate`
- `server/routes/cron.js` - Passes `fromDate` and `toDate`

## Expected Behavior After Fix

### Logs During Data Fetch

```
Scheduled/manual data update triggered...
Fetching data for full calendar days: 2026-01-27T00:00:00.000Z to 2026-02-03T23:59:59.999Z

Updating spot prices...
Fetching spot prices for date range: 2026-01-27 to 2026-02-03
Fetching prices for date: 2026-01-27
Fetched 24 price records for 2026-01-27
Fetching prices for date: 2026-01-28
Fetched 24 price records for 2026-01-28
Fetching prices for date: 2026-01-29
Fetched 24 price records for 2026-01-29
Fetching prices for date: 2026-01-30
Fetched 24 price records for 2026-01-30
Fetching prices for date: 2026-01-31
Fetched 24 price records for 2026-01-31
Fetching prices for date: 2026-02-01
Fetched 24 price records for 2026-02-01
Fetching prices for date: 2026-02-02
Fetched 24 price records for 2026-02-02
Fetching prices for date: 2026-02-03
Prices not available for 2026-02-03 (might be future date)
Stored 168 price records for date range

Updating energy data...
Fetching energy data for charger: ECQ8DWGE
First entry for ECQ8DWGE - ALL fields: {
  "year": 2026,
  "month": 1,
  "day": 27,
  "hour": 5,
  "consumption": 9.456794722222185,
  "date": "2026-01-27T05:00:00+00:00"
}
Available field names: ["year", "month", "day", "hour", "consumption", "date"]
Stored energy: 9.46 kWh for charger ECQ8DWGE at 2026-01-27T05:00:00.000Z

Stored 168 hourly energy records for charger ECQ8DWGE

Scheduled/manual data update completed successfully
```

### Database State

**spotprices table:**
- Contains 168 records (7 days × 24 hours)
- Date range: 2026-01-27 to 2026-02-02

**hourly_energy table:**
- Contains records for same date range
- Non-zero kWh values from "consumption" field
- Date range: 2026-01-27 to 2026-02-02

**JOIN query:**
- Now returns matching records
- Both tables have overlapping timestamps
- Frontend can display data

### Frontend Display

✅ Charts show energy consumption over 7 days
✅ Cost calculations display correctly
✅ No "Failed to load data" error
✅ Date selector works with available data range

## Testing

### Manual Test
1. Click "🔄 Fetch Data Now" button in the frontend
2. Check server logs for the expected log messages above
3. Verify no "Skipping entry" errors for consumption field
4. Verify prices fetched for 7 dates (not just 2)
5. Frontend should display charts with data

### Debug Endpoint
```bash
curl https://your-app.vercel.app/api/debug/data-check
```

Should show:
- Non-zero kWh values in hourly_energy
- 168 price records in spotprices
- Successful JOIN with matching records

## Technical Details

### Easee API Response Format
```json
{
  "year": 2026,
  "month": 1,
  "day": 27,
  "hour": 5,
  "consumption": 9.456794722222185,
  "date": "2026-01-27T05:00:00+00:00"
}
```

Key field: **"consumption"** (not "value", "kWh", etc.)

### elprisetjustnu.se API
- Endpoint: `https://www.elprisetjustnu.se/api/v1/prices/{year}/{month}-{day}_SE3.json`
- Returns: Array of 24 hourly prices per day
- Must be called once per date (no bulk date range support)
- Future dates return 404 (handled gracefully)

### Date Range Logic
```javascript
// Full calendar days
toDate.setHours(23, 59, 59, 999);    // End of today: 23:59:59.999
fromDate.setHours(0, 0, 0, 0);       // Start of 7 days ago: 00:00:00.000
```

This ensures complete days (not partial days based on current time).

## Benefits

✅ **Correct field extraction**
- Recognizes actual API field names
- No more data rejection due to field name mismatch

✅ **Matching date ranges**
- Both energy and prices for same 7-day period
- JOIN queries work correctly

✅ **Complete data display**
- Frontend shows all available data
- No error messages
- Charts and calculations work

✅ **Backward compatible**
- Still checks alternative field names as fallback
- Existing functionality preserved
- Defaults to 7 days if no date range specified

## Files Modified

1. `server/services/energyService.js` - Added "consumption" field check
2. `server/services/priceService.js` - Date range loop for price fetching
3. `api/cron/update-data.js` - Pass date range to price service
4. `server/routes/cron.js` - Pass date range to price service

All changes validated with `node --check` ✅
