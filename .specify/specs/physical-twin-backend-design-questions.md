# 實體名片孿生後端設計 - 關鍵問題確認

基於前端雛形與後端規劃整理（2026-01-28）

---

## 📋 現況整理

### 前端雛形功能（已完成）
✅ `docs/實體名片孿生雛形.html`
- 3D 卡片翻轉（數位卡片中英雙語）
- 長按 5 秒啟動實體孿生模式
- 實體名片雙面展示（正反面翻轉）
- Pinch-to-zoom（0.5x ~ 3x）
- 旋轉控制（橫向/縱向）
- 粒子橋接動畫

### 後端規劃（已完成）
✅ `.specify/specs/physical-twin-backend-planning.md`
- 檔案大小限制：5 MB
- 3 層安全驗證（前端 UX + 後端安全 + Magic Bytes）
- 資料庫 Schema 設計
- R2 儲存配置

✅ `.specify/specs/r2-security-strategy.md`
- 6 層防護機制
- Workers 代理存取
- Rate Limiting

### R2 配置（已完成）
✅ Staging 環境
- Bucket: `db-card-physical-images-staging`
- Preview: `db-card-physical-images-preview`
- TypeScript 類型定義完成

---

## 🔑 關鍵設計問題

### Q1: 圖片存取方式

**選項 A: 公開 R2 URL（簡單但不安全）**
```json
{
  "physical_twin": {
    "front_url": "https://pub-xxx.r2.dev/abc-front.webp",
    "back_url": "https://pub-xxx.r2.dev/abc-back.webp"
  }
}
```
- ✅ 實作簡單
- ✅ CDN 快取自動生效
- ❌ 任何人可遍歷存取
- ❌ 無法撤銷存取權限
- ❌ 無法追蹤存取記錄

**選項 B: Workers 代理 + Session 驗證（安全但複雜）**
```json
{
  "physical_twin": {
    "front_url": "/api/physical-card/abc-123/front?session=xyz",
    "back_url": "/api/physical-card/abc-123/back?session=xyz"
  }
}
```
- ✅ 必須有有效 Session 才能存取
- ✅ 繼承現有授權機制（24h TTL + 併發限制）
- ✅ 可追蹤存取記錄
- ✅ 可撤銷存取權限
- ❌ 實作較複雜
- ❌ 需要額外 API 端點

**選項 C: 簽名 URL（平衡方案）**
```json
{
  "physical_twin": {
    "front_url": "https://pub-xxx.r2.dev/abc-front.webp?expires=1234&sig=hmac...",
    "back_url": "https://pub-xxx.r2.dev/abc-back.webp?expires=1234&sig=hmac..."
  }
}
```
- ✅ 時效性存取（1 小時）
- ✅ CDN 快取生效
- ✅ 無法遍歷其他名片
- ❌ 無法即時撤銷
- ❌ 需要實作簽名邏輯

**❓ 您偏好哪個方案？**
- [ ] A: 公開 URL（最簡單）
- [ ] B: Workers 代理（最安全）
- [ ] C: 簽名 URL（平衡）

---

### Q2: 圖片壓縮策略

**選項 A: 前端壓縮（使用者負擔）**
```javascript
// 使用 Canvas API 壓縮
async function compressImage(file) {
  const canvas = document.createElement('canvas');
  // ... 壓縮邏輯
  return canvas.toBlob('image/webp', 0.85);
}
```
- ✅ 減少上傳流量
- ✅ 減少後端處理負擔
- ❌ 依賴瀏覽器支援
- ❌ 行動裝置效能問題

**選項 B: 後端壓縮（Workers 處理）**
```typescript
// 使用 Cloudflare Image Resizing API
async function processImage(buffer: ArrayBuffer) {
  const response = await fetch('https://workers.cloudflare.com/image-resizing', {
    method: 'POST',
    body: buffer,
    headers: {
      'CF-Image-Resize': JSON.stringify({
        width: 1200,
        format: 'webp',
        quality: 85
      })
    }
  });
  return await response.arrayBuffer();
}
```
- ✅ 統一品質控制
- ✅ 自動格式轉換（WebP）
- ✅ EXIF 資料清除
- ❌ 增加後端處理時間
- ❌ 可能產生額外費用

**選項 C: 雙重壓縮（前端預壓 + 後端優化）**
- 前端：壓縮至 < 2 MB（快速上傳）
- 後端：優化至 < 500 KB（長期儲存）

**❓ 您偏好哪個方案？**
- [ ] A: 前端壓縮
- [ ] B: 後端壓縮
- [ ] C: 雙重壓縮

---

### Q3: 圖片更新策略

**場景**: 使用者想更換實體名片照片

**選項 A: 覆蓋原檔案（節省空間）**
```typescript
// 刪除舊檔案
await env.PHYSICAL_CARDS.delete(oldKey);
// 上傳新檔案（使用相同 key）
await env.PHYSICAL_CARDS.put(oldKey, newBuffer);
```
- ✅ 節省儲存空間
- ✅ URL 不變（前端無需更新）
- ❌ 無法回溯歷史版本
- ❌ CDN 快取問題（需要 purge）

**選項 B: 保留歷史版本（版本控制）**
```typescript
// 保留舊檔案
// 上傳新檔案（新 UUID）
const newKey = `cards/${uuid}/${crypto.randomUUID()}-front.webp`;
await env.PHYSICAL_CARDS.put(newKey, newBuffer);
// 更新資料庫指向新檔案
```
- ✅ 可回溯歷史版本
- ✅ 無 CDN 快取問題
- ❌ 佔用更多儲存空間
- ❌ 需要定期清理舊檔案

**選項 C: 軟刪除 + 定期清理（折衷）**
- 標記舊檔案為「待刪除」
- 30 天後自動清理
- 保留最近 3 個版本

**❓ 您偏好哪個方案？**
- [ ] A: 覆蓋原檔案
- [ ] B: 保留歷史版本
- [ ] C: 軟刪除 + 定期清理

---

### Q4: 實體孿生啟用控制

**場景**: 並非所有名片都需要實體孿生功能

**選項 A: 自動啟用（上傳即啟用）**
```sql
-- 上傳照片後自動設為 enabled
UPDATE cards SET physical_card_enabled = TRUE WHERE card_uuid = ?;
```
- ✅ 使用者體驗流暢
- ❌ 無法控制是否顯示

**選項 B: 手動啟用（需明確開啟）**
```html
<!-- Admin Dashboard 需要勾選「啟用實體孿生」 -->
<label>
  <input type="checkbox" id="enable-physical-twin">
  啟用實體孿生模式
</label>
```
- ✅ 完全控制
- ✅ 可測試後再啟用
- ❌ 多一步操作

**選項 C: 智慧啟用（有照片且通過驗證）**
```typescript
// 上傳成功 + 圖片驗證通過 → 自動啟用
// 使用者可隨時關閉
```

**❓ 您偏好哪個方案？**
- [ ] A: 自動啟用
- [ ] B: 手動啟用
- [ ] C: 智慧啟用

---

### Q5: 前端整合方式

**場景**: card-display.html 如何顯示實體孿生

**選項 A: 完全替換（使用雛形）**
```javascript
// 直接使用 docs/實體名片孿生雛形.html 的完整邏輯
// 包含 3D 翻轉、長按啟動、粒子動畫等
```
- ✅ 完整體驗
- ✅ 視覺效果最佳
- ❌ 檔案大小增加（+1091 行）
- ❌ 複雜度提升

**選項 B: 簡化版本（僅核心功能）**
```javascript
// 僅保留：
// 1. 長按啟動
// 2. 雙面展示
// 3. 基本翻轉
// 移除：粒子動畫、3D 效果、複雜手勢
```
- ✅ 檔案大小可控
- ✅ 效能較佳
- ❌ 視覺效果較弱

**選項 C: 漸進增強（按需載入）**
```javascript
// 預設：簡化版本
// 偵測到實體孿生數據 → 動態載入完整版本
if (cardData.physical_twin?.enabled) {
  await import('./physical-twin-enhanced.js');
}
```
- ✅ 最佳效能
- ✅ 保留完整體驗
- ❌ 實作較複雜

**❓ 您偏好哪個方案？**
- [ ] A: 完全替換（雛形）
- [ ] B: 簡化版本
- [ ] C: 漸進增強

---

### Q6: 圖片格式與尺寸

**上傳限制**:
```typescript
const UPLOAD_LIMITS = {
  maxSize: 5 * 1024 * 1024,        // 5 MB
  allowedFormats: ['jpeg', 'png', 'webp'],
  minDimensions: { width: 800, height: 800 },
  maxDimensions: { width: 4096, height: 4096 }
};
```

**儲存格式**:
```typescript
const STORAGE_FORMAT = {
  format: 'webp',
  quality: 85,
  maxWidth: 1200,
  maxHeight: 1200
};
```

**❓ 這些限制是否合理？**
- [ ] 是，符合需求
- [ ] 需要調整（請說明）

---

### Q7: 錯誤處理策略

**場景**: 上傳失敗或圖片損壞

**選項 A: 嚴格模式（任何錯誤都拒絕）**
```typescript
// 檔案大小超過 → 拒絕
// Magic bytes 不符 → 拒絕
// 圖片無法解析 → 拒絕
```
- ✅ 最安全
- ❌ 使用者體驗較差

**選項 B: 寬鬆模式（盡可能接受）**
```typescript
// 檔案大小超過 → 自動壓縮
// Magic bytes 不符 → 嘗試修復
// 圖片無法解析 → 提示使用者
```
- ✅ 使用者體驗較佳
- ❌ 可能有安全風險

**選項 C: 平衡模式（關鍵錯誤拒絕，其他修復）**
```typescript
// 檔案大小超過 → 自動壓縮（< 10 MB）
// Magic bytes 不符 → 拒絕（安全風險）
// 圖片無法解析 → 拒絕（損壞檔案）
```

**❓ 您偏好哪個方案？**
- [ ] A: 嚴格模式
- [ ] B: 寬鬆模式
- [ ] C: 平衡模式

---

### Q8: Admin Dashboard 整合位置

**選項 A: 獨立 Tab（「實體孿生」）**
```html
<div class="tabs">
  <button>基本資料</button>
  <button>社群連結</button>
  <button>實體孿生</button> <!-- 新增 -->
  <button>系統工具</button>
</div>
```
- ✅ 清楚分離
- ✅ 不影響現有流程
- ❌ 多一個 Tab

**選項 B: 整合至「基本資料」Tab**
```html
<div class="basic-info-tab">
  <!-- 現有欄位 -->
  <hr>
  <h3>實體孿生設定</h3>
  <!-- 上傳區域 -->
</div>
```
- ✅ 集中管理
- ❌ Tab 內容過多

**選項 C: 浮動視窗（Modal）**
```html
<button onclick="openPhysicalTwinModal()">
  <i data-lucide="camera"></i>
  設定實體孿生
</button>
```
- ✅ 不佔用 Tab 空間
- ❌ 需要額外點擊

**❓ 您偏好哪個方案？**
- [ ] A: 獨立 Tab
- [ ] B: 整合至基本資料
- [ ] C: 浮動視窗

---

## 📊 推薦配置（基於最佳實踐）

### 我的建議
```yaml
Q1_圖片存取: B (Workers 代理 + Session 驗證)
  理由: 安全性最高，符合現有授權機制

Q2_圖片壓縮: B (後端壓縮)
  理由: 統一品質控制，EXIF 清除

Q3_圖片更新: C (軟刪除 + 定期清理)
  理由: 平衡空間與回溯需求

Q4_啟用控制: C (智慧啟用)
  理由: 使用者體驗最佳

Q5_前端整合: C (漸進增強)
  理由: 效能與體驗兼顧

Q6_格式尺寸: 是 (合理)
  理由: 符合業界標準

Q7_錯誤處理: C (平衡模式)
  理由: 安全與體驗兼顧

Q8_Dashboard位置: A (獨立 Tab)
  理由: 清楚分離，易於維護
```

---

## 🚀 下一步

請回答以上 8 個問題，我將根據您的選擇：

1. 更新 BDD 規格
2. 實作對應的後端邏輯
3. 整合前端介面
4. 撰寫測試案例

**格式範例**:
```
Q1: B
Q2: B
Q3: C
Q4: C
Q5: C
Q6: 是
Q7: C
Q8: A
```

或直接說「使用推薦配置」即可。
