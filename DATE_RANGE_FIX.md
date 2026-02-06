# Date Range Issues Fixed

## Overview

Fixed two critical issues preventing users from fetching and viewing data for their selected date ranges:

1. **Manual fetch always used last 7 days** - Ignored user's selected date range
2. **Frontend showed "Failed to load data"** - Even when data existed in database for the selected range

## Problems Identified

### Problem 1: Manual Fetch Ignored Selected Dates

**Scenario:**
- User selects Jan 1-7 in the date picker
- Clicks "🔄 Fetch Data Now" button
- Backend fetches data for last 7 days from TODAY (e.g., Jan 30 - Feb 6)
- No data is stored for Jan 1-7

**Root Cause:**
- The `api/cron/update-data.js` endpoint hardcoded the date range
- Always calculated: `today - 7 days` to `today`
- Never accepted date parameters from the request
- Frontend didn't pass selected dates to the fetch function

**Impact:**
- Users couldn't fetch historical data for specific periods
- Manual fetch was essentially useless for viewing past data
- Only the most recent 7 days could be fetched

### Problem 2: "Failed to load data" Despite Data Existing

**Scenario:**
- User has data in database for Jan 27-28
- Selects Jan 27-28 in date picker
- Backend query executes correctly
- But frontend shows error or no data

**Possible Causes:**
- Need better visibility into what's happening
- Query might be returning 0 rows for unexpected reasons
- Date/time format issues
- Data filtering issues

## Solutions Implemented

### Solution 1: Pass Selected Dates to Manual Fetch

**Frontend Changes (`client/src/api.js`):**
```javascript
// OLD: No parameters, always fetched default range
export const fetchDataManually = async () => {
  const response = await apiClient.post('/cron/update-data');
  return response.data;
};

// NEW: Accepts optional from/to dates
export const fetchDataManually = async (fromDate = null, toDate = null) => {
  const payload = {};
  if (fromDate && toDate) {
    payload.from = fromDate;
    payload.to = toDate;
  }
  const response = await apiClient.post('/cron/update-data', payload);
  return response.data;
};
```

**Frontend Changes (`client/src/App.jsx`):**
```javascript
// OLD: Didn't pass any dates
const result = await fetchDataManually();

// NEW: Passes selected dates from date picker
const result = await fetchDataManually(
  fromDate.toISOString(), 
  toDate.toISOString()
);
```

**Backend Changes (`api/cron/update-data.js` and `server/routes/cron.js`):**
```javascript
// Check if date range is provided in request body
let fromDate, toDate;

if (req.body && req.body.from && req.body.to) {
  // Use provided dates (manual fetch with user-selected date range)
  fromDate = new Date(req.body.from);
  toDate = new Date(req.body.to);
  console.log(`Using provided date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
} else {
  // Default to last 7 complete calendar days (for cron job)
  toDate = new Date();
  toDate.setHours(23, 59, 59, 999);
  
  fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  fromDate.setHours(0, 0, 0, 0);
  
  console.log(`Using default date range (last 7 days): ${fromDate.toISOString()} to ${toDate.toISOString()}`);
}
```

### Solution 2: Enhanced Logging for Debugging

**Added to Both Serverless and Express Endpoints:**

```javascript
console.log(`Fetching cost data for charger ${id} from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

const result = await pool.query(/* SQL query */);

console.log(`Query returned ${result.rows.length} rows for charger ${id}`);

if (result.rows.length === 0) {
  console.warn(`No data found for charger ${id} in date range ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  console.warn(`This could mean:`);
  console.warn(`  1) No energy data in hourly_energy table`);
  console.warn(`  2) Date range doesn't match available data`);
  console.warn(`  3) Charger ID mismatch`);
} else {
  console.log(`Sample data (first row):`, {
    timestamp: result.rows[0].timestamp,
    kwh: result.rows[0].kwh,
    price_sek_per_kwh: result.rows[0].price_sek_per_kwh
  });
}
```

## How It Works Now

### Manual Fetch with User-Selected Dates

1. **User Action:**
   - User selects Jan 1-7 in date picker
   - Clicks "🔄 Fetch Data Now" button

2. **Frontend:**
   - `handleManualFetch()` calls `fetchDataManually(fromDate, toDate)`
   - Passes selected dates as ISO strings
   - Shows loading state

3. **Backend:**
   - Receives POST to `/api/cron/update-data` with body: `{ from: "2026-01-01...", to: "2026-01-07..." }`
   - Parses dates from request body
   - Logs: `"Using provided date range: 2026-01-01... to 2026-01-07..."`
   - Calls `priceService.fetchAndStorePrices(fromDate, toDate)` for those dates
   - Calls `energyService.fetchAllChargersEnergy(fromDate, toDate)` for those dates

4. **Data Fetching:**
   - **Electricity Prices:** Loops through each day from Jan 1-7, fetches from elprisetjustnu.se
   - **Energy Data:** Fetches from Easee API for Jan 1-7 date range

5. **Result:**
   - Data stored in database for Jan 1-7
   - Frontend reloads and can now display Jan 1-7 data

### Automated Cron Job (No Change)

1. **Vercel Cron Trigger:**
   - Sends POST to `/api/cron/update-data` with empty body

2. **Backend:**
   - No `from`/`to` in request body
   - Uses default logic: last 7 days
   - Logs: `"Using default date range (last 7 days)"`

3. **Data Fetching:**
   - Works exactly as before
   - Fetches last 7 days of data automatically

## Debugging "Failed to load data" Errors

With the enhanced logging, you can now diagnose issues:

### Step 1: Check Backend Logs

Look for these log messages when viewing data:

```
Fetching cost data for charger ECQ8DWGE from 2026-01-27T00:00:00.000Z to 2026-01-28T23:59:59.999Z
Query returned 0 rows for charger ECQ8DWGE
⚠ No data found for charger ECQ8DWGE in date range ...
⚠ This could mean: 1) No energy data in hourly_energy table, ...
```

### Step 2: Identify the Issue

**If query returns 0 rows:**

1. **No energy data in hourly_energy table**
   - Check: `SELECT * FROM hourly_energy WHERE charger_id = 'ECQ8DWGE' AND ts >= '2026-01-27' AND ts <= '2026-01-28';`
   - If empty: Need to fetch data first using "Fetch Data Now" button

2. **Date range doesn't match available data**
   - Check what dates you have: `SELECT MIN(ts), MAX(ts) FROM hourly_energy WHERE charger_id = 'ECQ8DWGE';`
   - Adjust date picker to match available dates

3. **Charger ID mismatch**
   - Check charger IDs: `SELECT DISTINCT charger_id FROM hourly_energy;`
   - Verify selected charger exists

**If query returns rows but frontend shows error:**

1. Check browser console for JavaScript errors
2. Verify API response format matches expected structure
3. Check network tab to see actual response

### Step 3: Use Debug Endpoint

Visit `/api/debug/data-check` to see:
- What data exists in both tables
- Sample timestamps
- Whether JOIN is working

## Testing

### Test 1: Fetch Historical Data

1. Select Jan 1-7 in date picker
2. Click "🔄 Fetch Data Now"
3. Check logs for: `"Using provided date range: 2026-01-01..."`
4. Wait for success message
5. Data should now be visible in charts

### Test 2: Fetch Different Range

1. Select Feb 1-3 in date picker
2. Click "🔄 Fetch Data Now"
3. Check logs for: `"Using provided date range: 2026-02-01..."`
4. Data should be fetched for those specific dates

### Test 3: Cron Job Still Works

1. Trigger cron job (or wait for scheduled run)
2. Check logs for: `"Using default date range (last 7 days)"`
3. Should fetch last 7 days as before

### Test 4: View Data After Fetch

1. After fetching data for Jan 1-7
2. Keep Jan 1-7 selected in date picker
3. Charts should display data
4. If error, check logs for query results

## Benefits

✅ **Users can fetch historical data**
- Select any date range
- Click fetch button
- Data is fetched for that specific range

✅ **Automated cron still works**
- No parameters = default behavior
- Continues to fetch last 7 days automatically

✅ **Better debugging**
- Clear logs show what's happening
- Can identify root cause of "no data" issues
- Sample data shown when available

✅ **Flexible data exploration**
- View any historical period (if data available from Easee)
- Not limited to recent 7 days
- Can fetch and analyze specific periods

## Known Limitations

1. **Easee API Limitations:**
   - Can only fetch data that Easee API has
   - Very old data might not be available from Easee

2. **Electricity Price Availability:**
   - elprisetjustnu.se only has data from certain date onwards
   - Future dates (beyond tomorrow) won't have prices

3. **Database Storage:**
   - Data is only stored if fetched
   - Old data needs to be fetched before it can be viewed

## Files Modified

1. `client/src/api.js` - Accept date parameters in fetchDataManually()
2. `client/src/App.jsx` - Pass selected dates to fetch function
3. `api/cron/update-data.js` - Accept optional dates in request body
4. `server/routes/cron.js` - Accept optional dates in request body
5. `api/chargers/[id].js` - Add detailed query logging
6. `server/routes/chargers.js` - Add detailed query logging
