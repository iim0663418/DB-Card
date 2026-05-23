#!/bin/bash
# Quick Test Script for Tap API Multi-Layer Defense
# Usage: ./test-tap-api.sh [BASE_URL]

BASE_URL="${1:-http://localhost:8787}"
CARD_UUID="test-uuid-$(uuidgen | tr '[:upper:]' '[:lower:]')"

echo "=========================================="
echo "Tap API Multi-Layer Defense Test"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Test Card UUID: $CARD_UUID"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Invalid UUID Format
echo -e "${YELLOW}Test 1: Invalid UUID Format${NC}"
curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d '{"card_uuid":"invalid-uuid"}' | jq '.'
echo ""

# Test 2: Card Not Found (valid UUID format but doesn't exist)
echo -e "${YELLOW}Test 2: Card Not Found${NC}"
curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$CARD_UUID\"}" | jq '.'
echo ""

# Test 3: Rate Limit - Card UUID (need to create a real card first)
echo -e "${YELLOW}Test 3: Rate Limit Test (Card UUID Dimension)${NC}"
echo "Creating 11 rapid requests to trigger rate limit..."

# You need to replace this with a real card UUID from your database
REAL_CARD_UUID="your-real-card-uuid-here"

for i in {1..11}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
    -H "Content-Type: application/json" \
    -d "{\"card_uuid\":\"$REAL_CARD_UUID\"}")
  
  STATUS=$(echo "$RESPONSE" | jq -r '.error // "success"')
  
  if [ "$STATUS" = "rate_limited" ]; then
    echo -e "${RED}RATE LIMITED${NC}"
    echo "$RESPONSE" | jq '.'
    break
  else
    echo -e "${GREEN}OK${NC}"
  fi
  
  # Small delay to avoid hitting dedup
  sleep 0.1
done
echo ""

# Test 4: Dedup Test (within 60s)
echo -e "${YELLOW}Test 4: Dedup Test (Duplicate Tap Within 60s)${NC}"
echo "First tap:"
FIRST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$REAL_CARD_UUID\"}")
echo "$FIRST_RESPONSE" | jq '.'

FIRST_SESSION=$(echo "$FIRST_RESPONSE" | jq -r '.session_id')
FIRST_REUSED=$(echo "$FIRST_RESPONSE" | jq -r '.reused')

echo ""
echo "Second tap (within 60s):"
sleep 2
SECOND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$REAL_CARD_UUID\"}")
echo "$SECOND_RESPONSE" | jq '.'

SECOND_SESSION=$(echo "$SECOND_RESPONSE" | jq -r '.session_id')
SECOND_REUSED=$(echo "$SECOND_RESPONSE" | jq -r '.reused')

echo ""
if [ "$FIRST_SESSION" = "$SECOND_SESSION" ] && [ "$SECOND_REUSED" = "true" ]; then
  echo -e "${GREEN}✅ Dedup working correctly!${NC}"
  echo "   - Same session_id returned"
  echo "   - reused: true on second request"
else
  echo -e "${RED}❌ Dedup not working as expected${NC}"
  echo "   - First session: $FIRST_SESSION (reused: $FIRST_REUSED)"
  echo "   - Second session: $SECOND_SESSION (reused: $SECOND_REUSED)"
fi
echo ""

# Test 5: IP Extraction (check logs)
echo -e "${YELLOW}Test 5: IP Extraction Priority${NC}"
echo "Testing with custom headers..."
curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 1.2.3.4" \
  -H "X-Forwarded-For: 5.6.7.8, 9.10.11.12" \
  -d "{\"card_uuid\":\"$REAL_CARD_UUID\"}" | jq '.'
echo "Check audit logs to verify IP = 1.2.3.4"
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✅ Test 1: Invalid UUID Format - Should return 400"
echo "✅ Test 2: Card Not Found - Should return 404"
echo "⚠️  Test 3: Rate Limit - Requires real card UUID"
echo "⚠️  Test 4: Dedup - Requires real card UUID"
echo "⚠️  Test 5: IP Extraction - Check audit logs"
echo ""
echo "To run full tests, replace REAL_CARD_UUID with an actual card UUID from your database."
echo ""
