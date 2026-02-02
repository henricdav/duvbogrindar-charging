# Manual Data Fetch Feature

This document describes the manual data fetch functionality added to the Duvbo Grindar Charging Portal.

## Overview

Users can now manually trigger data fetching from Nord Pool and Easee APIs via a button in the frontend interface, in addition to the existing automated cron job that runs daily at 2 AM.

## Implementation Details

### Backend

**Endpoint:** `POST /api/cron/update-data`

This endpoint already existed for the Vercel Cron Jobs. It:
- Fetches Nord Pool spot prices for SE3 area
- Fetches energy data from Easee API for all chargers
- Fetches data for the last 7 days
- Stores data in PostgreSQL database

**Location:** 
- Express route: `server/routes/cron.js`
- Serverless function: `api/cron/update-data.js`

**Response:**
- Success: `{ success: true, message: 'Data update completed successfully', timestamp: '...' }`
- Error: `{ success: false, error: 'Data update failed', message: '...' }`

### Frontend

**New Features:**

1. **"🔄 Fetch Data Now" Button**
   - Located next to the "⚙️ Pricing Settings" button
   - Triggers manual data fetch when clicked
   - Shows loading state while fetching

2. **Visual Feedback**
   - Button text changes to "⏳ Fetching..." during operation
   - Button is disabled while fetching to prevent double-clicks
   - Success message: Green notification with auto-reload
   - Error message: Red notification with error details

3. **Auto-refresh**
   - After successful fetch, the current data view automatically reloads
   - Messages auto-dismiss after timeout (2s for success, 5s for errors)

**Files Modified:**
- `client/src/api.js` - Added `fetchDataManually()` function
- `client/src/App.jsx` - Added state, handler, and UI elements
- `client/src/App.css` - Added styling for button and messages

## User Guide

### How to Use

1. Open the Duvbo Grindar Charging Portal
2. Look for the "🔄 Fetch Data Now" button in the top section (next to Pricing Settings)
3. Click the button to trigger data fetch
4. Wait for the operation to complete (usually 10-30 seconds)
5. A success message will appear, and your data will automatically refresh
6. If there's an error, an error message will be displayed

### When to Use

- When you need the latest data immediately (instead of waiting for the nightly cron job)
- After making changes to charger configurations in Easee
- When troubleshooting data issues
- When you notice data is outdated

### Important Notes

- The operation fetches data for the last 7 days
- It may take 10-30 seconds depending on network conditions and API response times
- Only one fetch operation can run at a time (button is disabled during operation)
- The button respects rate limiting (100 requests per 15 minutes per IP)

## Technical Details

### State Management

```javascript
const [fetchingData, setFetchingData] = useState(false);  // Loading state
const [fetchMessage, setFetchMessage] = useState(null);    // Message object
```

### Error Handling

The implementation includes comprehensive error handling:
- Network errors are caught and displayed to the user
- Backend errors include the error message from the API
- Console logging for debugging purposes
- Messages auto-dismiss to avoid cluttering the UI

### Responsive Design

The feature includes responsive CSS for mobile devices:
- Button layout adjusts for smaller screens
- Message notifications are readable on all screen sizes
- Touch-friendly button sizes

## Testing

To test the feature:

1. **Local Development:**
   ```bash
   # Terminal 1 - Start backend
   cd server && npm run dev
   
   # Terminal 2 - Start frontend
   cd client && npm run dev
   ```

2. **Manual Testing:**
   - Click the "Fetch Data Now" button
   - Verify loading state appears
   - Check console for logs
   - Verify success/error message displays
   - Confirm data reloads after success

3. **Network Testing:**
   - Test with network throttling to verify timeout behavior
   - Test error scenarios (backend down, invalid credentials)
   - Verify button disable state prevents double-clicks

## Future Enhancements

Possible improvements:
- Progress indicator showing which step is executing (prices vs. energy data)
- Ability to fetch data for specific date ranges
- Option to fetch data for specific chargers only
- Fetch history/audit log
- Webhook notifications on completion
