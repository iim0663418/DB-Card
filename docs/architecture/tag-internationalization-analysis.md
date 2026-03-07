# 標籤系統國際化分析

## 現況評估（2026-03-07）

### 當前設計

#### 1. **標準類別：台灣中心化** ⚠️

**Industry（產業）**：
```typescript
INDUSTRY_CATEGORIES = [
  '資訊服務',    // 中文
  '資訊安全',    // 中文
  '金融',        // 中文
  '製造',        // 中文
  // ...
]
```

**Location（地點）**：
```typescript
LOCATION_CATEGORIES = [
  '台北',        // 台灣城市
  '新北',        // 台灣城市
  '桃園',        // 台灣城市
  // ...
]
```

**Seniority（職級）**：
```typescript
SENIORITY_CATEGORIES = [
  '高階主管',    // 中文
  '中階主管',    // 中文
  // ...
]
```

#### 2. **AI Prompt：語言中立** ✅

```typescript
const prompt = `Extract tags from the following business cards.

Guidelines:
- Extract as-is from the card, don't normalize or categorize
- Use the same language as the original card  // ← 保留原始語言
- If information is insufficient, return null
```

**優點**：
- AI 會保留名片原始語言
- 支援多語言輸入（中文、英文、日文等）
- `raw_value` 保留原始多樣性

**問題**：
- 標準化邏輯只支援中文/台灣
- 非台灣使用者的標籤會全部變成「其他」

---

## 國際化問題分析

### 問題 1: Location 標準化失效

**場景**：美國使用者
```
Input (AI):  "San Francisco, CA"
Normalized:  "其他"  ← 無法匹配台灣城市
```

**影響**：
- 所有非台灣地點都是「其他」
- 篩選器無法聚合（100 個「其他」）
- 使用者體驗差

### 問題 2: Industry 標準化偏差

**場景**：英文名片
```
Input (AI):  "Software Development"
Normalized:  "其他"  ← 無法匹配中文類別
```

**當前映射**：
```typescript
'Information Security': '資訊安全',  // 有英文映射
'Cybersecurity': '資訊安全',         // 有英文映射
// 但只有少數幾個
```

### 問題 3: Seniority 語言依賴

**場景**：英文職稱
```
Input (AI):  "Senior Vice President"
Normalized:  "其他"  ← 無法匹配中文關鍵字
```

**當前邏輯**：
```typescript
if (raw.includes('總') || raw.includes('長')) return '高階主管';
// 只檢查中文關鍵字
```

---

## 架構優勢（已具備）

### ✅ 分離架構支援國際化

**當前架構**：
```
AI 抽取 (語言中立) → 後端標準化 (可擴展) → 前端顯示 (raw + normalized)
```

**優點**：
1. **AI 層已國際化**：保留原始語言
2. **標準化層可擴展**：只需修改映射邏輯
3. **顯示層已準備**：raw_value 保留原始文字

### ✅ 資料結構支援

```typescript
{
  category: "location",
  raw: "San Francisco, CA",      // 保留原始
  normalized: "San Francisco"    // 可擴展標準化
}
```

---

## 國際化方案

### 方案 A: 多語言標準類別（推薦）

**概念**：標準類別支援多語言

```typescript
// 產業標準化（多語言）
const INDUSTRY_MAPPINGS = {
  // 中文
  '軟體與資訊服務業': 'IT Services',
  '資訊服務': 'IT Services',
  '資訊安全': 'Cybersecurity',
  
  // 英文
  'Software Development': 'IT Services',
  'Information Security': 'Cybersecurity',
  'Cybersecurity': 'Cybersecurity',
  
  // 日文
  'ソフトウェア開発': 'IT Services',
  '情報セキュリティ': 'Cybersecurity',
};

// 標準類別（英文為主）
const INDUSTRY_CATEGORIES = [
  'IT Services',
  'Cybersecurity',
  'Finance',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Government',
  'Retail',
  'Telecom',
  'Other'
];
```

**優點**：
- 全球通用標準類別
- 支援多語言輸入
- 篩選器統一（英文）

**缺點**：
- 需要大量映射表
- 維護成本高

**工時**：40-60 小時

---

### 方案 B: 地區化標準類別（務實）

**概念**：根據使用者地區使用不同標準類別

```typescript
// 地區配置
const REGION_CONFIGS = {
  'TW': {
    industries: ['資訊服務', '資訊安全', '金融', ...],
    locations: ['台北', '新北', '桃園', ...],
  },
  'US': {
    industries: ['IT Services', 'Cybersecurity', 'Finance', ...],
    locations: ['San Francisco', 'New York', 'Los Angeles', ...],
  },
  'JP': {
    industries: ['IT サービス', '情報セキュリティ', '金融', ...],
    locations: ['東京', '大阪', '名古屋', ...],
  },
};

// 標準化時使用使用者地區
function normalizeTag(category, raw, userRegion = 'TW') {
  const config = REGION_CONFIGS[userRegion];
  // 使用該地區的標準類別
}
```

**優點**：
- 每個地區獨立優化
- 維護成本低
- 使用者體驗好

**缺點**：
- 跨地區篩選困難
- 需要地區偵測

**工時**：20-30 小時

---

### 方案 C: 智慧標準化（AI 輔助）

**概念**：使用 AI 進行跨語言標準化

```typescript
// AI 標準化 Prompt
const normalizationPrompt = `
Normalize the following tag to a standard category:

Tag: "${raw}"
Category: ${category}
Standard Categories: ${STANDARD_CATEGORIES.join(', ')}

Return the most appropriate standard category.
If no match, return "Other".
`;
```

**優點**：
- 自動支援所有語言
- 無需維護映射表
- 準確率高

**缺點**：
- 每次標準化需要 API 呼叫
- 成本高（Gemini API）
- 延遲高

**工時**：8-12 小時

---

### 方案 D: 保持現狀 + 文檔說明（最小成本）

**概念**：明確定位為「台灣市場」

```markdown
# 系統定位

DB-Card 目前針對**台灣市場**優化：
- 標準產業類別：台灣常見產業
- 標準地點：台灣六都
- 標準職級：台灣企業職級

## 國際使用者

非台灣使用者可以正常使用，但：
- 標籤會保留原始語言（raw_value）
- 標準化可能不準確（normalized_value = "其他"）
- 篩選器聚合效果較差

## 未來規劃

如果國際使用者達到 20%，將實作多語言標準化。
```

**優點**：
- 零開發成本
- 明確產品定位
- 保留擴展性

**缺點**：
- 限制市場規模
- 國際使用者體驗差

**工時**：1 小時（文檔）

---

## 建議方案

### 短期（當前）：方案 D ✅

**理由**：
1. **使用者基數**：目前 100% 台灣使用者
2. **投資報酬率**：國際化成本高，收益不明
3. **架構已準備**：未來擴展容易

**行動**：
1. 在文檔中明確說明系統定位
2. 監控國際使用者比例
3. 保留 raw_value（已實作）

### 中期（6 個月後）：評估需求

**觸發條件**：
- 國際使用者 > 20%
- 或有明確國際市場需求

**選擇方案**：
- 如果只有 2-3 個國家 → **方案 B**（地區化）
- 如果全球市場 → **方案 A**（多語言）
- 如果預算充足 → **方案 C**（AI 輔助）

---

## 技術準備（已完成）

### ✅ 資料結構支援
```typescript
{
  raw_value: "San Francisco, CA",    // 保留原始
  normalized_value: "San Francisco"  // 可擴展
}
```

### ✅ 分離架構
```
AI 抽取 → 後端標準化 → 前端顯示
```

### ✅ 前端向後相容
```javascript
// 支援新舊格式
const normalized = typeof tag === 'string' 
  ? tag.split(':')[1] 
  : tag.normalized;
```

---

## 監控指標

### 追蹤國際化需求

1. **使用者地區分布**：
   - OAuth 登入時記錄 IP 地區
   - 統計非台灣使用者比例

2. **標籤語言分布**：
   - 統計 raw_value 語言
   - 中文 vs 英文 vs 其他

3. **「其他」標籤比例**：
   - 如果 > 50% 標籤是「其他」
   - 表示標準化失效

---

## 結論

### 當前狀態
- ✅ **架構支援國際化**（分離設計）
- ⚠️ **標準化僅支援台灣**（中文類別）
- ✅ **資料保留原始語言**（raw_value）

### 建議
1. **短期**：保持現狀，明確定位台灣市場
2. **監控**：追蹤國際使用者比例
3. **準備**：架構已支援，隨時可擴展

### 擴展路徑
```
現狀（台灣）→ 地區化（2-3 國）→ 多語言（全球）→ AI 輔助（智慧）
   0 小時        20-30 小時        40-60 小時      8-12 小時
```

---

**決策建議**：保持現狀，等待市場驗證。架構已準備好，擴展成本可控。
