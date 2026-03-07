#!/bin/bash
# 測試 Gemini Embedding API 是否能處理該卡片

# 需要設定環境變數 GEMINI_API_KEY
if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ Error: GEMINI_API_KEY not set"
  echo "   Run: export GEMINI_API_KEY='your-key'"
  exit 1
fi

TEXT='Name: 胡淑嫻
Company: 中菲電腦股份有限公司 (DIMERCO DATA SYSTEM CORPORATION)
Title: 副總經理
Company Summary: 中菲電腦成立於1981年，為資訊服務業上櫃公司（股票代號5403）。主要經營金融與證券相關軟體開發、硬體代理及資料處理服務，總部設於台北，並於高雄設有分公司，具備ISO 9001認證。
Personal Summary: 現任中菲電腦副總經理暨董事，具備豐富的系統分析與資訊服務資歷，長期深耕於金融軟體與公司治理領域。
Contact: susan@ddsc.com.tw, +886-937-197-902
Address: 114067 台北市內湖區行愛路151號8樓
Website: http://www.ddsc.com.tw'

echo "🧪 Testing Gemini Embedding API with real card data..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"content\": {
      \"parts\": [{
        \"text\": $(echo "$TEXT" | jq -Rs .)
      }]
    },
    \"outputDimensionality\": 768
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Response:"
echo "   HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ API call successful!"
  echo ""
  echo "📝 Response body (first 500 chars):"
  echo "$BODY" | jq -r '.embedding.values[0:5]' 2>/dev/null || echo "$BODY" | head -c 500
else
  echo "❌ API call failed!"
  echo ""
  echo "📝 Error response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi

echo ""
