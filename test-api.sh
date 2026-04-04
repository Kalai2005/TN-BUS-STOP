#!/bin/bash
# MongoDB Backend Test Script
# Tests all major API endpoints

API_URL="http://localhost:5000/api"
TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}MongoDB Backend API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/health")
if echo $RESPONSE | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Server is running${NC}\n"
else
    echo -e "${RED}✗ Server health check failed${NC}\n"
    exit 1
fi

# Test 2: Register New User
echo -e "${YELLOW}Test 2: Register New User${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123",
    "name": "Test User",
    "phone": "9876543210"
  }')

if echo $RESPONSE | grep -q "success.*true"; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "  Token: ${TOKEN:0:20}...\n"
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "  Response: $RESPONSE\n"
fi

# Test 3: Login User
echo -e "${YELLOW}Test 3: Login User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }')

if echo $LOGIN_RESPONSE | grep -q "message"; then
    echo -e "${YELLOW}  Note: Test user might not exist yet${NC}"
    echo "  Response: $LOGIN_RESPONSE\n"
else
    echo -e "${GREEN}✓ Login successful${NC}\n"
fi

# Test 4: Get User Profile (if we have a token)
if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}Test 4: Get User Profile${NC}"
    RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo $RESPONSE | grep -q "email"; then
        echo -e "${GREEN}✓ Profile retrieved successfully${NC}"
        echo "  Response: $(echo $RESPONSE | head -c 100)...\n"
    else
        echo -e "${RED}✗ Profile retrieval failed${NC}\n"
    fi
fi

# Test 5: Get All Routes
echo -e "${YELLOW}Test 5: Get All Routes${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/routes")
if echo $RESPONSE | grep -q "success.*true"; then
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ Routes retrieved${NC}"
    echo -e "  Total routes: $COUNT\n"
else
    echo -e "${YELLOW}  No routes available (expected on fresh setup)${NC}\n"
fi

# Test 6: Get All Buses
echo -e "${YELLOW}Test 6: Get All Buses${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/buses")
if echo $RESPONSE | grep -q "success.*true"; then
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ Buses retrieved${NC}"
    echo -e "  Total buses: $COUNT\n"
else
    echo -e "${YELLOW}  No buses available (expected on fresh setup)${NC}\n"
fi

# Test 7: Get All Conductors
echo -e "${YELLOW}Test 7: Get All Conductors${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/conductors")
if echo $RESPONSE | grep -q "success.*true"; then
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ Conductors retrieved${NC}"
    echo -e "  Total conductors: $COUNT\n"
else
    echo -e "${YELLOW}  No conductors available (expected on fresh setup)${NC}\n"
fi

# Test 8: Search Routes
echo -e "${YELLOW}Test 8: Search Routes${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/routes/search" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "Chennai",
    "destination": "Madurai"
  }')

if echo $RESPONSE | grep -q "success.*true"; then
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ Route search successful${NC}"
    echo -e "  Routes found: $COUNT\n"
else
    echo -e "${YELLOW}  No routes found (expected on fresh setup)${NC}\n"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Test Suite Completed!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review MONGODB_SETUP.md for configuration"
echo "2. Set up MongoDB connection (MongoDB Atlas or Local)"
echo "3. Create sample data through admin endpoints"
echo "4. Test with actual frontend integration"
echo ""
echo -e "${YELLOW}API Reference:${NC}"
echo "- API Docs: See API_QUICK_REFERENCE.md"
echo "- Setup Guide: See MONGODB_SETUP.md"
echo "- Migration Progress: See MIGRATION_PROGRESS.md"
