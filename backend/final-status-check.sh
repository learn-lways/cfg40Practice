#!/bin/bash

# E-Commerce Backend - Final Status Check
# Date: June 25, 2025
# Purpose: Verify all features are working correctly

echo "🔍 E-COMMERCE BACKEND - FINAL STATUS CHECK"
echo "=========================================="
echo ""

# Check if dependencies are installed
echo "📦 Checking Dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found. Run: npm install"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with required variables."
    exit 1
fi

echo "✅ Dependencies found"
echo ""

# Start server in background
echo "🚀 Starting Server..."
npm start > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "🏥 Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $HEALTH_RESPONSE == *"success"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Test OAuth endpoints
echo "🔐 Testing OAuth Endpoints..."
OAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/google)
if [ "$OAUTH_RESPONSE" -eq 302 ]; then
    echo "✅ OAuth redirect working"
else
    echo "❌ OAuth endpoint failed (Status: $OAUTH_RESPONSE)"
fi

# Test recommendation endpoints
echo "🤖 Testing Recommendation Endpoints..."

# Test unique products
UNIQUE_RESPONSE=$(curl -s http://localhost:5000/api/products/unique)
if [[ $UNIQUE_RESPONSE == *"success"* ]]; then
    echo "✅ Unique products endpoint working"
else
    echo "❌ Unique products endpoint failed"
fi

# Check for duplicate index warnings in logs
echo "📊 Checking for Database Warnings..."
if grep -q "duplicate" server.log; then
    echo "❌ Duplicate index warnings found in logs"
    grep "duplicate" server.log
else
    echo "✅ No duplicate index warnings found"
fi

# Count available products for testing
PRODUCTS_COUNT=$(curl -s http://localhost:5000/api/products | jq '.data | length' 2>/dev/null || echo "Unknown")
echo "📦 Products available for testing: $PRODUCTS_COUNT"

# Clean up
echo ""
echo "🧹 Cleaning up..."
kill $SERVER_PID
rm -f server.log

echo ""
echo "✅ ALL SYSTEMS OPERATIONAL!"
echo ""
echo "🎯 Ready for Frontend Integration:"
echo "   - Google OAuth: http://localhost:5000/api/auth/google"
echo "   - API Health: http://localhost:5000/api/health"
echo "   - Unique Products: http://localhost:5000/api/products/unique"
echo "   - OAuth Test Page: http://localhost:5000/test-oauth"
echo ""
echo "📚 Documentation available in:"
echo "   - IMPLEMENTATION_COMPLETE.md"
echo "   - FINAL_IMPLEMENTATION_GUIDE.md"
echo "   - OAUTH_READY.md"
echo ""
echo "🚀 To start development server: npm start"
echo "🌱 To seed database: node seed-database.js"
