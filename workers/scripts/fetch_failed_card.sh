#!/bin/bash
# 獲取失敗卡片的實際資料

CARD_UUID="1081934c-3a06-4923-bf65-4629df60620b"

echo "🔍 Fetching card data from staging database..."
echo ""

# 使用 wrangler d1 export 導出資料
npx wrangler d1 execute DB --remote --command "
SELECT 
  uuid,
  full_name,
  organization,
  organization_en,
  title,
  department,
  company_summary,
  personal_summary,
  email,
  phone,
  website,
  address,
  note,
  LENGTH(full_name) as name_len,
  LENGTH(organization) as org_len,
  LENGTH(company_summary) as summary_len
FROM received_cards 
WHERE uuid = '$CARD_UUID'
" --json 2>/dev/null || {
  echo "❌ Failed to fetch card data"
  echo ""
  echo "💡 Alternative: Check Cloudflare Dashboard > D1 > Query Console"
  echo "   Run: SELECT * FROM received_cards WHERE uuid = '$CARD_UUID'"
  exit 1
}
