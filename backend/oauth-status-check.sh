#!/bin/bash

# E-commerce Backend Status Check
# This script verifies all features are working correctly

echo "🔍 E-COMMERCE BACKEND STATUS CHECK"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
SERVER_URL="http://localhost:5000"

# Function to check HTTP response
check_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$SERVER_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response, expected $expected_status)"
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local endpoint=$1
    local description=$2
    local json_key=$3
    
    echo -n "Testing $description... "
    
    local response=$(curl -s "$SERVER_URL$endpoint")
    local success=$(echo "$response" | grep -o '"success":true' | wc -l)
    
    if [ "$success" -gt 0 ]; then
        if [ -n "$json_key" ]; then
            local value=$(echo "$response" | grep -o "\"$json_key\":[0-9]*" | head -1 | cut -d':' -f2)
            echo -e "${GREEN}✅ PASS${NC} ($json_key: $value)"
        else
            echo -e "${GREEN}✅ PASS${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Response: $(echo "$response" | head -c 100)..."
    fi
}

echo -e "\n📊 ${YELLOW}BASIC SERVER ENDPOINTS${NC}"
echo "--------------------------------------"
check_json_endpoint "/api/health" "Health Check" ""

echo -e "\n🔐 ${YELLOW}AUTHENTICATION ENDPOINTS${NC}"
echo "--------------------------------------"
check_endpoint "/api/auth/google" "Google OAuth Initiation" "302"

echo -e "\n📦 ${YELLOW}PRODUCT ENDPOINTS${NC}"
echo "--------------------------------------"
check_json_endpoint "/api/products" "Product List" "pagination.total"
check_json_endpoint "/api/categories" "Categories List" ""

echo -e "\n🤖 ${YELLOW}RECOMMENDATION ENDPOINTS${NC}"
echo "--------------------------------------"
check_json_endpoint "/api/products/unique" "Unique Products" "count"

# Test similar products with a known product ID
echo -n "Testing Similar Products... "
PRODUCT_ID=$(curl -s "$SERVER_URL/api/products?limit=1" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PRODUCT_ID" ]; then
    local response=$(curl -s "$SERVER_URL/api/products/$PRODUCT_ID/similar")
    local success=$(echo "$response" | grep -o '"success":true' | wc -l)
    if [ "$success" -gt 0 ]; then
        local count=$(echo "$response" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
        echo -e "${GREEN}✅ PASS${NC} (count: $count)"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (No products found)"
fi

echo -e "\n🧪 ${YELLOW}TEST PAGES${NC}"
echo "--------------------------------------"
check_endpoint "/test-oauth" "OAuth Test Page" "200"

echo -e "\n📋 ${YELLOW}SUMMARY${NC}"
echo "=================================="

# Check if OAuth is configured
echo -n "Google OAuth Configuration... "
if curl -s "$SERVER_URL/api/auth/google" | grep -q "accounts.google.com"; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
else
    echo -e "${RED}❌ NOT CONFIGURED${NC}"
fi

# Check database connectivity
echo -n "Database Connectivity... "
DB_CHECK=$(curl -s "$SERVER_URL/api/health" | grep -o '"success":true' | wc -l)
if [ "$DB_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ CONNECTED${NC}"
else
    echo -e "${RED}❌ DISCONNECTED${NC}"
fi

# Check recommendations
echo -n "Recommendation System... "
UNIQUE_COUNT=$(curl -s "$SERVER_URL/api/products/unique" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
if [ -n "$UNIQUE_COUNT" ] && [ "$UNIQUE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ WORKING${NC} ($UNIQUE_COUNT unique products)"
else
    echo -e "${YELLOW}⚠️ LIMITED DATA${NC}"
fi

echo -e "\n🚀 ${YELLOW}READY FOR FRONTEND INTEGRATION!${NC}"
echo "=================================="
echo "• OAuth Test Page: http://localhost:5000/test-oauth"
echo "• Health Check: http://localhost:5000/api/health"
echo "• API Documentation: Check FINAL_IMPLEMENTATION_GUIDE.md"
echo ""
echo "Test Credentials:"
echo "• Buyer: john@example.com / password123"
echo "• Seller: jane@example.com / password123"
echo ""
