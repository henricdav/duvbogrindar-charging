# Running on Vercel - Quick Answer

## Do I need to modify the app to run on Vercel?

**Short Answer**: Yes, but the modifications have been made for you! The app is now ready to deploy to Vercel.

## What was modified?

The following changes were made to support Vercel deployment:

### 1. New Configuration Files
- **`vercel.json`** - Vercel deployment configuration
- **`api/index.js`** - Serverless function adapter for Express app
- **`.vercelignore`** - Files to exclude from deployment
- **`package.json`** (root) - Monorepo configuration for Vercel

### 2. Code Changes
- **`server/app.js`** - Modified to work in serverless mode (doesn't call `app.listen()` on Vercel)
- **`server/routes/cron.js`** - New endpoint for scheduled data updates via Vercel Cron Jobs

### 3. Documentation
- **`VERCEL_DEPLOYMENT.md`** - Complete deployment guide
- **`README.md`** - Updated with Vercel deployment section
- **`.env.example`** - Updated with all required environment variables

## What do you need to do?

1. **Set up a PostgreSQL database** (Vercel Postgres recommended)
2. **Deploy to Vercel** (via CLI or Git integration)
3. **Add environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `EASEE_USERNAME`
   - `EASEE_PASSWORD`
   - `VITE_API_URL=/api`

That's it! See **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** for detailed step-by-step instructions.

## Key Differences from Local Development

| Feature | Local Development | Vercel Deployment |
|---------|------------------|-------------------|
| **Backend** | Express server on port 3001 | Serverless functions |
| **Frontend** | Vite dev server on port 3000 | Static files |
| **Database** | Local PostgreSQL or Docker | External PostgreSQL (Vercel Postgres, Neon, etc.) |
| **Cron Jobs** | node-cron (automatic) | Vercel Cron Jobs (requires configuration) |
| **API URL** | `http://localhost:3001/api` | `/api` (same domain) |

## Will local development still work?

**Yes!** All local development workflows remain unchanged:
- Docker Compose: `./run.sh` or `docker-compose up`
- Manual: `npm run dev` in both `server/` and `client/` directories

The app detects the environment and runs accordingly.

## Important Notes

1. **Cron Jobs**: Automated data updates require Vercel Pro plan ($20/month) or use external cron service
2. **Database**: Must be external (local PostgreSQL won't work on Vercel)
3. **Serverless Limits**: API requests have execution time limits (10s Hobby, 60s Pro)

## Need Help?

See the complete guide: **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)**
