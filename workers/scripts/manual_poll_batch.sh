#!/bin/bash
# 手動觸發 Batch Job Polling

SETUP_TOKEN=$(grep SETUP_TOKEN .dev.vars | cut -d= -f2 | tr -d '"' | tr -d "'")

echo "🔄 Manually triggering batch job polling..."
echo ""

curl -s -X POST "https://db-card-staging.csw30454.workers.dev/api/admin/trigger-cron" \
  -H "Authorization: Bearer $SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.results[] | select(.task == "Auto-tag Cards") | "Status: \(.status)\nDuration: \(.duration)ms\nError: \(.error // "none")"'

echo ""
echo "✅ Check Cloudflare Dashboard logs for details"
