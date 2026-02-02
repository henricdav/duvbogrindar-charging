#!/bin/bash
# Quick setup script for Duvbo Grindar Charging Portal

set -e

echo "================================"
echo "Duvbo Grindar Charging Portal"
echo "Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18.x or higher from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm -v)${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL client (psql) not found${NC}"
    echo "  Please ensure PostgreSQL is installed"
fi

echo ""
echo "Installing dependencies..."
echo ""

# Install backend dependencies
echo "→ Installing backend dependencies..."
cd server
npm install
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install frontend dependencies
echo "→ Installing frontend dependencies..."
cd client
npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo "================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Create PostgreSQL database: createdb duvbogrindar_charging"
echo "2. Initialize schema: psql -d duvbogrindar_charging -f server/db/schema.sql"
echo "3. Copy server/.env.example to server/.env and configure"
echo "4. Start backend: cd server && npm start"
echo "5. Start frontend: cd client && npm run dev"
echo ""
echo "See README.md for detailed instructions."
