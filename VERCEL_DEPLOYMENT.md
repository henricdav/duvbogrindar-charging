# Vercel Deployment Guide

This guide explains how to deploy the Duvbo Grindar Charging Portal to Vercel as a fully serverless application.

## Overview

The application is configured to run completely on Vercel with the following architecture:
- **Frontend**: React + Vite served as static files from `client/dist`
- **Backend**: Individual serverless functions in the `api/` directory (no Express server)
- **Database**: External PostgreSQL with SSL (Neon or Vercel Postgres recommended)
- **Scheduled Tasks**: Vercel Cron Jobs for automated data updates

## Architecture

### Serverless API Structure

The backend has been refactored into individual serverless functions:

```
api/
├── chargers/
│   ├── index.js          # GET /api/chargers - List all chargers
│   └── [id].js          # GET /api/chargers/:id/energy, /cost, /cost/export
├── prices/
│   └── index.js         # GET /api/prices - Get spot prices
├── settings/
│   └── index.js         # GET/PUT /api/settings, /api/settings/pricing
└── cron/
    └── update-data.js   # POST /api/cron/update-data - Data update endpoint
```

Each function is independent and handles its own CORS, validation, and database access through shared services in `server/services/`.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: External PostgreSQL with SSL support. Options:
   - [Neon](https://neon.tech/) - **Recommended** (serverless PostgreSQL with excellent cold-start performance)
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)
3. **Easee API Credentials**: Your Easee username and password

## Deployment Steps

### 1. Set Up Database

#### Option A: Using Neon (Recommended for Serverless)

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string (it includes `?sslmode=require` by default)
4. Initialize the database schema:
   ```bash
   # Connect to your Neon database
   psql "YOUR_NEON_CONNECTION_STRING"
   
   # Run the schema from the repository
   \i server/db/schema.sql
   ```

#### Option B: Using Vercel Postgres

1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → Postgres
3. Create a new Postgres database
4. Note the connection string (automatically added to environment variables)
5. Initialize the schema:
   ```bash
   psql "YOUR_VERCEL_POSTGRES_CONNECTION_STRING" -f server/db/schema.sql
   ```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from the project root:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Link to existing project or create new one
   - Confirm project settings

#### Option B: Using Git Integration

1. Push your code to GitHub, GitLab, or Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Click "Deploy"

### 3. Configure Environment Variables

In your Vercel project dashboard (Settings → Environment Variables), add:

#### Required Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `EASEE_USERNAME` | Your Easee API username | `your-email@example.com` |
| `EASEE_PASSWORD` | Your Easee API password | `your-password` |
| `NODE_ENV` | Environment mode | `production` |
| `VITE_API_URL` | Frontend API base URL | `/api` |

**Important Notes:**
- For Neon: The connection string should include `?sslmode=require`
- For Vercel Postgres: `DATABASE_URL` is automatically set when you connect the database
- `VITE_API_URL` should be `/api` (not a full URL) to use Vercel's rewrites
- Add variables for all environments: Production, Preview, and Development

### 4. Verify Deployment
```

**Important**: 
- If using Vercel Postgres, `DATABASE_URL` is automatically set
- Add these variables in: Project Settings → Environment Variables
- Make sure to add them for all environments (Production, Preview, Development)

### 4. Configure Frontend API URL

The frontend is already configured to work with Vercel. The `client/src/api.js` file uses:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

For Vercel deployment, add this environment variable in Vercel dashboard:

```
VITE_API_URL=/api
```

This makes the frontend call the API at the same domain (e.g., `yourapp.vercel.app/api`).

### 5. Verify Deployment

After deployment:

1. **Check Chargers Endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/chargers
   ```
   Should return: Array of charger objects

2. **Test Frontend**:
   Open `https://your-app.vercel.app` in your browser

3. **Trigger Initial Data Update**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/update-data
   ```
   This will fetch initial data from Easee and Nord Pool

## Automated Data Updates

The application uses Vercel Cron Jobs for automated data updates daily at 2 AM. This is configured in `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/update-data",
    "schedule": "0 2 * * *"
  }
]
```

**Note**: Vercel Cron Jobs are only available on Pro and Enterprise plans. On the Hobby plan, you can:
1. Manually trigger updates: `POST /api/cron/update-data`
2. Use an external service like [cron-job.org](https://cron-job.org) or [GitHub Actions](https://github.com/features/actions) to call your endpoint
3. Upgrade to Vercel Pro

### Alternative: GitHub Actions for Cron Jobs

If you're on Vercel's Hobby plan, you can use GitHub Actions to trigger the data update endpoint:

1. Create `.github/workflows/update-data.yml`:
```yaml
name: Update Data

on:
  schedule:
    # Runs at 2 AM UTC daily
    - cron: '0 2 * * *'
  workflow_dispatch: # Allows manual triggering

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger data update
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/update-data
```

2. Add this file to your repository and push to GitHub
3. The workflow will run automatically on the schedule

## Serverless Architecture

The application has been refactored from an Express monolith to individual serverless functions:

### API Functions Structure

```
api/
├── chargers/
│   ├── index.js          # GET /api/chargers
│   └── [id].js           # Handles /api/chargers/:id/* endpoints
├── prices/
│   └── index.js          # GET /api/prices
├── settings/
│   └── index.js          # GET/PUT /api/settings/*
└── cron/
    └── update-data.js    # POST /api/cron/update-data
```

### Shared Services

Backend logic is organized in reusable services:
- `server/services/energyService.js` - Energy data fetching and storage
- `server/services/priceService.js` - Nord Pool price integration
- `server/services/settingsService.js` - Settings management
- `server/services/easeeService.js` - Easee API integration

These services are imported by the serverless functions as needed.

### Database Connection

The database connection (`server/db/db.js`) automatically enables SSL for production:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

This works seamlessly with Neon, Vercel Postgres, and other managed PostgreSQL providers.

## Routing Configuration

Vercel uses the `rewrites` in `vercel.json` to route requests to the appropriate serverless functions:

```json
"rewrites": [
  {
    "source": "/api/chargers/:id/cost/export",
    "destination": "/api/chargers/[id].js"
  },
  {
    "source": "/api/chargers/:id/cost",
    "destination": "/api/chargers/[id].js"
  },
  // ... more routes
]
```

**Important:** The order of rewrites matters! Vercel processes them sequentially and uses the first match. More specific routes (like `/api/chargers/:id/cost/export`) must come before less specific ones (like `/api/chargers/:id/cost`).

## Local Development

For local development, you have two options:

### Option 1: Using Vercel Dev (Recommended)

This simulates the Vercel serverless environment locally:

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run Vercel dev server
vercel dev
```

Access at: `http://localhost:3000`

### Option 2: Traditional Separate Servers

Run frontend and backend separately (for debugging):

```bash
# Terminal 1 - Backend (if using old server/app.js)
cd server
npm install
npm run dev

# Terminal 2 - Frontend with proxy
cd client
npm install
npm run dev
```

**Note**: The traditional Express server in `server/app.js` is deprecated for Vercel deployment but can still be used locally for development.

## Differences from Traditional Deployment

| Aspect | Traditional Server | Vercel Serverless |
|--------|-------------------|-------------------|
| **Backend** | Single Express server | Individual serverless functions |
| **Scaling** | Manual/Container orchestration | Automatic per-function |
| **Cold Starts** | N/A (always running) | ~100-500ms initial request |
| **State** | Can maintain in-memory state | Stateless (use database) |
| **Cron Jobs** | node-cron in server | Vercel Cron Jobs or external |
| **Database** | Any PostgreSQL | Must support SSL |
| **Cost** | Fixed (server always running) | Pay per execution |

## Important Limitations & Considerations

### 1. **Serverless Function Limits**
- **Execution Time**: Max 10 seconds (Hobby), 60 seconds (Pro), 300 seconds (Enterprise)
- **Memory**: Varies by plan
- If data fetching takes longer, consider breaking into smaller operations

### 2. **No Persistent In-Memory State**
- Each API call runs in a fresh function instance
- Use database or external cache (Redis) for state
- Easee tokens are re-authenticated per request (managed by service)

### 3. **Cold Starts**
- First request after inactivity may take 100-500ms
- Neon's serverless PostgreSQL minimizes database cold starts
- Consider keeping functions warm with periodic health checks

### 4. **Database Connection Pooling**
- Serverless functions create new connections frequently
- Use connection pooling or Neon's connection pooler
- The `pg.Pool` in `server/db/db.js` handles this

### 5. **Cron Jobs**
- Only available on Pro/Enterprise plans
- Alternative: GitHub Actions, AWS EventBridge, or cron-job.org

### 6. **CORS**
- All serverless functions include CORS headers
- Configured for `Access-Control-Allow-Origin: *`
- Adjust in individual function files if needed

### 7. **Proxy Configuration**
- The Express app has `trust proxy` enabled for Vercel deployment
- This allows rate limiting to work correctly behind Vercel's proxy
- Required for express-rate-limit to identify client IPs from `X-Forwarded-For` header
- Configured in `server/app.js` with `app.set('trust proxy', true)`

## Troubleshooting

### Issue: API calls failing

**Solution**: Check that `VITE_API_URL` is set correctly:
```bash
# In Vercel dashboard, add:
VITE_API_URL=/api
```

### Issue: Database connection errors

**Solution**: 
1. Verify `DATABASE_URL` is set correctly with SSL parameters
2. For Neon: Ensure connection string includes `?sslmode=require`
3. Check database allows connections from Vercel IPs (most managed services allow all by default)
4. Verify credentials are correct

### Issue: Cron jobs not running

**Solutions**:
1. Verify you're on Vercel Pro/Enterprise plan
2. Check Vercel Cron Jobs dashboard for execution logs
3. Alternative: Use GitHub Actions or external cron service to POST to `/api/cron/update-data`

### Issue: "Function execution timed out"

**Solution**:
1. Upgrade to Pro plan for 60-second timeout
2. Optimize data fetching queries
3. Break large operations into smaller batches
4. Check if Easee or Nord Pool API is slow

### Issue: Cold starts are slow

**Solution**:
1. This is normal for serverless (~100-500ms)
2. Use Neon's serverless PostgreSQL to minimize database cold starts
3. Consider keeping functions warm with periodic health checks
4. Upgrade to Pro for better cold start performance

### Issue: "Cannot find module" errors

**Solution**:
1. Ensure all dependencies are in `server/package.json`
2. Check that `installCommand` in `vercel.json` installs both client and server dependencies
3. Verify imports use correct relative paths

### Issue: CORS errors in browser

**Solution**:
1. Check that serverless functions include CORS headers
2. Verify `VITE_API_URL` is set to `/api` (same domain)
3. For custom domains, update CORS origin in function files

### Issue: express-rate-limit ValidationError about X-Forwarded-For

**Error Message:**
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

**Solution**:
1. This is already fixed in `server/app.js` with `app.set('trust proxy', true)`
2. Vercel sets the `X-Forwarded-For` header as it proxies requests
3. Express must trust this header for rate limiting to work correctly
4. If you see this error, ensure your Express app includes the trust proxy setting

## Cost Considerations

### Vercel Pricing
- **Hobby (Free)**: 
  - 100 GB bandwidth/month
  - 100 GB-hours serverless execution
  - No cron jobs
  
- **Pro ($20/month per user)**:
  - 1 TB bandwidth
  - 1000 GB-hours serverless execution
  - Cron jobs included
  - 60-second function timeout

### Database Costs
- **Vercel Postgres**: Starts at $0.24/GB per month for storage (see [Vercel Postgres Pricing](https://vercel.com/docs/storage/vercel-postgres/usage-and-pricing))
- **Neon**: Free tier available, paid plans start at $19/month (see [Neon Pricing](https://neon.tech/pricing))
- **Supabase**: Free tier available, paid plans start at $25/month (see [Supabase Pricing](https://supabase.com/pricing))

**Note**: Pricing is subject to change. Check provider websites for current rates.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `EASEE_USERNAME` | Yes | Easee API username | `your-email@example.com` |
| `EASEE_PASSWORD` | Yes | Easee API password | `your-password` |
| `VITE_API_URL` | Yes | Frontend API URL | `/api` |
| `NODE_ENV` | Recommended | Node environment | `production` |
| `VERCEL` | Auto-set | Indicates Vercel environment | `1` |
| `PORT` | Auto-set | Server port (unused in serverless) | `3001` |

## Monitoring & Logs

1. **View Logs**: Vercel Dashboard → Your Project → Logs
2. **Function Analytics**: Vercel Dashboard → Your Project → Analytics
3. **Cron Execution**: Vercel Dashboard → Your Project → Cron Jobs

## Support

For issues specific to:
- **Vercel Platform**: [vercel.com/support](https://vercel.com/support)
- **This Application**: Create an issue in the GitHub repository

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
