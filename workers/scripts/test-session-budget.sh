#!/bin/bash
# v4.2.0 Session Budget Local Test Script

set -e

BASE_URL="http://localhost:8787"
TEST_UUID=""

echo "=== v4.2.0 Session Budget Test ==="
echo ""

# 1. Create test card
echo "1. Creating test card..."
CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "name": "Budget Test",
    "name_en": "Budget Test",
    "title": "Tester",
    "title_en": "Tester",
    "phone": "+886912345678",
    "email": "test@example.com",
    "card_type": "sensitive"
  }')

TEST_UUID=$(echo "$CARD_RESPONSE" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
echo "Created card: $TEST_UUID"
echo ""

# 2. Test normal creation (under budget)
echo "2. Test Normal Creation (Under Budget)"
echo "---"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$TEST_UUID\"}")
echo "$RESPONSE" | jq '.'
echo ""

# 3. Manually set total_sessions to 80 (80% of 100)
echo "3. Setting total_sessions to 80 (80% threshold)..."
npx wrangler d1 execute DB --local --command "UPDATE cards SET total_sessions = 80 WHERE uuid = '$TEST_UUID'" > /dev/null 2>&1
echo "Updated total_sessions to 80"
echo ""

# 4. Test approaching limit (warning)
echo "4. Test Approaching Limit (Warning at 80%)"
echo "---"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$TEST_UUID\"}")
echo "$RESPONSE" | jq '.'
HAS_WARNING=$(echo "$RESPONSE" | jq -r '.data.warning // "null"')
if [ "$HAS_WARNING" != "null" ]; then
  echo "✅ Warning detected!"
else
  echo "❌ Warning NOT detected!"
fi
echo ""

# 5. Set total_sessions to 100 (at limit)
echo "5. Setting total_sessions to 100 (at limit)..."
npx wrangler d1 execute DB --local --command "UPDATE cards SET total_sessions = 100 WHERE uuid = '$TEST_UUID'" > /dev/null 2>&1
echo "Updated total_sessions to 100"
echo ""

# 6. Test budget exceeded
echo "6. Test Budget Exceeded (403)"
echo "---"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$TEST_UUID\"}")
echo "$RESPONSE" | jq '.'
ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // "null"')
if [ "$ERROR_CODE" = "session_budget_exceeded" ]; then
  echo "✅ Budget exceeded error detected!"
else
  echo "❌ Budget exceeded error NOT detected!"
fi
echo ""

# 7. Test daily limit
echo "7. Test Daily Limit (429)"
echo "---"
# Set daily counter to 3 (at limit for sensitive)
TODAY=$(date +%Y%m%d)
npx wrangler kv key put "session:budget:$TEST_UUID:daily:$TODAY" "3" --namespace-id=87221de061f049d3a4c976b7b5092dd9 --local > /dev/null 2>&1
# Reset total_sessions to 0
npx wrangler d1 execute DB --local --command "UPDATE cards SET total_sessions = 0 WHERE uuid = '$TEST_UUID'" > /dev/null 2>&1

RESPONSE=$(curl -s -X POST "$BASE_URL/api/nfc/tap" \
  -H "Content-Type: application/json" \
  -d "{\"card_uuid\":\"$TEST_UUID\"}")
echo "$RESPONSE" | jq '.'
ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // "null"')
if [ "$ERROR_CODE" = "daily_budget_exceeded" ]; then
  echo "✅ Daily limit exceeded error detected!"
else
  echo "❌ Daily limit exceeded error NOT detected!"
fi
echo ""

# 8. Cleanup
echo "8. Cleanup..."
curl -s -X DELETE "$BASE_URL/api/admin/cards/$TEST_UUID" \
  -H "Authorization: Bearer test-token" > /dev/null
echo "✅ Test card deleted"
echo ""

echo "=== Test Complete ==="
