# Easee API Timestamp Validation Fix

## Problem Description

The application was experiencing database constraint violations when fetching energy data from the Easee API:

```
Error inserting energy data for ECQ8DWGE: null value in column "ts" of relation "hourly_energy" violates not-null constraint
```

## Root Cause

The `hourly_energy` table requires a NOT NULL timestamp (`ts TIMESTAMPTZ NOT NULL`), but the code was attempting to insert data without proper validation:

```javascript
// OLD CODE - No validation
await pool.query(
  `INSERT INTO hourly_energy (charger_id, ts, kwh) VALUES ($1, $2, $3)`,
  [chargerId, entry.timestamp || entry.ts, entry.value || entry.kWh || 0]
);
```

Issues with the old code:
1. If `entry.timestamp` and `entry.ts` are both null/undefined, `null` is passed to the database
2. No validation that the timestamp is a valid date
3. No logging of what data was received
4. No graceful handling of malformed data

## Solution

Added comprehensive validation and error handling:

### 1. Multi-Field Timestamp Extraction

Check multiple possible field names since the Easee API format may vary:

```javascript
const timestamp = entry.timestamp || entry.ts || entry.time || entry.date;
```

### 2. Null/Undefined Validation

Skip entries that don't have a timestamp:

```javascript
if (!timestamp) {
  console.warn(`Skipping entry for ${chargerId}: missing timestamp. Entry data:`, JSON.stringify(entry));
  skippedCount++;
  continue;
}
```

### 3. Date Validation

Ensure the timestamp can be converted to a valid date:

```javascript
const timestampDate = new Date(timestamp);
if (isNaN(timestampDate.getTime())) {
  console.warn(`Skipping entry for ${chargerId}: invalid timestamp "${timestamp}". Entry data:`, JSON.stringify(entry));
  skippedCount++;
  continue;
}
```

### 4. Enhanced Logging

Log the structure of data received from Easee API:

```javascript
if (data && data.length > 0) {
  console.log(`Easee API returned ${data.length} entries for charger ${chargerId}`);
  console.log(`First entry structure:`, JSON.stringify(data[0]));
}
```

### 5. Energy Value Extraction

Check multiple possible field names for energy values:

```javascript
const energyValue = entry.value ?? entry.kWh ?? entry.kwh ?? entry.energy ?? 0;
```

## Expected Data Format

The Easee API endpoint `/chargers/lifetime-energy/{chargerId}/hourly` is expected to return:

```json
[
  {
    "timestamp": "2024-01-15T00:00:00Z",
    "value": 12.5
  },
  {
    "timestamp": "2024-01-15T01:00:00Z",
    "value": 15.3
  }
]
```

### Alternative Field Names

The code now checks for these alternative field names:

**Timestamp fields:**
- `timestamp` (primary)
- `ts`
- `time`
- `date`

**Energy value fields:**
- `value` (primary)
- `kWh`
- `kwh`
- `energy`

## Error Handling

### Before Fix
```
❌ Crashes with database constraint violation
❌ No information about what data was received
❌ Entire batch fails if one entry is bad
```

### After Fix
```
✅ Skips invalid entries gracefully
✅ Logs detailed information about skipped entries
✅ Continues processing valid entries
✅ Reports summary of successes and failures
```

## Logging Examples

### Successful Processing
```
Easee API returned 24 entries for charger ECQ8DWGE
First entry structure: {"timestamp":"2024-01-15T00:00:00Z","value":12.5}
Stored 24 energy records for charger ECQ8DWGE
```

### Partial Success (Some Invalid Entries)
```
Easee API returned 24 entries for charger ECQ8DWGE
First entry structure: {"timestamp":"2024-01-15T00:00:00Z","value":12.5}
Skipping entry for ECQ8DWGE: missing timestamp. Entry data: {"value":15.3}
Skipping entry for ECQ8DWGE: invalid timestamp "not-a-date". Entry data: {"timestamp":"not-a-date","value":10.2}
Stored 22 energy records for charger ECQ8DWGE, skipped 2 invalid entries
```

### No Data
```
Easee API returned empty data for charger ECQ8DWGE
No energy data found for charger ECQ8DWGE
```

## Database Schema

The `hourly_energy` table requires these fields:

```sql
CREATE TABLE hourly_energy (
    id SERIAL PRIMARY KEY,
    charger_id TEXT NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,  -- This is what was causing the error
    kwh NUMERIC NOT NULL,
    UNIQUE(charger_id, ts)
);
```

## Benefits

1. **Prevents Database Errors**: No more constraint violations from null timestamps
2. **Better Debugging**: Detailed logs show exactly what data was received
3. **Graceful Degradation**: Invalid entries are skipped, valid ones are processed
4. **Flexibility**: Handles multiple possible data formats from Easee API
5. **Visibility**: Clear reporting of successes and failures

## Testing

To test the fix, trigger a manual data fetch:

```bash
# From the UI
Click the "🔄 Fetch Data Now" button

# Or via API
curl -X POST http://localhost:3001/api/cron/update-data
# Or
curl -X POST https://your-app.vercel.app/api/cron/update-data
```

Check the logs for:
- Entry structure information
- Warning messages about skipped entries
- Summary of inserted vs skipped records

## Future Improvements

If issues continue, consider:

1. **API Documentation**: Request official Easee API documentation for the exact response format
2. **Field Mapping**: Create a configuration file to map field names
3. **Data Validation Service**: Create a separate validation service for API responses
4. **Retry Logic**: Implement retry with exponential backoff for transient failures
5. **Alerting**: Send alerts when too many entries are being skipped

## Related Files

- `server/services/energyService.js` - Main energy data processing logic
- `server/services/easeeService.js` - Easee API integration
- `server/db/schema.sql` - Database schema definition
- `server/routes/cron.js` - Scheduled data fetching
- `api/cron/update-data.js` - Serverless function for Vercel

## Troubleshooting

### If entries are still being skipped:

1. **Check the logs** for the actual entry structure
2. **Identify the field names** used by Easee API
3. **Update the field extraction logic** in `energyService.js` if needed
4. **Contact Easee support** for official API documentation

### If all entries are being skipped:

This suggests the Easee API is returning data in a completely different format. Check:
1. The logged "First entry structure" to see what fields exist
2. Whether the response is an array or an object
3. Whether the data is nested inside another field

### If you see many invalid timestamp warnings:

The timestamp format might not be ISO 8601. Consider:
1. Checking what format the timestamps are in
2. Adding timestamp parsing/conversion logic
3. Updating the timestamp extraction to handle the actual format
