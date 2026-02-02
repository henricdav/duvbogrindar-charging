# 🚀 QUICK START GUIDE

Get the Duvbo Grindar Charging Portal running in 5 minutes!

## ⚡ Fastest Way: Using Docker

**Requirements:** Docker and Docker Compose installed

```bash
# 1. Clone and enter the repository
git clone https://github.com/henricdav/duvbogrindar-charging.git
cd duvbogrindar-charging

# 2. Set up environment variables
cp .env.example .env
nano .env  # or use your favorite editor
# Add your EASEE_USERNAME and EASEE_PASSWORD

# 3. Start everything!
docker-compose up -d

# 4. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/health
```

That's it! The application is now running. 🎉

---

## 🔧 Alternative: Manual Setup

**Requirements:** Node.js 18+, PostgreSQL 13+

### Step 1: Database Setup

```bash
# Create database
createdb duvbogrindar_charging

# Initialize schema
psql -d duvbogrindar_charging -f server/db/schema.sql
```

### Step 2: Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Add your credentials

# Start the backend
npm start
```

Backend will run on **http://localhost:3001**

### Step 3: Frontend Setup

Open a **NEW TERMINAL** window:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the frontend
npm run dev
```

Frontend will run on **http://localhost:3000**

---

## 📋 Required Environment Variables

Edit your `.env` file (in project root for Docker, or `server/.env` for manual):

```env
# Easee API Credentials (REQUIRED)
EASEE_USERNAME=your-easee-username
EASEE_PASSWORD=your-easee-password

# Database Configuration (for Docker, auto-configured)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/duvbogrindar_charging
```

**Where to get Easee credentials:**
- Log in to your Easee account at https://easee.com
- Go to Account Settings → API Access
- Create or use existing API credentials

---

## ✅ Verify Installation

1. **Check Backend Health:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Frontend:**
   - Open http://localhost:3000 in your browser
   - You should see the Duvbo Grindar Charging Portal dashboard

3. **Check Database:**
   ```bash
   # List chargers
   curl http://localhost:3001/api/chargers
   ```
   Should return 10 chargers (EH001-EH010)

---

## 🛠️ Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env is correct
- For Docker: `docker-compose logs postgres`

### Issue: "Easee authentication failed"

**Solution:**
- Verify EASEE_USERNAME and EASEE_PASSWORD in .env
- Test credentials at https://easee.com
- Check backend logs: `docker-compose logs backend` or check console

### Issue: "Port already in use"

**Solution:**
```bash
# Find process using the port
lsof -i :3000  # for frontend
lsof -i :3001  # for backend

# Kill the process
kill -9 <PID>
```

### Issue: "No data showing in UI"

**Solution:**
- Wait 5 seconds after backend starts (initial data fetch)
- Check backend logs for API errors
- Verify Easee credentials are correct
- Data fetches every 30 minutes automatically

---

## 🎯 What's Next?

1. **Configure Pricing**
   - Click "⚙️ Show Pricing Settings" in the UI
   - Set your VAT percentage (default: 25%)
   - Set fixed costs per kWh (grid fees, etc.)

2. **View Energy Data**
   - Select a charger from dropdown
   - Choose a date range
   - View charts and tables

3. **Export Data**
   - Click "📊 Export to Excel" button
   - Download detailed cost breakdown

---

## 📚 More Information

- **Full Documentation:** See [README.md](README.md)
- **Implementation Details:** See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **API Documentation:** See README.md "API Endpoints" section

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review full documentation in README.md
3. Check backend logs: `docker-compose logs backend` (Docker) or console output (manual)
4. Check frontend console in browser Dev Tools (F12)
5. Open an issue on GitHub

---

**Happy Charging! ⚡🔋**
