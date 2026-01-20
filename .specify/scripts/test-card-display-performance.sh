#!/bin/bash
# Card Display API Performance Test
# 測試 /api/read 端點的響應時間

echo "=== Card Display API Performance Test ==="
echo "測試時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 配置
STAGING_URL="https://db-card-staging.csw30454.workers.dev"
TEST_ROUNDS=10

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "步驟 1: 獲取測試用的 card UUID 和 session"
echo "----------------------------------------"

# 從 staging 獲取第一張名片的 UUID（需要 admin token）
# 這裡假設你有一個測試用的 card UUID
# 實際使用時需要替換為真實的測試數據

TEST_CARD_UUID="test-uuid-here"
TEST_SESSION_ID="test-session-here"

echo "Card UUID: $TEST_CARD_UUID"
echo "Session ID: $TEST_SESSION_ID"
echo ""

echo "步驟 2: 執行 $TEST_ROUNDS 次 API 請求測試"
echo "----------------------------------------"

total_time=0
min_time=999999
max_time=0
success_count=0
error_count=0

for i in $(seq 1 $TEST_ROUNDS); do
    echo -n "Round $i/$TEST_ROUNDS: "
    
    # 測量請求時間
    start_time=$(date +%s%3N)
    response=$(curl -s -w "\n%{http_code}" \
        "${STAGING_URL}/api/read?uuid=${TEST_CARD_UUID}&session=${TEST_SESSION_ID}" \
        -H "Accept: application/json" 2>&1)
    end_time=$(date +%s%3N)
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n-1)
    
    elapsed=$((end_time - start_time))
    total_time=$((total_time + elapsed))
    
    # 更新最小/最大時間
    if [ $elapsed -lt $min_time ]; then
        min_time=$elapsed
    fi
    if [ $elapsed -gt $max_time ]; then
        max_time=$elapsed
    fi
    
    # 檢查響應狀態
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓${NC} ${elapsed}ms (HTTP $http_code)"
        success_count=$((success_count + 1))
    else
        echo -e "${RED}✗${NC} ${elapsed}ms (HTTP $http_code)"
        error_count=$((error_count + 1))
        echo "   Error: $(echo "$response_body" | jq -r '.error.message // .message // "Unknown error"' 2>/dev/null || echo "Parse error")"
    fi
    
    # 避免過快請求觸發 rate limit
    sleep 0.5
done

echo ""
echo "步驟 3: 性能分析結果"
echo "----------------------------------------"

avg_time=$((total_time / TEST_ROUNDS))

echo "總請求次數: $TEST_ROUNDS"
echo "成功次數: $success_count"
echo "失敗次數: $error_count"
echo ""
echo "響應時間統計:"
echo "  - 平均: ${avg_time}ms"
echo "  - 最快: ${min_time}ms"
echo "  - 最慢: ${max_time}ms"
echo ""

# 性能評級
if [ $avg_time -lt 200 ]; then
    echo -e "${GREEN}性能評級: 優秀 (<200ms)${NC}"
elif [ $avg_time -lt 500 ]; then
    echo -e "${YELLOW}性能評級: 良好 (200-500ms)${NC}"
elif [ $avg_time -lt 1000 ]; then
    echo -e "${YELLOW}性能評級: 可接受 (500-1000ms)${NC}"
else
    echo -e "${RED}性能評級: 需要優化 (>1000ms)${NC}"
fi

echo ""
echo "步驟 4: 優化建議分析"
echo "----------------------------------------"

echo "基於當前架構的優化可能性:"
echo ""
echo "1. 前端優化 (立即可行):"
echo "   - ✓ 已實作: KV 快取 (60s TTL)"
echo "   - ✓ 已實作: 卡片數據快取 (300s TTL)"
echo "   - 建議: 前端 sessionStorage 快取 (避免重複請求)"
echo "   - 建議: Service Worker 快取策略"
echo ""
echo "2. 後端優化 (已實作):"
echo "   - ✓ 已實作: 信封解密快取 (getCachedCardData)"
echo "   - ✓ 已實作: 響應快取 (responseCacheKey)"
echo "   - ✓ 已實作: 並行查詢優化"
echo ""
echo "3. 資料庫優化 (已完成):"
echo "   - ✓ 已實作: 索引優化 (uuid, session_id)"
echo "   - ✓ 已實作: 查詢優化 (單次查詢)"
echo ""
echo "4. CDN 優化 (前端資源):"
echo "   - ✓ 已實作: preconnect hints"
echo "   - ✓ 已實作: defer 載入"
echo "   - 建議: 考慮 Cloudflare Pages 靜態資源快取"
echo ""

echo "=== 測試完成 ==="
