# Duvbo Grindar Charging Portal

A fullstack application for visualizing energy consumption and costs per charger for BRF Duvbo Grindar housing association.

## 🚀 Quick Start

**Want to run the application immediately?** See **[QUICKSTART.md](QUICKSTART.md)** for a 5-minute setup guide!

**TL;DR (with Docker):**
```bash
cp .env.example .env
# Edit .env with your Easee credentials
./run.sh
# Open http://localhost:3000
```

## 📚 Documentation

- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** - Direct answer: "How can I run this application?"
- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and workflows
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Detailed implementation notes

---

## Features

- **Real-time Energy Monitoring**: Track hourly energy consumption for 10 chargers
- **Flexible Pricing Configuration**: 
  - Use Nord Pool SE3 spot prices with configurable VAT and fixed costs
  - Formula: Total Price = Spot Price × (1 + VAT%) + Fixed Cost per kWh
  - Or use a fully fixed price to override spot pricing
- **Cost Calculation**: Automatic calculation of costs with customizable pricing parameters
- **Excel Export**: Export detailed cost data to Excel spreadsheets
- **Interactive Dashboard**: Select chargers, date ranges, and view data in multiple formats
- **Data Visualization**: Line and bar charts for energy consumption and costs
- **Detailed Tables**: View hourly data with energy, prices, and calculated costs
- **Automated Data Updates**: Background cron jobs fetch data every 30 minutes

## Technology Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Easee API** integration for charger data
- **Nord Pool API** integration for spot prices
- **ExcelJS** for Excel file generation

### Frontend
- **React** with Vite
- **Recharts** for data visualization
- **Axios** for API communication
- **date-fns** for date handling

## Architecture

```
project/
├── README.md
├── .gitignore
├── server/               # Backend Express application
│   ├── package.json
│   ├── app.js           # Main server file with routes and cron jobs
│   ├── .env.example     # Environment variables template
│   ├── routes/
│   │   ├── chargers.js  # Charger endpoints
│   │   └── prices.js    # Price endpoints
│   ├── services/
│   │   ├── easeeService.js   # Easee API authentication and data fetching
│   │   ├── energyService.js  # Energy data management
│   │   └── priceService.js   # Nord Pool price integration
│   └── db/
│       ├── db.js        # PostgreSQL connection
│       └── schema.sql   # Database schema and seed data
└── client/              # Frontend React application
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── api.js       # API client
        └── components/
            ├── ChargerSelector.jsx
            ├── DateRangePicker.jsx
            ├── EnergyChart.jsx
            ├── CostSummary.jsx
            └── DataTable.jsx
```

## Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 13.x or higher
- **Easee account** with API credentials
- **npm** or **yarn** package manager

## Installation

### Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/henricdav/duvbogrindar-charging.git
cd duvbogrindar-charging

# Create .env file with your Easee credentials
cp .env.example .env
# Edit .env with your EASEE_USERNAME and EASEE_PASSWORD

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

The Docker setup includes:
- PostgreSQL database with automatic schema initialization
- Backend Express server
- Frontend React development server

### Manual Installation

If you prefer to run services manually:

#### 1. Clone the Repository

```bash
git clone https://github.com/henricdav/duvbogrindar-charging.git
cd duvbogrindar-charging
```

#### Quick Setup Script

Run the automated setup script:

```bash
./setup.sh
```

Or follow the manual steps below:

#### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb duvbogrindar_charging
```

Initialize the database schema:

```bash
psql -d duvbogrindar_charging -f server/db/schema.sql
```

This will:
- Create tables: `chargers`, `hourly_energy`, `spotprices`
- Add indices for query optimization
- Seed 10 chargers (EH001 through EH010)

#### 3. Backend Setup

Navigate to the server directory:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/duvbogrindar_charging

# Easee API Credentials
EASEE_USERNAME=your-easee-username
EASEE_PASSWORD=your-easee-password

# Server Configuration
PORT=3001
NODE_ENV=development
```

#### 4. Frontend Setup

Navigate to the client directory:

```bash
cd ../client
```

Install dependencies:

```bash
npm install
```

## Running the Application

### Start the Backend Server

From the `server` directory:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

Initial data fetch will occur 5 seconds after startup, then every 30 minutes automatically.

### Start the Frontend Development Server

From the `client` directory:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Chargers

- **GET** `/api/chargers` - List all chargers
- **GET** `/api/chargers/:id/energy?from=&to=` - Get hourly energy data for a charger
- **GET** `/api/chargers/:id/cost?from=&to=` - Get hourly cost data (energy + prices)
- **GET** `/api/chargers/:id/cost/export?from=&to=` - Export cost data to Excel

### Prices

- **GET** `/api/prices?from=&to=` - Get spot price time series

### Settings

- **GET** `/api/settings` - Get all settings
- **GET** `/api/settings/pricing` - Get pricing configuration
- **PUT** `/api/settings/pricing` - Update pricing configuration

### Health

- **GET** `/api/health` - Health check endpoint

## Pricing Configuration

The application supports flexible pricing with two modes:

### Mode 1: Spot Price + VAT + Fixed Cost (Default)

```
Total Price per kWh = Spot Price × (1 + VAT%) + Fixed Cost per kWh
```

**Example:**
- Spot Price: 1.00 SEK/kWh
- VAT: 25%
- Fixed Cost: 0.50 SEK/kWh
- **Total: 1.00 × 1.25 + 0.50 = 1.75 SEK/kWh**

### Mode 2: Fully Fixed Price

Use a single fixed price that overrides all spot pricing calculations.

### Configuring Pricing

Use the Pricing Settings panel in the UI or update via API:

```bash
# Get current pricing configuration
curl http://localhost:3001/api/settings/pricing

# Update pricing configuration
curl -X PUT http://localhost:3001/api/settings/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "useFixedPrice": false,
    "vatPercentage": 25,
    "fixedCostSEKPerKwh": 0.50
  }'
```

### Example API Calls

```bash
# List all chargers
curl http://localhost:3001/api/chargers

# Get energy data
curl "http://localhost:3001/api/chargers/EH001/energy?from=2026-01-01T00:00:00Z&to=2026-01-07T23:59:59Z"

# Get cost data
curl "http://localhost:3001/api/chargers/EH001/cost?from=2026-01-01T00:00:00Z&to=2026-01-07T23:59:59Z"

# Get spot prices
curl "http://localhost:3001/api/prices?from=2026-01-01T00:00:00Z&to=2026-01-07T23:59:59Z"
```

## Database Schema

### chargers
- `id` (TEXT, PRIMARY KEY) - Charger identifier
- `name` (TEXT) - Charger display name

### hourly_energy
- `id` (SERIAL, PRIMARY KEY) - Auto-increment ID
- `charger_id` (TEXT) - Foreign key to chargers
- `ts` (TIMESTAMPTZ) - Timestamp of the measurement
- `kwh` (NUMERIC) - Energy consumption in kWh
- Unique constraint on `(charger_id, ts)`

### spotprices
- `ts` (TIMESTAMPTZ, PRIMARY KEY) - Timestamp of the price
- `price_sek_per_kwh` (NUMERIC) - Price in SEK per kWh

### settings
- `key` (TEXT, PRIMARY KEY) - Setting key
- `value` (TEXT) - Setting value
- `description` (TEXT) - Setting description
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

Default settings:
- `use_fixed_price`: Whether to use fixed price mode
- `fixed_price_sek_per_kwh`: Fixed price when in fixed price mode
- `vat_percentage`: VAT percentage applied to spot prices
- `fixed_cost_sek_per_kwh`: Fixed cost added on top of spot price and VAT

## Data Sources

### Easee API

The application uses Easee API to fetch charger data:

- **Authentication**: OAuth2 with username/password
- **Endpoint**: `GET /api/chargers/lifetime-energy/{chargerId}/hourly`
- **Token Management**: Automatic refresh with ~1 hour expiry
- **Data**: Hourly energy consumption in kWh

### Nord Pool API

Spot prices are fetched from Nord Pool:

- **Endpoint**: `https://www.nordpoolgroup.com/api/marketdata/page/10`
- **Parameters**: `currency=SEK`, `area=SE3`
- **Data**: Hourly spot prices, converted from SEK/MWh to SEK/kWh

## Automated Data Updates

The backend includes a cron job that runs every 30 minutes (at :00 and :30) to:
1. Fetch latest spot prices from Nord Pool
2. Fetch energy data for all chargers from Easee API
3. Update the database with new data

The data update covers the last 7 days to ensure recent data is always available.

## Excel Export

The application supports exporting cost data to Excel format with detailed breakdown:

### Export Features

- **Comprehensive Data**: Includes timestamp, energy consumption, spot prices, VAT, fixed costs, and total costs
- **Summary Row**: Total energy consumption and costs
- **Pricing Information**: Header includes the pricing configuration used
- **Formatted Columns**: Properly formatted numbers with appropriate decimal places

### Using Excel Export

**From the UI:**
1. Select a charger and date range
2. Click the "📊 Export to Excel" button
3. The file will download automatically

**Via API:**
```bash
curl "http://localhost:3001/api/chargers/EH001/cost/export?from=2026-01-01T00:00:00Z&to=2026-01-07T23:59:59Z" \
  -o energy-costs.xlsx
```

The exported Excel file includes:
- Title with charger name and ID
- Date range
- Pricing configuration details
- Hourly breakdown with:
  - Timestamp
  - Energy (kWh)
  - Spot Price (SEK/kWh)
  - VAT amount
  - Fixed Cost
  - Total Price (SEK/kWh)
  - Total Cost (SEK)
- Summary row with totals

## Security Considerations

- Backend handles all external API authentication
- Easee tokens stored in memory (not persisted)
- Frontend communicates only with backend API
- Environment variables used for sensitive credentials
- CORS enabled for frontend-backend communication

## Error Handling

The application includes comprehensive error handling:
- API request failures are logged and reported
- Database errors are caught and handled gracefully
- Frontend displays user-friendly error messages
- Token refresh logic handles expired credentials

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
3. Serve the built files with the backend or a web server
4. Use a process manager like PM2 for the Node.js server:
   ```bash
   npm install -g pm2
   pm2 start server/app.js --name duvbogrindar-charging
   ```
5. Set up PostgreSQL with proper security
6. Configure SSL for database connections
7. Use environment variables or secrets management for credentials

## Development

### Backend Development

The backend uses ES modules (`type: "module"` in package.json).

Key files:
- `app.js` - Main application setup, routes, and cron jobs
- `services/*.js` - Business logic for data fetching and management
- `routes/*.js` - API endpoint handlers
- `db/db.js` - Database connection

### Frontend Development

The frontend uses Vite for fast development and hot module replacement.

Key files:
- `App.jsx` - Main application component
- `components/*.jsx` - Reusable UI components
- `api.js` - API client with Axios

### Adding New Chargers

To add more chargers, insert them into the database:

```sql
INSERT INTO chargers (id, name) VALUES ('EH011', 'Charger 11');
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check Easee credentials are correct

### No data displayed
- Wait for initial data fetch (5 seconds after server start)
- Check server logs for API errors
- Verify Easee API credentials
- Check network connectivity to external APIs

### Database connection errors
- Ensure PostgreSQL is running
- Verify database exists: `psql -l`
- Check connection string format
- Verify user permissions

## License

Copyright © 2026 BRF Duvbo Grindar

## Support

For issues or questions, please contact the development team or create an issue in the repository.
