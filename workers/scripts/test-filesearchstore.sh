#!/bin/bash
# Test FileSearchStore API access

STORE_NAME="fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"

echo "Testing FileSearchStore API..."
echo "Store: $STORE_NAME"
echo ""

# Get GEMINI_API_KEY from Cloudflare secrets
cd /Users/shengfanwu/GitHub/DB-Card/workers
API_KEY=$(npx wrangler secret get GEMINI_API_KEY 2>/dev/null | tail -1)

if [ -z "$API_KEY" ]; then
  echo "❌ Failed to get GEMINI_API_KEY"
  exit 1
fi

echo "Testing query endpoint..."
curl -v -X POST \
  "https://generativelanguage.googleapis.com/v1beta/${STORE_NAME}:query" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: ${API_KEY}" \
  -d '{
    "query": "test query",
    "pageSize": 1
  }' 2>&1 | grep -E "(< HTTP|error|message)"
