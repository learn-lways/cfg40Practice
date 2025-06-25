#!/bin/bash

# E-commerce Backend API Test Suite
# This script tests all major API endpoints

BASE_URL="http://localhost:5000/api"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123!"

echo "🧪 E-commerce Backend API Test Suite"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local auth_header=$5
    
    echo -n "Testing: $description... "
    
    if [ -n "$auth_header" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_header" \
                -d "$data" \
                "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X $method \
                -H "Authorization: Bearer $auth_header" \
                "$BASE_URL$endpoint")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X $method \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X $method \
                "$BASE_URL$endpoint")
        fi
    fi
    
    http_status=$(echo $response | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    response_body=$(echo $response | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 400 ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $http_status)"
    elif [ "$http_status" -eq 400 ] || [ "$http_status" -eq 401 ] || [ "$http_status" -eq 403 ]; then
        echo -e "${YELLOW}⚠️  EXPECTED ERROR${NC} (Status: $http_status)"
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $http_status)"
        echo "   Response: $response_body"
    fi
}

# Check if server is running
echo "🔍 Checking server health..."
curl -s "$BASE_URL/health" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Please start the server first.${NC}"
    exit 1
fi

echo ""
echo "📊 Testing Public Endpoints"
echo "----------------------------"

# Health check
test_endpoint "GET" "/health" "Health check"

# Categories
test_endpoint "GET" "/categories" "Get all categories"

# Products
test_endpoint "GET" "/products" "Get all products"
test_endpoint "GET" "/products/featured" "Get featured products"

echo ""
echo "🔐 Testing Authentication Endpoints"
echo "------------------------------------"

# Register user
REGISTER_DATA='{
    "name": "Test User",
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "role": "buyer"
}'
test_endpoint "POST" "/auth/register" "User registration" "$REGISTER_DATA"

# Login (this would fail without MongoDB, but tests the endpoint)
LOGIN_DATA='{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
}'
test_endpoint "POST" "/auth/login" "User login" "$LOGIN_DATA"

echo ""
echo "🛒 Testing Protected Endpoints (Expected to fail without auth)"
echo "--------------------------------------------------------------"

# Cart endpoints (should fail without auth)
test_endpoint "GET" "/cart" "Get user cart (no auth)"
test_endpoint "GET" "/sellers/dashboard" "Get seller dashboard (no auth)"
test_endpoint "GET" "/admin/dashboard" "Get admin dashboard (no auth)"

echo ""
echo "📝 Testing with Mock Auth Token"
echo "--------------------------------"

# Use a mock token for testing (will fail validation but tests routing)
MOCK_TOKEN="mock-jwt-token-for-testing"

test_endpoint "GET" "/cart" "Get user cart (mock auth)" "" "$MOCK_TOKEN"
test_endpoint "GET" "/auth/me" "Get current user (mock auth)" "" "$MOCK_TOKEN"

echo ""
echo "🧪 Testing Edge Cases"
echo "----------------------"

# Test non-existent endpoints
test_endpoint "GET" "/nonexistent" "Non-existent endpoint"

# Test invalid methods
test_endpoint "PATCH" "/health" "Invalid method on health endpoint"

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "${GREEN}✅ PASS${NC} - Endpoint works correctly"
echo -e "${YELLOW}⚠️  EXPECTED ERROR${NC} - Expected failure (auth required, etc.)"
echo -e "${RED}❌ FAIL${NC} - Unexpected error"
echo ""
echo "Note: Many endpoints will show expected errors without MongoDB connection"
echo "and proper authentication setup. This is normal for testing."
echo ""
echo "To run full tests:"
echo "1. Install and start MongoDB"
echo "2. Configure .env file"
echo "3. Create test users and data"
echo "4. Run this script again"
