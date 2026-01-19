#!/bin/bash
# User Self-Revoke API 測試腳本

BASE_URL="http://localhost:8787"
TEST_UUID="test-uuid-$(date +%s)"

echo "=== User Self-Revoke API 測試 ==="
echo ""

# 1. 測試 Health Check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# 2. 測試未認證的撤銷請求（應該返回 401）
echo "2. 測試未認證撤銷（預期 401）"
curl -s -X POST "$BASE_URL/api/user/cards/$TEST_UUID/revoke" \
  -H "Content-Type: application/json" \
  -d '{"reason":"lost"}' | jq .
echo ""

# 3. 測試未認證的恢復請求（應該返回 401）
echo "3. 測試未認證恢復（預期 401）"
curl -s -X POST "$BASE_URL/api/user/cards/$TEST_UUID/restore" | jq .
echo ""

# 4. 測試未認證的歷史查詢（應該返回 401）
echo "4. 測試未認證歷史查詢（預期 401）"
curl -s "$BASE_URL/api/user/revocation-history" | jq .
echo ""

# 5. 檢查路由是否註冊
echo "5. 檢查 OPTIONS 請求（CORS）"
curl -s -X OPTIONS "$BASE_URL/api/user/cards/$TEST_UUID/revoke" \
  -H "Origin: http://localhost:8787" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"
echo ""

echo "=== 測試完成 ==="
echo ""
echo "預期結果："
echo "- Health Check: 200 OK"
echo "- 未認證請求: 401 Unauthorized"
echo "- CORS headers: 應包含 Access-Control-Allow-* headers"
