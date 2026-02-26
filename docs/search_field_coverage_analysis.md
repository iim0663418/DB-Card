# 搜尋機制全面檢視與變更規劃

## 一、當前實作架構

### 1.1 三層搜尋架構

```
用戶輸入 → 前端 Debounce (300ms) → 後端 API
                                        ↓
                            ┌───────────┴───────────┐
                            ↓                       ↓
                    語義搜尋 (Vectorize)    關鍵字搜尋 (SQL LIKE)
                            ↓                       ↓
                    Score >= 0.7 過濾        全文匹配
                            ↓                       ↓
                    前端顯示 ← 結果增強 ← 合併結果
```

### 1.2 Vectorize Embedding 生成

**來源欄位** (sync-card-embeddings.ts Line 38):
```javascript
const text = `${card.full_name} ${card.organization} ${card.title} ${card.department || ''}`.trim();
```

**涵蓋**: 4 個欄位
- ✅ full_name
- ✅ organization
- ✅ title
- ✅ department

**未涵蓋**: 16 個欄位

### 1.3 後端關鍵字搜尋

**SQL 查詢** (search.ts Line 195-201):
```sql
WHERE (
  full_name LIKE ? OR
  organization LIKE ? OR
  title LIKE ? OR
  company_summary LIKE ?
)
```

**涵蓋**: 4 個欄位
- ✅ full_name
- ✅ organization
- ✅ title
- ✅ company_summary

**未涵蓋**: 16 個欄位

### 1.4 前端客戶端過濾

**JavaScript 過濾** (received-cards.js Line 1117-1124):
```javascript
card.full_name?.toLowerCase().includes(this.currentKeyword) ||
card.organization?.toLowerCase().includes(this.currentKeyword) ||
card.organization_en?.toLowerCase().includes(this.currentKeyword) ||
card.organization_alias?.toLowerCase().includes(this.currentKeyword) ||
card.department?.toLowerCase().includes(this.currentKeyword) ||
card.title?.toLowerCase().includes(this.currentKeyword) ||
card.email?.toLowerCase().includes(this.currentKeyword) ||
card.phone?.toLowerCase().includes(this.currentKeyword)
```

**涵蓋**: 8 個欄位

**未涵蓋**: 12 個欄位

---

## 二、欄位涵蓋矩陣

| 欄位 | 資料類型 | Vectorize | 後端搜尋 | 前端搜尋 | 優先級 |
|------|---------|-----------|---------|---------|--------|
| **基本資訊** |
| full_name | TEXT | ✅ | ✅ | ✅ | P0 |
| first_name | TEXT | ❌ | ❌ | ❌ | P1 |
| last_name | TEXT | ❌ | ❌ | ❌ | P1 |
| name_prefix | TEXT | ❌ | ❌ | ❌ | P2 |
| name_suffix | TEXT | ❌ | ❌ | ❌ | P2 |
| **組織資訊** |
| organization | TEXT | ✅ | ✅ | ✅ | P0 |
| organization_en | TEXT | ❌ | ❌ | ✅ | P0 |
| organization_alias | TEXT | ❌ | ❌ | ✅ | P0 |
| department | TEXT | ✅ | ❌ | ✅ | P0 |
| **職位與聯絡** |
| title | TEXT | ✅ | ✅ | ✅ | P0 |
| email | TEXT | ❌ | ❌ | ✅ | P0 |
| phone | TEXT | ❌ | ❌ | ✅ | P0 |
| website | TEXT | ❌ | ❌ | ❌ | **P0** ⚠️ |
| address | TEXT | ❌ | ❌ | ❌ | **P0** ⚠️ |
| **AI 生成內容** |
| company_summary | TEXT | ❌ | ✅ | ❌ | P0 |
| personal_summary | TEXT | ❌ | ❌ | ❌ | **P0** ⚠️ |
| **其他** |
| note | TEXT | ❌ | ❌ | ❌ | **P1** ⚠️ |
| ocr_raw_text | TEXT | ❌ | ❌ | ❌ | P2 |

**圖例**:
- ✅ 已涵蓋
- ❌ 未涵蓋
- ⚠️ 重要但未涵蓋

---

## 三、關鍵問題分析

### 3.1 Vectorize Embedding 不完整

**問題**: 只包含 4 個欄位，遺漏重要資訊
```javascript
// 當前
const text = `${full_name} ${organization} ${title} ${department}`;

// 遺漏
- company_summary (公司業務描述)
- personal_summary (專業領域、經驗)
- organization_en (英文公司名)
- organization_alias (公司別名)
- email, phone, website, address
```

**影響**: 語義搜尋無法匹配這些欄位的內容

### 3.2 後端關鍵字搜尋不完整

**問題**: 只搜尋 4 個欄位

**遺漏的重要欄位**:
1. ❌ **personal_summary** - 包含專業領域（如「稅務專家」）
2. ❌ **website** - 可能包含公司名稱
3. ❌ **address** - 包含城市、區域資訊
4. ❌ **note** - 用戶手動輸入的重要資訊
5. ❌ **email** - 可能包含公司域名
6. ❌ **phone** - 用戶可能記得電話號碼

**影響**: 關鍵字搜尋 fallback 時無法找到這些欄位的內容

### 3.3 前端與後端不一致

**前端有，後端沒有**:
- organization_en
- organization_alias
- department
- email
- phone

**後端有，前端沒有**:
- company_summary
- personal_summary (兩者都沒有！)

**影響**: 用戶體驗不一致，搜尋結果可能不同

---

## 四、變更規劃

### Phase 1: 修復 P0 欄位（高優先級）

#### 1.1 Vectorize Embedding 擴充

**目標**: 從 4 個欄位擴充到 10 個欄位

**修改文件**: `src/cron/sync-card-embeddings.ts`

```javascript
// Before (4 個欄位)
const text = `${card.full_name} ${card.organization} ${card.title} ${card.department || ''}`.trim();

// After (10 個欄位)
const text = [
  card.full_name,
  card.organization,
  card.organization_en,
  card.organization_alias,
  card.department,
  card.title,
  card.company_summary,
  card.personal_summary,
  card.email,
  card.phone
].filter(Boolean).join(' ').trim();
```

**影響**:
- ✅ 語義搜尋涵蓋率: 20% → 50%
- ⚠️ Embedding 長度增加（但仍在 Gemini 限制內）
- ⚠️ 需要重新同步所有名片（Cron job 自動處理）

#### 1.2 後端關鍵字搜尋擴充

**目標**: 從 4 個欄位擴充到 10 個欄位

**修改文件**: `src/handlers/user/received-cards/search.ts`

```sql
-- Before (4 個欄位)
WHERE (
  full_name LIKE ? OR
  organization LIKE ? OR
  title LIKE ? OR
  company_summary LIKE ?
)

-- After (10 個欄位)
WHERE (
  full_name LIKE ? OR
  organization LIKE ? OR
  organization_en LIKE ? OR
  organization_alias LIKE ? OR
  department LIKE ? OR
  title LIKE ? OR
  company_summary LIKE ? OR
  personal_summary LIKE ? OR
  email LIKE ? OR
  phone LIKE ?
)
```

**影響**:
- ✅ 關鍵字搜尋涵蓋率: 20% → 50%
- ⚠️ SQL 查詢複雜度增加（但 LIKE 查詢已有索引）
- ⚠️ 需要綁定 10 個參數（2 次：COUNT + SELECT）

#### 1.3 前端客戶端過濾擴充

**目標**: 從 8 個欄位擴充到 12 個欄位

**修改文件**: `public/js/received-cards.js`

```javascript
// Before (8 個欄位)
const matchKeyword = !this.currentKeyword ||
  card.full_name?.toLowerCase().includes(this.currentKeyword) ||
  card.organization?.toLowerCase().includes(this.currentKeyword) ||
  card.organization_en?.toLowerCase().includes(this.currentKeyword) ||
  card.organization_alias?.toLowerCase().includes(this.currentKeyword) ||
  card.department?.toLowerCase().includes(this.currentKeyword) ||
  card.title?.toLowerCase().includes(this.currentKeyword) ||
  card.email?.toLowerCase().includes(this.currentKeyword) ||
  card.phone?.toLowerCase().includes(this.currentKeyword);

// After (12 個欄位)
const matchKeyword = !this.currentKeyword ||
  card.full_name?.toLowerCase().includes(this.currentKeyword) ||
  card.organization?.toLowerCase().includes(this.currentKeyword) ||
  card.organization_en?.toLowerCase().includes(this.currentKeyword) ||
  card.organization_alias?.toLowerCase().includes(this.currentKeyword) ||
  card.department?.toLowerCase().includes(this.currentKeyword) ||
  card.title?.toLowerCase().includes(this.currentKeyword) ||
  card.company_summary?.toLowerCase().includes(this.currentKeyword) ||
  card.personal_summary?.toLowerCase().includes(this.currentKeyword) ||
  card.email?.toLowerCase().includes(this.currentKeyword) ||
  card.phone?.toLowerCase().includes(this.currentKeyword) ||
  card.website?.toLowerCase().includes(this.currentKeyword) ||
  card.address?.toLowerCase().includes(this.currentKeyword);
```

**影響**:
- ✅ 前端過濾涵蓋率: 40% → 60%
- ✅ 與後端一致性提升

---

### Phase 2: 修復 P1 欄位（中優先級）

#### 2.1 新增 note 欄位支援

**目標**: 支援用戶手動輸入的備註搜尋

**修改**:
- Vectorize: 加入 `card.note`
- 後端搜尋: 加入 `note LIKE ?`
- 前端過濾: 加入 `card.note?.toLowerCase().includes()`

#### 2.2 新增姓名拆分支援（可選）

**目標**: 支援英文名搜尋（first_name, last_name）

**修改**:
- Vectorize: 加入 `card.first_name`, `card.last_name`
- 後端搜尋: 加入 `first_name LIKE ?`, `last_name LIKE ?`
- 前端過濾: 加入對應欄位

---

## 五、實作步驟

### Step 1: 修改 Vectorize Embedding (5 分鐘)
```bash
# 修改 src/cron/sync-card-embeddings.ts
# 擴充 text 變數包含 10 個欄位
```

### Step 2: 修改後端關鍵字搜尋 (10 分鐘)
```bash
# 修改 src/handlers/user/received-cards/search.ts
# 擴充 SQL WHERE 條件包含 10 個欄位
# 更新 bind() 參數（COUNT: 10 個, SELECT: 10 個）
```

### Step 3: 修改前端客戶端過濾 (5 分鐘)
```bash
# 修改 public/js/received-cards.js
# 擴充 matchKeyword 條件包含 12 個欄位
```

### Step 4: 測試與驗證 (10 分鐘)
```bash
# TypeScript 編譯檢查
npm run typecheck

# 部署到 Staging
wrangler deploy --env=""

# 手動測試搜尋功能
# - 搜尋 personal_summary 內容
# - 搜尋 website 域名
# - 搜尋 address 城市
```

### Step 5: 重新同步 Embeddings (自動)
```bash
# Cron job 會自動處理
# 或手動觸發: POST /api/admin/trigger-cron
```

---

## 六、風險評估

### 6.1 效能影響

| 項目 | 影響 | 緩解措施 |
|------|------|---------|
| Vectorize Embedding 長度 | 增加 2.5 倍 | Gemini 支援最多 2048 tokens |
| SQL LIKE 查詢複雜度 | 增加 2.5 倍 | 已有索引，影響可控 |
| 前端過濾效能 | 增加 1.5 倍 | JavaScript 字串匹配很快 |

### 6.2 資料一致性

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 舊 Embeddings 不完整 | 搜尋結果不準確 | Cron job 自動重新同步 |
| 前後端欄位不一致 | 用戶體驗混亂 | 統一修改，保持一致 |

### 6.3 向後相容性

| 項目 | 相容性 | 說明 |
|------|--------|------|
| API 介面 | ✅ 完全相容 | 只擴充搜尋範圍，不改變 API |
| 資料庫 Schema | ✅ 完全相容 | 不需要 migration |
| 前端 UI | ✅ 完全相容 | 不改變顯示邏輯 |

---

## 七、預期效果

### 7.1 涵蓋率提升

| 搜尋類型 | 修改前 | 修改後 | 提升 |
|---------|--------|--------|------|
| Vectorize Embedding | 20% (4/20) | 50% (10/20) | +150% |
| 後端關鍵字搜尋 | 20% (4/20) | 50% (10/20) | +150% |
| 前端客戶端過濾 | 40% (8/20) | 60% (12/20) | +50% |

### 7.2 用戶體驗改善

**修改前**:
- ❌ 搜尋「稅務專家」找不到（personal_summary）
- ❌ 搜尋「example.com」找不到（website）
- ❌ 搜尋「台北」找不到（address）

**修改後**:
- ✅ 搜尋「稅務專家」可以找到
- ✅ 搜尋「example.com」可以找到
- ✅ 搜尋「台北」可以找到

---

## 八、建議

### 立即執行（Phase 1）
1. ✅ 修改 Vectorize Embedding（10 個欄位）
2. ✅ 修改後端關鍵字搜尋（10 個欄位）
3. ✅ 修改前端客戶端過濾（12 個欄位）
4. ✅ 測試與部署

### 後續優化（Phase 2）
1. 新增 note 欄位支援
2. 考慮姓名拆分支援
3. 監控效能影響
4. 收集用戶反饋

### 不建議
1. ❌ 搜尋 ocr_raw_text（雜訊多）
2. ❌ 搜尋 ai_sources_json（技術資料）
3. ❌ 搜尋 name_prefix/suffix（用途有限）

---

## 九、總結

**當前問題**: 搜尋涵蓋率低（20-40%），遺漏重要欄位

**解決方案**: 擴充搜尋欄位到 10-12 個，涵蓋率提升到 50-60%

**實作成本**: 30 分鐘（修改 + 測試）

**預期效果**: 搜尋準確度提升 150%，用戶體驗顯著改善

**風險**: 低（向後相容，效能影響可控）

**建議**: 立即執行 Phase 1
