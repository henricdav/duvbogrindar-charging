# Next Steps for Testing and Debugging

## Summary of Changes

We've fixed two critical issues:

1. ✅ **Manual fetch now uses your selected date range** - You can fetch data for any period you want
2. ✅ **Enhanced logging** - Better visibility into what's happening and why data might not display

## How to Test the Fixes

### Step 1: Test Manual Fetch with Selected Dates

1. Open the application in your browser
2. Select a date range you want data for (e.g., Jan 1-7, 2026)
3. Click the "🔄 Fetch Data Now" button
4. Watch the browser console and backend logs

**Expected Backend Logs:**
```
Starting manual data fetch for date range: 2026-01-01T00:00:00.000Z to 2026-01-07T23:59:59.999Z
Using provided date range: 2026-01-01T00:00:00.000Z to 2026-01-07T23:59:59.999Z
Fetching spot prices for date range: 2026-01-01 to 2026-01-07
Fetching prices for date: 2026-01-01
Fetching prices for date: 2026-01-02
...
Fetching prices for date: 2026-01-07
First entry for ECQ8DWGE - ALL fields: { "consumption": 9.456..., "date": "2026-01-01..." }
Stored energy: 9.46 kWh for charger ECQ8DWGE at 2026-01-01T05:00:00.000Z
```

**Success:** You should see prices fetched for all 7 days and energy data stored

### Step 2: View the Fetched Data

1. Keep the same date range selected (Jan 1-7)
2. The data should automatically reload after successful fetch
3. Charts should display with data

**If you still see "Failed to load data":**

Check the backend logs for these messages:

```
Fetching cost data for charger ECQ8DWGE from 2026-01-01... to 2026-01-07...
Query returned X rows for charger ECQ8DWGE
```

**If X = 0 (no rows):**
- Logs will show warnings about possible causes
- This means either:
  - The fetch didn't actually store data (check fetch logs)
  - The date range doesn't match what's in database
  - There's a JOIN issue between tables

**If X > 0 (has rows):**
- Logs will show sample data
- This means backend has data but frontend isn't displaying it
- Check browser console for JavaScript errors

## Debugging "Failed to load data"

### Quick Diagnosis

1. **Check what dates you have in database:**
   ```sql
   -- Connect to your database and run:
   SELECT 
     MIN(ts) as earliest, 
     MAX(ts) as latest, 
     COUNT(*) as total_records
   FROM hourly_energy 
   WHERE charger_id = 'ECQ8DWGE';
   ```

2. **Check if prices match those dates:**
   ```sql
   SELECT 
     MIN(ts) as earliest, 
     MAX(ts) as latest, 
     COUNT(*) as total_records
   FROM spotprices;
   ```

3. **Check if JOIN works:**
   ```sql
   SELECT COUNT(*)
   FROM hourly_energy he
   LEFT JOIN spotprices sp ON 
     DATE_TRUNC('hour', he.ts AT TIME ZONE 'Europe/Stockholm') = 
     DATE_TRUNC('hour', sp.ts AT TIME ZONE 'Europe/Stockholm')
   WHERE he.charger_id = 'ECQ8DWGE';
   ```

### Use Debug Endpoint

Visit: `https://your-app.vercel.app/api/debug/data-check`

This will show you:
- What's in hourly_energy table
- What's in spotprices table
- Whether JOIN is working
- Sample timestamps from both tables

## Common Issues and Solutions

### Issue: "No data found" after fetch

**Check:**
1. Did the fetch complete successfully? Look for "Data fetch complete" in logs
2. Did it store any records? Look for "Stored energy: X kWh" messages
3. Are there any errors in the fetch logs?

**Possible causes:**
- Easee API returned empty data for that date range
- The "consumption" field parsing failed
- Date range was adjusted by the fetch logic

### Issue: Data exists but doesn't display

**Check:**
1. Backend logs show "Query returned X rows" where X > 0
2. But frontend still shows error

**Possible causes:**
- Frontend JavaScript error (check browser console)
- API response format issue
- CORS issue (check network tab)

### Issue: Wrong date range is fetched

**Check:**
1. Look for log: "Using provided date range: ..."
2. Does it match what you selected?

**If it doesn't match:**
- Check browser console for what's being sent
- Verify date picker is working correctly

## Example: Fetching Jan 27-28 Data

Based on your earlier message that you have data for Jan 27-28:

1. **Select dates:** Jan 27, 2026 to Jan 28, 2026
2. **Click:** "🔄 Fetch Data Now"
3. **Expect logs:**
   ```
   Using provided date range: 2026-01-27T00:00:00.000Z to 2026-01-28T23:59:59.999Z
   Fetching prices for date: 2026-01-27
   Fetching prices for date: 2026-01-28
   First entry for ECQ8DWGE - ALL fields: { "consumption": 9.456..., ... }
   Stored energy: 9.46 kWh ...
   ```

4. **View data:**
   - Keep Jan 27-28 selected
   - Backend logs should show: "Query returned 48 rows" (24 hours × 2 days)
   - Charts should display

## What to Report Back

If issues persist, please provide:

1. **Backend logs** from the fetch operation:
   - Look for "Using provided date range"
   - Look for "Fetching prices for date"
   - Look for "First entry" and "Stored energy"
   - Any errors or warnings

2. **Backend logs** from viewing data:
   - Look for "Fetching cost data for charger"
   - Look for "Query returned X rows"
   - Look for warnings about "No data found"

3. **Browser console logs:**
   - Any errors (red messages)
   - Network requests and responses

4. **Database state:**
   - Results from the SQL queries above
   - What date range actually has data

## Expected Timeline

After these fixes:
- **Manual fetch**: Should take 10-30 seconds depending on date range
- **Data display**: Should be immediate after fetch completes
- **Cron job**: Continues to run daily at scheduled time

## If Everything Works

You should now be able to:
- ✅ Select any date range (Jan 1-7, Feb 1-3, etc.)
- ✅ Click "Fetch Data Now" to get data for that range
- ✅ View charts and costs for that specific period
- ✅ Export data for custom date ranges
- ✅ Automated cron still fetches last 7 days daily

## Additional Features

The logging improvements also help with:
- **Understanding fetch progress** - See each step
- **Diagnosing API issues** - See exact responses
- **Database debugging** - See query results
- **Performance monitoring** - See how long operations take

## Need More Help?

If issues persist, check:
1. `DATE_RANGE_FIX.md` - Detailed technical documentation
2. `CONSUMPTION_FIELD_FIX.md` - Details on energy field parsing
3. `EASEE_API_FIX.md` - Details on timestamp handling
4. Backend logs - Most issues visible in logs now
