# DB-Card 系統規劃決策摘要

## 文檔版本
- 日期: 2026-01-20
- 版本: v4.2.0-PLANNING

---

## 核心決策

### 1. 產品定位 ✅

**決定**：數位名片系統，不是授權系統

**含義**：
- ✅ 資料本質上是公開的（姓名、電話、Email）
- ✅ 設計目的是易於分享、易於傳播
- ✅ 保護的是「服務可用性」，不是「資料機密性」
- ❌ 不需要嚴格的訪問控制
- ❌ 不需要身份驗證

---

### 2. Session 機制 ✅

**決定**：Session 是「名片的臨時副本」，不是「身份驗證令牌」

**含義**：
- ✅ 任何人都可以創建 session（只需要 card_uuid）
- ✅ Session 可以被分享（但當前實作是每人創建新 session）
- ✅ Session 有 24 小時 TTL 和併發限制
- ❌ Session 不追蹤裝置
- ❌ Session 不追蹤用戶身份

**實際作用**：
1. 審計追蹤（記錄訪問行為）✅
2. 撤銷能力（緊急情況處理）✅
3. 服務保護（Rate Limit + Dedup）✅
4. 使用統計（分析效果）✅
5. 資料保護（❌ 無效）

---

### 3. 分享機制 ✅

**決定**：分享時只傳 uuid，不傳 session

**當前實作**：
```javascript
// QR Code 和複製連結
const shareUrl = `${origin}/card-display.html?uuid=${uuid}`;
// 不包含 session 參數
```

**行為**：
- 用戶 A 觸碰 NFC → 創建 session_A
- 用戶 A 分享 QR Code → 只包含 uuid
- 用戶 B 掃描 → 自動創建 session_B（新 session）
- 用戶 C 開啟連結 → 自動創建 session_C（又是新 session）

**優點**：
- ✅ 每個用戶有獨立 session
- ✅ 不受其他用戶影響
- ✅ Session 過期不影響新用戶
- ✅ 更好的用戶體驗

---

### 4. 多層防護（v4.1.0 已實作）✅

**決定**：5 層防護，保護服務可用性

```
Layer 0: Basic Validation → 400
Layer 1: Dedup (60s) → 200 (reused: true)
Layer 2: Rate Limit → 429
Layer 3: Card Validation → 404/403
Layer 4: Retap Revocation → 自動撤銷
Layer 5: Max Reads → 403 (併發限制)
```

**關鍵參數**：
- Dedup: 60 秒
- Rate Limit (Card): 10/min, 50/hour
- Rate Limit (IP): 10/min, 60/hour
- Max Reads: 20 (personal), 50 (event), 5 (sensitive)

**保護效果**：
- ✅ 防止爬蟲瞬間爆量（Dedup）
- ✅ 防止持續濫用（Rate Limit）
- ✅ 防止併發濫用（Max Reads）
- ❌ 無法防止資料被複製（這是允許的）

---

### 5. 傳遞深度限制 ❌

**決定**：不實作傳遞深度限制

**理由**：
1. ❌ 沒有業界案例（Dropbox, PayPal 都沒用）
2. ❌ 技術複雜（需要追蹤完整傳遞鏈）
3. ❌ 價值有限（總量上限已足夠）
4. ❌ 容易繞過（移除 session 參數即可重置）
5. ❌ 違背產品定位（易於分享）

**外部研究結論**：
- Dropbox: 使用「總量上限」（16GB），不限制傳遞深度
- PayPal: 使用「現金獎勵」，不限制傳遞深度
- 業界主流: 總量限制 + 異常檢測

---

### 6. v4.2.0 規劃 📋

**決定**：採用業界主流做法（總量限制 + 異常檢測）

#### 選項 A：總量限制（推薦）✅

```typescript
// 追蹤每張卡片的 session 總數
ALTER TABLE cards ADD COLUMN total_sessions INTEGER DEFAULT 0;

// Policy 定義
personal: {
  max_total_sessions: 1000,
  max_sessions_per_day: 10,
  max_sessions_per_month: 100
}

event_booth: {
  max_total_sessions: 5000,
  max_sessions_per_day: 50,
  max_sessions_per_month: 500
}

sensitive: {
  max_total_sessions: 100,
  max_sessions_per_day: 3,
  max_sessions_per_month: 30
}
```

**行為**：
- 達到上限時顯示警告
- 限制部分功能（如分享）
- 仍然允許查看基本資訊
- 建議直接聯繫持有人

#### 選項 B：異常檢測

```typescript
// 檢測異常模式
- 短時間內大量 session 創建
- 來自相同 IP 的大量請求
- 機器人行為模式
```

**行為**：
- 記錄安全事件
- 可選的暫時限制
- 管理員警報

---

## 機制完整性檢查表

### ✅ 已實作且運作正常

- [x] Session 管理（創建、使用、撤銷、過期）
- [x] 多層防護（5 層）
- [x] 審計追蹤（完整日誌）
- [x] 撤銷機制（4 種方式）
- [x] 加密機制（信封加密）
- [x] Rate Limit（雙維度）
- [x] Dedup（60 秒）
- [x] Max Reads（併發限制）
- [x] 前端自動創建 session
- [x] 分享機制（只傳 uuid）

### 📋 規劃中（v4.2.0）

- [ ] 總量限制（total_sessions）
- [ ] 每日/每月限制
- [ ] 異常檢測
- [ ] 軟性警告機制

### ❌ 不實作

- [ ] ~~傳遞深度限制~~（沒有業界案例）
- [ ] ~~裝置追蹤~~（違背產品定位）
- [ ] ~~訪問控制~~（資料是公開的）
- [ ] ~~父子 session 追蹤~~（技術複雜，價值有限）

---

## 關鍵數據

### 當前限制（v4.1.0）

| 項目 | 限制值 | 說明 |
|------|--------|------|
| Dedup 窗口 | 60 秒 | 防止重複請求 |
| Card Rate (min) | 10 次 | 每分鐘最多 10 次 |
| Card Rate (hour) | 50 次 | 每小時最多 50 次 |
| IP Rate (min) | 10 次 | 每分鐘最多 10 次 |
| IP Rate (hour) | 60 次 | 每小時最多 60 次 |
| Session TTL | 24 小時 | 自動過期 |
| Max Reads (personal) | 20 | 併發限制 |
| Max Reads (event) | 50 | 併發限制 |
| Max Reads (sensitive) | 5 | 併發限制 |

### 計算實際保護效果

**無防護情況**：
- 攻擊者可以每秒發送 100+ 請求
- 完全打垮服務

**有防護情況（v4.1.0）**：
- Card UUID: 最多 14,400 次/天（50/hour × 24）
- IP: 最多 1,440 次/天（60/hour × 24）
- 但攻擊者只需要 1 次就能獲得完整資料

**結論**：
- ✅ 對「服務保護」非常有效（限制請求頻率）
- ❌ 對「資料保護」無效（但這是允許的）

---

## 設計哲學

### 核心原則

```
產品定位：數位名片系統
核心價值：易於分享、易於傳播
資料性質：公開資訊
安全策略：資源管理，非訪問控制

Session 是「名片的臨時副本」
不是「身份驗證令牌」
```

### 類比實體名片

```
實體名片：
- 任何人拿到都能看 ✅
- 可以複印 ✅
- 可以拍照 ✅
- 可以轉發 ✅

數位名片：
- 任何人拿到 UUID 都能看 ✅
- 可以複製資料 ✅
- 可以截圖 ✅
- 可以分享連結 ✅

兩者本質相同 ✅
```

---

## 下一步行動

### 立即行動（v4.1.0）

- [x] 本地測試完成（6/6 通過）
- [ ] 部署到 Staging
- [ ] Staging 環境驗證
- [ ] 監控實際性能指標
- [ ] Production 部署

### v4.2.0 開發

**優先級 P0**：
- [ ] 資料庫 Migration（新增 total_sessions）
- [ ] API 支援總量檢查
- [ ] 軟性警告機制
- [ ] 前端顯示警告訊息

**預估時間**: 4-6 小時

---

## 參考文檔

- 完整架構: `.specify/specs/COMPLETE-SYSTEM-ARCHITECTURE-v4.md`
- BDD 規格: `.specify/specs/tap-dedup-ratelimit.md`
- 實作總結: `.specify/specs/tap-dedup-ratelimit-implementation-summary.md`
- 本地測試: `.specify/reports/LOCAL-TEST-REPORT-v4.1.0.md`
- 外部研究: 本對話記錄

---

**決策狀態**: ✅ 完成  
**機制一致性**: ✅ 已驗證  
**準備狀態**: ✅ 可開始下一階段
