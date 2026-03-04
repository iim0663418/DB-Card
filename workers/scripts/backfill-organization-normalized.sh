#!/bin/bash
# Backfill organization_normalized for existing cards
# Usage: ./scripts/backfill-organization-normalized.sh [staging|production]

set -e

ENV=${1:-staging}

if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

echo "🔄 Backfilling organization_normalized for $ENV environment..."

# Get all cards with organization but no organization_normalized
CARDS=$(wrangler d1 execute DB --remote ${ENV:+--env $ENV} --command "
  SELECT uuid, organization 
  FROM received_cards 
  WHERE organization IS NOT NULL 
    AND organization_normalized IS NULL
  LIMIT 100
" --json)

COUNT=$(echo "$CARDS" | jq '.[0].results | length')

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No cards need backfilling"
  exit 0
fi

echo "📊 Found $COUNT cards to backfill"

# Note: This script requires manual implementation of normalization
# For now, run the SQL update directly:

echo "
⚠️  Manual backfill required:

1. Export cards to JSON:
   wrangler d1 execute DB --remote ${ENV:+--env $ENV} --command \"
     SELECT uuid, organization FROM received_cards 
     WHERE organization_normalized IS NULL
   \" --json > cards_to_backfill.json

2. Run Node.js script to normalize:
   node scripts/normalize-organizations.js cards_to_backfill.json

3. Import normalized data back to D1

Alternatively, wait for cards to be updated naturally through the UI.
"
