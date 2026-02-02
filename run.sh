#!/bin/bash
# Start the Duvbo Grindar Charging Portal

set -e

echo "🚀 Starting Duvbo Grindar Charging Portal..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file with your Easee credentials:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your credentials"
    echo ""
    exit 1
fi

# Check if Docker is available
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo "🐳 Using Docker Compose..."
    
    # Start services
    docker-compose up -d
    
    echo ""
    echo "✅ Services starting..."
    echo ""
    echo "Please wait 10 seconds for services to initialize..."
    sleep 10
    
    # Check health
    echo "🔍 Checking backend health..."
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
    else
        echo "⚠️  Backend may still be starting. Give it a few more seconds."
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Application is running!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔌 Backend:  http://localhost:3001"
    echo "📊 Health:   http://localhost:3001/api/health"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop:      docker-compose down"
    echo ""
else
    echo "⚠️  Docker not found. Using manual startup..."
    echo ""
    echo "Please run the following commands in separate terminals:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd server && npm install && npm start"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd client && npm install && npm run dev"
    echo ""
fi
