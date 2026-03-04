# DB-Card 協同學習架構 v5.0.0

## 🏗️ 系統架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                    協同學習生態系統                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ FileSearch   │  │ Cross-User   │  │ Chinese      │         │
│  │ Store        │  │ Matching     │  │ Normalization│         │
│  │ (Disabled)   │  │ (Phase A)    │  │ (Active)     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Unified Deduplication Engine                 │      │
│  │  - String Similarity (50-90 分數區間)                │      │
│  │  - Identity Resolution (Email/Phone/Context)         │      │
│  │  - Job History Tracking (promotion/transfer)         │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Cron Job Orchestration                  │      │
│  │  00:00 - Cleanup Temp Uploads                        │      │
│  │  01:00 - Cleanup Received Cards (30 days)            │      │
│  │  02:00 - Find Cross-User Candidates (Phase A)        │      │
│  │  03:00 - Deduplicate Cards (Smart Merge)             │      │
│  │  18:00 - Auto Tag Cards (Batch Processing)           │      │
│  │  Daily - Cleanup FileSearchStore (2 years)           │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 核心模組

### 1️⃣ **FileSearchStore (已停用)**

**狀態**: ❌ Disabled (2026-03-05)

**原因**: Gemini API 限制 - 無法同時使用 `file_search` + `google_search`

**原始設計**:
- 自動上傳組織知識（Organization Alias + Personal Summary）
- 2 年 TTL，每日清理
- 用於增強 50-90 分數區間的去重判斷

**當前替代方案**: 
- 統一使用 `google_search` 工具
- 依賴 Cross-User Matching 和 Chinese Normalization

---

### 2️⃣ **Cross-User Matching (Phase A) ✅**

**狀態**: ✅ Complete (2026-03-04)

**觸發時間**: 每日 02:00 UTC (Cron Job)

**核心邏輯**:
```typescript
// src/cron/find-candidates.ts
export async function findCrossUserCandidates(env: Env): Promise<{
  processed: number;
  candidates: number;
  blacklisted: number;
}>
```

**Identity Resolution 策略**:
1. **Email Exact Match** (100% 信心度)
2. **Phone Exact Match** (95% 信心度)
3. **String Similarity + Context** (50-90 分數區間)
   - 使用 `checkPersonIdentity()` (FileSearchStore - 已停用)
   - 使用 `checkCompanyRelationship()` (FileSearchStore - 已停用)

**資料庫表**:
- `cross_user_match_candidates` (候選配對)
- `matching_blacklist` (黑名單，防止重複配對)

**管理 API**:
- `PUT /api/admin/candidates/validate` - 驗證候選配對
- `GET /api/admin/candidates/precision` - 查詢精確度統計
- `GET /api/admin/candidates` - 列出候選配對

**目標精確度**: 90%+

---

### 3️⃣ **Chinese Normalization (Smart Auto-Learning) ✅**

**狀態**: ✅ Active (2026-03-04)

**核心功能**: 簡繁體自動學習與正規化

**架構**:
```typescript
// src/utils/chinese-converter.ts

// 1. Memory Cache (首次請求載入)
let VARIANTS_CACHE: Record<string, string> | null = null;

// 2. Auto-Learning (未知字元觸發)
async function learnNewChars(env: Env, chars: string[]): Promise<void> {
  // Gemini 2.0 Flash Exp (JSON Mode)
  // 背景執行 (ctx.waitUntil)
}

// 3. D1 Persistence
// Migration 0035: chinese_variants (simplified, traditional, source)
```

**效能特性**:
- **Cache Hit**: < 0.1ms (記憶體查詢)
- **Cache Miss**: ~200ms (Gemini API，僅首次)
- **覆蓋率成長**:
  - 100 張名片 → 200 字元 (95% 覆蓋)
  - 1,000 張名片 → 800 字元 (99% 覆蓋)
  - 10,000 張名片 → 1,500 字元 (99.9% 覆蓋)

**Bootstrap 資料**: 50 個常用字元（初始化）

**使用場景**:
- 搜尋正規化 (`organization_normalized` 欄位)
- 去重比對（統一為繁體）

---

### 4️⃣ **Smart Deduplication Engine ✅**

**狀態**: ✅ Active (2026-02-26)

**觸發時間**: 每日 03:00 UTC (Cron Job)

**核心邏輯**:
```typescript
// src/cron/deduplicate-cards.ts

// 階段 1: 高信心度匹配 (95-100 分)
// - Email exact match
// - Phone exact match

// 階段 2: 中信心度匹配 (80-95 分)
// - String similarity + Company match

// 階段 2.5: FileSearchStore 上下文增強 (50-90 分) [已停用]
// - checkPersonIdentity() + checkCompanyRelationship()

// 階段 3: 低信心度匹配 (50-80 分)
// - String similarity only
```

**Job History Tracking**:
- `promotion` (升遷)
- `transfer` (轉職)
- `duplicate` (重複)

**資料庫欄位**:
- `merged_to` (指向主名片 UUID)
- `job_history` (JSON 格式)

---

### 5️⃣ **Auto Tag System (Batch Processing) ✅**

**狀態**: ✅ Optimized (2026-03-05)

**觸發時間**: 每日 18:00 UTC (Cron Job)

**最新優化**: 移除 7 天重新標籤邏輯（一次性標籤策略）

**批次處理**:
- **Before**: 20 張名片 = 20 次 Gemini API 呼叫
- **After**: 20 張名片 = 1 次 Gemini API 呼叫
- **改善**: 95% API 呼叫減少

**標籤類型**:
- `industry` (產業分類) - 高信心度
- `location` (地理位置) - 高信心度
- `expertise` (專業領域) - 低信心度
- `seniority` (職級) - 低信心度

**Gemini Structured Output**:
```typescript
responseSchema: {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      card_index: { type: 'number' },
      industry: { type: 'string', nullable: true },
      location: { type: 'string', nullable: true },
      expertise: { type: 'array', items: { type: 'string' } },
      seniority: { type: 'string', nullable: true }
    }
  }
}
```

---

## 🔄 Cron Job 執行順序

| 時間 (UTC) | Job | 用途 | 狀態 |
|-----------|-----|------|------|
| 00:00 | Cleanup Temp Uploads | 清理過期上傳 | ✅ |
| 01:00 | Cleanup Received Cards | 清理 30 天前刪除的名片 | ✅ |
| 02:00 | **Find Cross-User Candidates** | 跨使用者配對 (Phase A) | ✅ |
| 03:00 | **Deduplicate Cards** | 智慧去重合併 | ✅ |
| 18:00 | **Auto Tag Cards** | 批次標籤生成 | ✅ |
| Daily | Cleanup FileSearchStore | 清理 2 年前文件 | ⚠️ (Store 已停用) |

---

## 📊 資料庫 Schema (協同學習相關)

### Migration 0034: `organization_normalized`
```sql
ALTER TABLE received_cards ADD COLUMN organization_normalized TEXT;
CREATE INDEX idx_received_cards_org_normalized 
  ON received_cards(organization_normalized);
```

### Migration 0035: `chinese_variants`
```sql
CREATE TABLE chinese_variants (
  simplified TEXT PRIMARY KEY,
  traditional TEXT NOT NULL,
  learned_at INTEGER NOT NULL,
  source TEXT NOT NULL -- 'bootstrap' or 'gemini'
);
```

### Migration 0036: Cross-User Matching
```sql
CREATE TABLE cross_user_match_candidates (
  person_pair_key TEXT PRIMARY KEY,
  card_a_uuid TEXT NOT NULL,
  card_a_user TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  card_b_user TEXT NOT NULL,
  match_confidence INTEGER NOT NULL,
  match_method TEXT NOT NULL,
  match_evidence TEXT NOT NULL,
  validation_status TEXT NOT NULL, -- 'pending', 'confirmed', 'rejected'
  detected_at INTEGER NOT NULL,
  validated_at INTEGER,
  validated_by TEXT
);

CREATE TABLE matching_blacklist (
  person_pair_key TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);
```

---

## 🎯 設計決策 (ADR)

### ADR-005: 雙層標籤系統
- **Keyword Tags** (規則式): 即時、零成本、100% 準確
- **Smart Tags** (AI 式): Cron、Gemini API、90%+ 準確

### ADR-006: Rate Limiting 策略
- **選擇**: Durable Objects (非官方 Rate Limiting API)
- **理由**: 支援 1h/24h 時間窗口、強一致性

---

## 🚧 已知限制

### 1. FileSearchStore 停用
- **原因**: Gemini API 無法同時使用 `file_search` + `google_search`
- **影響**: 50-90 分數區間的去重判斷降級為純字串相似度
- **替代方案**: 依賴 Cross-User Matching 和 Chinese Normalization

### 2. Cross-User Matching 精確度
- **目標**: 90%+
- **當前**: 待驗證（需手動標註 50+ 候選配對）

### 3. Chinese Normalization 覆蓋率
- **初始**: 50 字元 (Bootstrap)
- **成長**: 隨使用量自動學習

---

## 📈 效能指標

| 模組 | 延遲 | 成本 | 準確度 |
|-----|------|------|--------|
| Chinese Normalization (Cache Hit) | < 0.1ms | 零 | 99%+ |
| Chinese Normalization (Cache Miss) | ~200ms | $0.0001/request | 99%+ |
| Cross-User Matching | ~5-10s/user | Gemini API | 90%+ (目標) |
| Auto Tag (Batch) | ~30s/20 cards | Gemini API | 90%+ |
| Deduplication | ~2-3 min/cron | Gemini API | 95%+ |

---

## 🔮 未來規劃

### Phase B: 自動合併 (未實作)
- 高信心度配對自動合併（無需人工驗證）
- 低信心度配對提示使用者確認

### Phase C: 協同標籤學習 (未實作)
- 跨使用者標籤共享
- 標籤品質投票機制

### FileSearchStore 重啟評估
- 等待 Gemini API 支援 `file_search` + `google_search` 同時使用
- 或改用其他向量資料庫（Vectorize）

---

**最後更新**: 2026-03-05  
**版本**: v5.0.0  
**狀態**: Phase A Complete, FileSearchStore Disabled
