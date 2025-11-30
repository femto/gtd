#!/bin/bash

# GTD Pro - Initialization Script
# This script sets up and starts the GTD application

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GTD Pro - Getting Things Done App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18 or later from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}Warning: Node.js version 18 or later is recommended${NC}"
fi

# Check for npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"

echo -e "${BLUE}Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/server"
npm install

echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install

cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}Dependencies installed successfully!${NC}"
echo ""

# Start servers if --start flag is provided
if [ "$1" = "--start" ] || [ "$1" = "-s" ]; then
    echo -e "${GREEN}Starting servers...${NC}"
    echo ""

    # Start backend in background
    echo -e "${BLUE}Starting backend server on port 3001...${NC}"
    cd "$PROJECT_DIR/server"
    npm run dev &
    BACKEND_PID=$!

    # Wait a moment for backend to start
    sleep 2

    # Start frontend in background
    echo -e "${BLUE}Starting frontend server on port 5173...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm run dev &
    FRONTEND_PID=$!

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Servers are running!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
    echo -e "  Backend:  ${BLUE}http://localhost:3001${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
    echo ""

    # Trap Ctrl+C to cleanup
    trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

    # Wait for processes
    wait
else
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "To start the application, run:"
    echo -e "  ${BLUE}./init.sh --start${NC}"
    echo ""
    echo "Or start servers manually:"
    echo "  Terminal 1: cd server && npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
    echo ""
    echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
    echo -e "  Backend:  ${BLUE}http://localhost:3001${NC}"
fi
