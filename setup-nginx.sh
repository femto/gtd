#!/bin/bash

# GTD App - Nginx Setup Script
# This script sets up nginx as a reverse proxy for the GTD application

set -e

echo "=========================================="
echo "GTD App - Nginx Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt update
    apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Copy configuration
echo "📝 Setting up nginx configuration..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/gtd

# Enable site
ln -sf /etc/nginx/sites-available/gtd /etc/nginx/sites-enabled/gtd

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Removing default nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Restart nginx
echo "🔄 Restarting nginx..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "=========================================="
echo "✨ Setup Complete!"
echo "=========================================="
echo ""
echo "Your GTD app should now be accessible at:"
echo "  http://gtd.nebulame.com"
echo ""
echo "Make sure ports 80 and 5173 are open in your firewall."
echo ""
echo "To check nginx status: sudo systemctl status nginx"
echo "To view nginx logs:    sudo tail -f /var/log/nginx/error.log"
echo ""
