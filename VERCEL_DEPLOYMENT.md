# Vercel Deployment Guide

This guide explains how to deploy the Duvbo Grindar Charging Portal to Vercel.

## Overview

The application has been configured to work on Vercel with the following architecture:
- **Frontend**: React + Vite served as static files
- **Backend**: Express API running as Vercel serverless functions
- **Database**: External PostgreSQL (Vercel Postgres recommended)
- **Scheduled Tasks**: Vercel Cron Jobs for data updates

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: You'll need an external PostgreSQL database. Options:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Recommended)
   - [Neon](https://neon.tech/)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)
   - Any other PostgreSQL hosting service
3. **Easee API Credentials**: Your Easee username and password

## Deployment Steps

### 1. Set Up Database

#### Option A: Using Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → Postgres
3. Create a new Postgres database
4. Note the connection string (will be automatically added to your environment variables)
5. Initialize the database schema:
   ```bash
   # Connect to your Vercel Postgres database
   psql "YOUR_VERCEL_POSTGRES_CONNECTION_STRING"
   
   # Run the schema from the repository
   \i server/db/schema.sql
   ```

#### Option B: Using Another PostgreSQL Provider

1. Create a PostgreSQL database with your chosen provider
2. Get the connection string (format: `postgresql://user:password@host:port/database`)
3. Initialize the schema:
   ```bash
   psql "YOUR_CONNECTION_STRING" -f server/db/schema.sql
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

In your Vercel project dashboard, add the following environment variables:

#### Required Variables:

```
DATABASE_URL=postgresql://user:password@host:port/database
EASEE_USERNAME=your-easee-username
EASEE_PASSWORD=your-easee-password
NODE_ENV=production
VERCEL=1
```

#### Optional Variables:

```
PORT=3001  # Will be set automatically by Vercel
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

1. **Check Health Endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check API Root**:
   ```bash
   curl https://your-app.vercel.app/api
   ```
   Should return API information with all endpoints

3. **Test Frontend**:
   Open `https://your-app.vercel.app` in your browser

4. **Trigger Initial Data Update**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/update-data
   ```
   This will fetch initial data from Easee and Nord Pool

## Automated Data Updates

The application uses Vercel Cron Jobs for automated data updates every 30 minutes. This is configured in `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/update-data",
    "schedule": "*/30 * * * *"
  }
]
```

**Note**: Vercel Cron Jobs are only available on Pro and Enterprise plans. On the Hobby plan, you can:
1. Manually trigger updates: `POST /api/cron/update-data`
2. Use an external service like [cron-job.org](https://cron-job.org) to call your endpoint
3. Upgrade to Vercel Pro

## Architecture Changes for Vercel

The following changes were made to support Vercel deployment:

### 1. Serverless Function Adapter (`api/index.js`)
```javascript
import app from '../server/app.js';
export default app;
```

### 2. Conditional Server Start (`server/app.js`)
```javascript
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    // Start server only in non-serverless mode
  });
}
```

### 3. Cron Job Endpoint (`server/routes/cron.js`)
New endpoint for manual/scheduled data updates:
- `POST /api/cron/update-data`

### 4. Vercel Configuration (`vercel.json`)
- Static build for frontend
- Serverless functions for backend
- Route rewrites
- Cron job configuration

## Important Limitations & Considerations

### 1. **Serverless Function Limits**
- **Execution Time**: Max 10 seconds (Hobby), 60 seconds (Pro), 300 seconds (Enterprise)
- If data fetching takes longer, consider breaking it into smaller batches

### 2. **No Persistent In-Memory State**
- Each API call runs in a fresh serverless function instance
- Easee tokens are re-authenticated per request (cached via service)
- This is already handled by the existing code

### 3. **Cron Jobs**
- Only available on Pro/Enterprise plans
- Alternative: Use external cron services to call the endpoint

### 4. **Database Connection Pooling**
- Serverless functions create new connections frequently
- Recommendation: Use connection pooling (e.g., Prisma, pg-pool)
- Vercel Postgres includes connection pooling automatically

### 5. **Node-cron Won't Work**
- The original node-cron job in `server/app.js` won't execute in serverless
- It's kept for backward compatibility when running locally
- Use Vercel Cron Jobs or external scheduling instead

## Development vs. Production

### Local Development (Unchanged)
```bash
# Start backend
cd server
npm run dev

# Start frontend
cd client
npm run dev
```

### Production on Vercel
- Backend runs as serverless functions
- Frontend served as static files
- Cron jobs via Vercel Cron or external service
- Database is external

## Troubleshooting

### Issue: API calls failing

**Solution**: Check that `VITE_API_URL` is set correctly:
```bash
# In Vercel dashboard, add:
VITE_API_URL=/api
```

### Issue: Database connection errors

**Solution**: 
1. Verify `DATABASE_URL` is set correctly
2. Check database allows connections from Vercel IPs
3. For Vercel Postgres, use the pooling connection string

### Issue: Cron jobs not running

**Solutions**:
1. Verify you're on Pro/Enterprise plan
2. Check Vercel Cron Jobs dashboard for execution logs
3. Alternative: Use external cron service to POST to `/api/cron/update-data`

### Issue: "Function execution timed out"

**Solution**:
1. Upgrade to Pro plan for 60-second timeout
2. Optimize data fetching queries
3. Break large operations into smaller batches

### Issue: Cold starts are slow

**Solution**:
1. This is normal for serverless
2. Consider keeping functions warm with periodic calls
3. Upgrade to Pro for better cold start performance

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
