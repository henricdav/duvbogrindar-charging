#!/bin/bash
# Stop the Duvbo Grindar Charging Portal

echo "🛑 Stopping Duvbo Grindar Charging Portal..."
echo ""

# Check if Docker is available
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo "🐳 Stopping Docker services..."
    docker-compose down
    echo "✅ Services stopped!"
else
    echo "⚠️  Docker not found."
    echo ""
    echo "To stop manually running services:"
    echo "  - Press Ctrl+C in each terminal window"
    echo "  - Or use: pkill -f 'node.*server' && pkill -f 'vite'"
fi

echo ""
