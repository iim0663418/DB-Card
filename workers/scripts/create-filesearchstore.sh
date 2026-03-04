#!/bin/bash
# Create FileSearchStore for DB-Card
# Reference: https://ai.google.dev/gemini-api/docs/file-search

set -e

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY environment variable is not set"
  echo "Usage: GEMINI_API_KEY=your-key ./create-filesearchstore.sh"
  exit 1
fi

echo "Creating FileSearchStore..."

# Create FileSearchStore
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "DB-Card Knowledge Base",
    "description": "Business card organization and personal information for deduplication"
  }')

echo "Response:"
echo "$RESPONSE" | jq .

# Extract store name
STORE_NAME=$(echo "$RESPONSE" | jq -r '.name')

if [ "$STORE_NAME" != "null" ] && [ -n "$STORE_NAME" ]; then
  echo ""
  echo "✅ FileSearchStore created successfully!"
  echo ""
  echo "Store Name: $STORE_NAME"
  echo ""
  echo "Update wrangler.toml with:"
  echo "FILE_SEARCH_STORE_NAME = \"$STORE_NAME\""
else
  echo ""
  echo "❌ Failed to create FileSearchStore"
  echo "Response: $RESPONSE"
  exit 1
fi
