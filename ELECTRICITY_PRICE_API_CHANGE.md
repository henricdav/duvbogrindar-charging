# Electricity Price API Migration

## Overview

The application has been migrated from the Nord Pool API to the **elprisetjustnu.se** API for fetching Swedish electricity spot prices.

## Why the Change?

- The Nord Pool integration had issues and was unreliable
- The new API is completely free and open
- Simpler implementation with static JSON files
- Better suited for Swedish electricity prices
- No authentication or API keys required

## New API: elprisetjustnu.se

### API Details

**Endpoint Format:**
```
GET https://www.elprisetjustnu.se/api/v1/prices/[ÅR]/[MÅNAD]-[DAG]_[PRISKLASS].json
```

**Parameters:**
- `ÅR` - Year (4 digits): `2024`
- `MÅNAD` - Month (2 digits, zero-padded): `01`, `02`, ..., `12`
- `DAG` - Day (2 digits, zero-padded): `01`, `02`, ..., `31`
- `PRISKLASS` - Price area:
  - `SE1` - Luleå / Norra Sverige
  - `SE2` - Sundsvall / Norra Mellansverige
  - `SE3` - Stockholm / Södra Mellansverige (used by this app)
  - `SE4` - Malmö / Södra Sverige

**Example:**
```
GET https://www.elprisetjustnu.se/api/v1/prices/2024/01-15_SE3.json
```

### Response Format

The API returns a JSON array with hourly electricity prices:

```json
[
  {
    "time_start": "2024-01-15T00:00:00+01:00",
    "time_end": "2024-01-15T01:00:00+01:00",
    "SEK_per_kWh": 0.85,
    "EUR_per_kWh": 0.08
  },
  {
    "time_start": "2024-01-15T01:00:00+01:00",
    "time_end": "2024-01-15T02:00:00+01:00",
    "SEK_per_kWh": 0.82,
    "EUR_per_kWh": 0.075
  },
  // ... 24 entries for each hour
]
```

### Key Fields

- `time_start` - ISO 8601 timestamp for the start of the hour
- `time_end` - ISO 8601 timestamp for the end of the hour
- `SEK_per_kWh` - Price in Swedish kronor per kilowatt-hour
- `EUR_per_kWh` - Price in euros per kilowatt-hour

## Implementation Changes

### priceService.js

**Removed:**
- `fetchNordPoolPrices()` - Old Nord Pool integration

**Added:**
- `fetchElprisetJustNuPrices(date)` - Fetches prices for a specific date from the new API

**Updated:**
- `fetchAndStorePrices()` - Now fetches from elprisetjustnu.se for today and tomorrow

**Unchanged:**
- `getPrices(fromDate, toDate)` - Still reads from database (no changes needed)

### Data Flow

1. **Cron Job** runs daily at 2 AM
2. Calls `fetchAndStorePrices()`
3. Fetches today's prices: `GET /api/v1/prices/YYYY/MM-DD_SE3.json`
4. Fetches tomorrow's prices (if available after 13:00)
5. Parses the JSON response
6. Stores each hourly price in the `spotprices` table
7. Uses `ON CONFLICT` to update existing records

### Database Schema

No changes required! The `spotprices` table remains the same:

```sql
CREATE TABLE spotprices (
    ts TIMESTAMPTZ PRIMARY KEY,
    price_sek_per_kwh NUMERIC NOT NULL
);
```

## Advantages of the New API

### 1. Simplicity
- Static JSON files (no complex API calls)
- No authentication required
- Direct SEK/kWh values (no conversion needed)

### 2. Reliability
- Free and open API
- Maintained by Swedish electricity price enthusiasts
- Dedicated to making electricity prices accessible to everyone

### 3. Predictability
- Today's prices always available
- Tomorrow's prices available after ~13:00
- Clear 404 responses for unavailable dates

### 4. Performance
- Fast response times (static files)
- No rate limiting concerns
- Can be easily cached

## Error Handling

The implementation includes robust error handling:

1. **404 Not Found**: Gracefully handles when tomorrow's prices aren't yet available
2. **Network Errors**: Logs errors and continues with available data
3. **Parse Errors**: Validates data before inserting into database
4. **Timeout**: 10-second timeout prevents hanging requests

## Testing

To test the new integration:

```bash
# Manually trigger data fetch
curl -X POST http://localhost:3001/api/cron/update-data

# Or from Vercel:
curl -X POST https://your-app.vercel.app/api/cron/update-data
```

Check the logs to see:
```
Fetching spot prices from elprisetjustnu.se...
Fetching prices from: https://www.elprisetjustnu.se/api/v1/prices/2024/01-15_SE3.json
Fetched 24 price records for 2024-01-15
Stored 48 price records
```

## Frontend Compatibility

**No changes required!** The frontend continues to work exactly as before because:

1. Database schema unchanged
2. API endpoints unchanged (`/api/prices`)
3. Data format unchanged (timestamp + price)
4. Frontend doesn't care about the source of prices

## Manual Data Fetch

Users can still manually trigger data fetches using the "🔄 Fetch Data Now" button in the UI, which will:

1. Fetch latest prices from elprisetjustnu.se
2. Update the database
3. Reload the current view with fresh data

## Monitoring

Watch for these log messages:

- ✅ `Fetching prices from: https://www.elprisetjustnu.se/...`
- ✅ `Fetched X price records for YYYY-MM-DD`
- ✅ `Stored X price records`
- ⚠️ `No price data available for date: ...`
- ❌ `Failed to fetch prices from elprisetjustnu.se: ...`

## Support

For questions about the API, visit: https://www.elprisetjustnu.se/

The API is completely free and open - created by people who believe electricity prices should be freely accessible to everyone.
