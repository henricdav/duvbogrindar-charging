# How to Run This Application

## Quick Answer

**The fastest way to run this application:**

```bash
# 1. Setup environment
cp .env.example .env
nano .env  # Add your Easee credentials

# 2. Run it!
./run.sh

# 3. Open browser
# Visit: http://localhost:3000
```

That's it! The application is now running.

---

## Three Ways to Run

### 🥇 Method 1: Using Helper Script (Recommended)

```bash
./run.sh
```

This script will:
- Check if Docker is available
- Start all services (database, backend, frontend)
- Perform health checks
- Display access URLs

To stop:
```bash
./stop.sh
```

### 🥈 Method 2: Using Docker Compose

```bash
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

To stop:
```bash
docker-compose down
```

### 🥉 Method 3: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
```

---

## Prerequisites

Before running, you need:

1. **Docker** (for Method 1 & 2) OR **Node.js 18+** and **PostgreSQL 13+** (for Method 3)
2. **Easee API credentials** - Get from https://easee.com account settings
3. **Environment variables** - Copy `.env.example` to `.env` and fill in your credentials

### Setting Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
nano .env  # or use any text editor
```

Required variables:
```env
EASEE_USERNAME=your-easee-username
EASEE_PASSWORD=your-easee-password
```

---

## Verification

After starting, verify everything works:

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Frontend:**
   Open http://localhost:3000 in your browser

3. **API:**
   ```bash
   curl http://localhost:3001/api/chargers
   ```
   Should return list of 10 chargers

---

## What Happens When You Run?

```
Starting the application will:
├── Start PostgreSQL database (or use existing)
├── Initialize database schema
├── Start backend server (Node.js/Express)
│   ├── Connect to database
│   ├── Authenticate with Easee API
│   ├── Start cron jobs for data updates
│   └── Listen on port 3001
└── Start frontend server (React/Vite)
    ├── Connect to backend API
    └── Listen on port 3000

After ~5 seconds:
└── Initial data fetch from Easee and Nord Pool

Then daily at 2 AM:
└── Automated data updates
```

---

## First Time User Guide

1. **Clone repository:**
   ```bash
   git clone https://github.com/henricdav/duvbogrindar-charging.git
   cd duvbogrindar-charging
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   nano .env  # Add your Easee credentials
   ```

3. **Run application:**
   ```bash
   ./run.sh
   ```

4. **Open in browser:**
   - Go to http://localhost:3000
   - You should see the charging portal dashboard

5. **Configure pricing (first time):**
   - Click "⚙️ Show Pricing Settings"
   - Set VAT percentage (default: 25%)
   - Set fixed cost per kWh
   - Click "Save Changes"

6. **View data:**
   - Select a charger from dropdown
   - Choose a date range
   - View charts and tables

---

## Common Issues

### "Cannot connect to database"
- **Docker:** Run `docker-compose logs postgres` to check database logs
- **Manual:** Ensure PostgreSQL is running with `pg_isready`
- **Solution:** Check `DATABASE_URL` in `.env` file

### "Easee authentication failed"
- **Check:** Your credentials in `.env` file
- **Verify:** You can login at https://easee.com with same credentials
- **Solution:** Update `EASEE_USERNAME` and `EASEE_PASSWORD` in `.env`

### "Port already in use"
- **Find process:** `lsof -i :3000` or `lsof -i :3001`
- **Kill process:** `kill -9 <PID>`
- **Alternative:** Change port in configuration

### "No data showing"
- **Wait:** Initial data fetch takes 5 seconds after backend starts
- **Check:** Backend logs for any errors
- **Verify:** Easee API credentials are correct

---

## Need More Help?

- **Quick Start Guide:** See [QUICKSTART.md](QUICKSTART.md)
- **Architecture Diagrams:** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Full Documentation:** See [README.md](README.md)
- **Implementation Details:** See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## Development Mode

For development with hot-reload:

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

---

**That's all you need to know to run the application!** 🎉

For any other questions, check the documentation files listed above.
