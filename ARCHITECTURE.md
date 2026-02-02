# Application Architecture & Workflow

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Duvbo Grindar Charging Portal                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   External   │         │   Backend    │         │   Frontend   │
│   Services   │ ───────▶│   (Node.js)  │◀────────│   (React)    │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                         │
      │                         ▼                         │
      │                  ┌──────────────┐                │
      │                  │  PostgreSQL  │                │
      │                  │   Database   │                │
      │                  └──────────────┘                │
      │                                                   │
      ▼                                                   ▼
┌─────────────┐                                   ┌─────────────┐
│ Easee API   │                                   │   Browser   │
│ (Chargers)  │                                   │ localhost:  │
└─────────────┘                                   │    3000     │
                                                  └─────────────┘
┌─────────────┐
│ Nord Pool   │
│ (Prices)    │
└─────────────┘
```

## Data Flow

```
1. User Opens Browser
   ↓
2. Frontend (React) loads at http://localhost:3000
   ↓
3. Fetches data from Backend API at http://localhost:3001
   ↓
4. Backend retrieves data from PostgreSQL
   │
   ├── Charger info (10 chargers: EH001-EH010)
   ├── Energy data (hourly consumption)
   ├── Spot prices (from Nord Pool)
   └── Settings (pricing configuration)
   ↓
5. Frontend displays:
   │
   ├── Interactive Dashboard
   ├── Charts & Graphs
   ├── Data Tables
   └── Export Options
```

## Background Jobs

```
Daily at 2 AM:
┌─────────────────────────────────────────┐
│  Cron Job (Automated Data Update)      │
└─────────────────────────────────────────┘
                │
                ├─▶ Fetch spot prices from Nord Pool
                │   └─▶ Store in database (spotprices table)
                │
                └─▶ Fetch energy data from Easee API
                    └─▶ Store in database (hourly_energy table)
```

## Component Architecture

### Backend Routes

```
/api/chargers
├── GET  /                        → List all chargers
├── GET  /:id/energy             → Get energy data
├── GET  /:id/cost               → Get cost data
└── GET  /:id/cost/export        → Export to Excel

/api/prices
└── GET  /                        → Get spot prices

/api/settings
├── GET  /pricing                 → Get pricing config
└── PUT  /pricing                 → Update pricing config

/api/health                       → Health check
```

### Frontend Components

```
App.jsx
├── PricingSettings              → Configure VAT & fixed costs
├── Controls
│   ├── ChargerSelector          → Select charger
│   ├── DateRangePicker          → Select date range
│   └── ExportButton             → Export to Excel
├── CostSummary                  → Display totals
├── EnergyChart                  → Visualize data (line/bar)
└── DataTable                    → Detailed table view
```

## Pricing Calculation

```
Mode 1: Spot Price Mode (Default)
┌──────────────────────────────────────────────────────┐
│ Total Price = Spot Price × (1 + VAT%) + Fixed Cost  │
└──────────────────────────────────────────────────────┘
                     │
                     ├─▶ Spot Price: From Nord Pool (SE3)
                     ├─▶ VAT: Configurable % (default 25%)
                     └─▶ Fixed Cost: Per kWh (grid fees, etc.)

Mode 2: Fixed Price Mode
┌──────────────────────────────────────────────────────┐
│ Total Price = Fixed Price per kWh                    │
└──────────────────────────────────────────────────────┘
                     │
                     └─▶ Overrides all spot pricing
```

## Database Schema

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  chargers   │     │  hourly_energy   │     │ spotprices   │
├─────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)     │────▶│ charger_id (FK)  │     │ ts (PK)      │
│ name        │     │ ts               │◀────│ price_sek... │
└─────────────┘     │ kwh              │     └──────────────┘
                    └──────────────────┘
                              
                    ┌──────────────────┐
                    │    settings      │
                    ├──────────────────┤
                    │ key (PK)         │
                    │ value            │
                    │ description      │
                    └──────────────────┘
```

## User Journey

```
1. Start Application
   └─▶ ./run.sh or docker-compose up -d

2. Open Browser
   └─▶ http://localhost:3000

3. Configure Pricing (First Time)
   └─▶ Click "⚙️ Show Pricing Settings"
       ├─▶ Set VAT percentage
       ├─▶ Set fixed cost per kWh
       └─▶ Save

4. View Energy Data
   └─▶ Select charger (EH001-EH010)
   └─▶ Choose date range
   └─▶ View charts & tables

5. Export Data
   └─▶ Click "📊 Export to Excel"
   └─▶ Download spreadsheet with breakdown

6. Stop Application
   └─▶ ./stop.sh or docker-compose down
```

## Development Workflow

```
Development Mode:
┌─────────────────────────────────────────┐
│ Terminal 1: Backend with Auto-Reload   │
│ cd server && npm run dev                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Terminal 2: Frontend with Hot Reload   │
│ cd client && npm run dev                │
└─────────────────────────────────────────┘

Production Build:
┌─────────────────────────────────────────┐
│ Backend: npm start (in server/)         │
│ Frontend: npm run build (in client/)    │
│ Serve: dist/ folder with web server     │
└─────────────────────────────────────────┘
```

## Monitoring & Logs

```
Docker Mode:
├── View all logs:     docker-compose logs -f
├── Backend logs:      docker-compose logs -f backend
├── Frontend logs:     docker-compose logs -f frontend
└── Database logs:     docker-compose logs -f postgres

Manual Mode:
├── Backend logs:      Console output in backend terminal
├── Frontend logs:     Browser DevTools Console (F12)
└── Database logs:     PostgreSQL logs location varies by OS
```

## Security Features

```
┌──────────────────────────────────────────────┐
│ Rate Limiting                                │
│ ├─▶ 100 requests per 15 minutes per IP      │
│ └─▶ Applied to all /api/* routes            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Environment Variables                        │
│ ├─▶ Easee credentials in .env               │
│ ├─▶ Database credentials in .env            │
│ └─▶ Never committed to git                  │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Token Management                             │
│ ├─▶ Easee OAuth2 tokens in memory           │
│ ├─▶ Auto-refresh before expiry              │
│ └─▶ ~1 hour token lifetime                  │
└──────────────────────────────────────────────┘
```

## Troubleshooting Flow

```
Problem: Application not working
         │
         ├─▶ Backend not responding?
         │   ├─▶ Check: curl http://localhost:3001/api/health
         │   ├─▶ Check logs: docker-compose logs backend
         │   └─▶ Verify: DATABASE_URL in .env
         │
         ├─▶ Frontend not loading?
         │   ├─▶ Check: http://localhost:3000
         │   ├─▶ Check browser console (F12)
         │   └─▶ Verify: Backend is running
         │
         ├─▶ No data displayed?
         │   ├─▶ Wait 5 seconds (initial fetch)
         │   ├─▶ Check: Easee credentials in .env
         │   └─▶ Check backend logs for API errors
         │
         └─▶ Database connection error?
             ├─▶ Check: PostgreSQL is running
             ├─▶ Check: DATABASE_URL is correct
             └─▶ Test: psql -d duvbogrindar_charging
```
