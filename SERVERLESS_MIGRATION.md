# Migration to Serverless Vercel Architecture

This document explains the migration from a traditional Express server to a fully serverless Vercel deployment.

## Overview of Changes

The application has been refactored to run entirely on Vercel's serverless infrastructure. The Express monolith has been split into individual serverless functions while maintaining all functionality.

## What Changed

### 1. Backend Architecture

**Before:**
- Single Express server in `server/app.js`
- Routes in `server/routes/` using Express Router
- Server runs continuously with node-cron for scheduled tasks

**After:**
- Individual serverless functions in `api/` directory
- Each endpoint is a separate function
- Vercel Cron Jobs for scheduled tasks
- Shared business logic in `server/services/` (unchanged)

### 2. API Structure

**Old Structure:**
```
server/app.js → Mounts all routes
  ├── server/routes/chargers.js
  ├── server/routes/prices.js
  ├── server/routes/settings.js
  └── server/routes/cron.js
```

**New Structure:**
```
api/
├── chargers/
│   ├── index.js          → GET /api/chargers
│   └── [id].js           → GET /api/chargers/:id/*
├── prices/
│   └── index.js          → GET /api/prices
├── settings/
│   └── index.js          → GET/PUT /api/settings/*
└── cron/
    └── update-data.js    → POST /api/cron/update-data
```

### 3. Frontend Configuration

**Before:**
```javascript
// client/src/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// client/vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

**After:**
```javascript
// client/src/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// client/vite.config.js
// Proxy removed - uses Vercel rewrites instead
```

### 4. Routing

**Before:**
- Express routing handled by the framework
- All routes defined in route files

**After:**
- Vercel rewrites in `vercel.json` map URLs to functions
```json
"rewrites": [
  {
    "source": "/api/chargers/:id/cost/export",
    "destination": "/api/chargers/[id].js"
  },
  // ... more routes
]
```

### 5. CORS Handling

**Before:**
- CORS middleware in Express app
```javascript
app.use(cors());
```

**After:**
- CORS headers in each serverless function
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### 6. Cron Jobs

**Before:**
- node-cron running in Express server
```javascript
cron.schedule('0 2 * * *', async () => {
  // Update data
});
```

**After:**
- Vercel Cron Jobs configuration
```json
"crons": [
  {
    "path": "/api/cron/update-data",
    "schedule": "0 2 * * *"
  }
]
```
- Alternative: GitHub Actions for Hobby plan users

## What Stayed the Same

### Services Layer (Unchanged)
All business logic remains in `server/services/`:
- `easeeService.js` - Easee API integration
- `energyService.js` - Energy data management
- `priceService.js` - Nord Pool price fetching
- `settingsService.js` - Settings management

These services are imported and used by serverless functions.

### Database Layer (Unchanged)
- `server/db/db.js` - PostgreSQL connection pool
- Already configured for SSL in production
- Works with any managed PostgreSQL (Neon, Vercel Postgres, etc.)

### Database Schema (Unchanged)
- `server/db/schema.sql` - Same database structure
- No migration required

### Frontend Code (Minimal Changes)
- React components unchanged
- Only API base URL updated
- All functionality preserved

## Migration Benefits

### 1. **Scalability**
- Automatic scaling per function
- No server capacity planning
- Pay only for what you use

### 2. **Performance**
- Functions deployed globally on Vercel's edge network
- Faster response times for users worldwide
- Optimized cold start performance

### 3. **Cost Efficiency**
- No always-on server costs
- Free tier available (Vercel Hobby)
- Cost scales with usage

### 4. **Maintenance**
- No server management
- No OS updates or security patches
- Focus on application code

### 5. **Development Experience**
- Easy local development with `vercel dev`
- Preview deployments for every PR
- Instant rollbacks

## Migration Checklist

If you're migrating an existing deployment:

- [ ] **Set up database**: Create Neon or Vercel Postgres instance
- [ ] **Initialize schema**: Run `server/db/schema.sql` on new database
- [ ] **Migrate data**: Export from old database, import to new (if needed)
- [ ] **Configure Vercel**: Add environment variables in Vercel dashboard
- [ ] **Deploy**: Push to GitHub or use `vercel` CLI
- [ ] **Test endpoints**: Verify all API endpoints work
- [ ] **Trigger data update**: POST to `/api/cron/update-data`
- [ ] **Set up cron**: Configure Vercel Cron Jobs or GitHub Actions
- [ ] **Update DNS**: Point domain to Vercel (if using custom domain)
- [ ] **Monitor**: Check Vercel logs for any issues

## Breaking Changes

### For API Consumers
- **None** - All endpoints remain the same
- Base URL changes from separate domain to `/api` on same domain

### For Developers
1. **Local development**:
   - Use `vercel dev` instead of `npm run dev` (recommended)
   - Or run frontend/backend separately (still works)

2. **Debugging**:
   - View logs in Vercel dashboard instead of console
   - Use `console.log` - appears in Vercel logs

3. **Cron jobs**:
   - Requires Vercel Pro for automatic execution
   - Or use GitHub Actions (free alternative)

## Rollback Plan

If you need to rollback to the traditional server:

1. **Use the old `server/app.js`**:
   - Still included in repository
   - Can run as traditional Express server

2. **Update frontend**:
   - Change `VITE_API_URL` to point to separate backend URL
   - Restore vite proxy if needed

3. **Database**:
   - No changes needed - works with any PostgreSQL

4. **Deploy**:
   - Use Docker Compose or traditional hosting
   - Scripts (`run.sh`, `docker-compose.yml`) still available

## Future Considerations

### Potential Optimizations
1. **Database connection pooling**: Consider Prisma for better connection management
2. **Caching**: Add Redis for caching frequently accessed data
3. **CDN**: Use Vercel's edge network for static assets
4. **Image optimization**: Add Vercel Image Optimization if needed

### Monitoring & Observability
- Set up Vercel Analytics for performance insights
- Consider Sentry for error tracking
- Use Vercel Logs for debugging

### Security
- All functions include CORS - restrict to specific origins in production
- Use Vercel Environment Variables for secrets
- Consider adding authentication/authorization

## Support

For migration assistance:
- See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for deployment guide
- Check Vercel documentation: https://vercel.com/docs
- Create issue in GitHub repository

## Conclusion

This migration enables the application to run on modern serverless infrastructure while maintaining all existing functionality. The architecture is more scalable, cost-effective, and easier to maintain than traditional server-based deployments.
