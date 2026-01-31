# 實體名片孿生後端設計 - 最終確認版 v1.0

基於用戶決策與現有架構整合（2026-01-28）

---

## 📋 設計決策總覽

### 核心原則
**「Session 代理讀圖 + 後端統一產生 variants + 軟刪除清理 + 漸進增強載入」**

讓圖片與名片讀取共享同一套安全語意（dedup + rate limit + max_reads）

---

## 🎯 確認的設計選擇

### Q1: 圖片存取方式 ✅ **B - Workers 代理 + Session 驗證**

**架構**:
```
使用者 → GET /api/assets/:asset_id/content?variant=1200&card_uuid=xxx&session=yyy
       ↓
    驗證 Session（與 /read 同語意）
       ↓
    R2 讀取 → 返回圖片
```

**安全語意**:
- 撤銷名片 → 圖片立即無法存取
- 撤銷 Session → 圖片立即無法存取
- 沿用現有 dedup + rate limit + max_reads

---

### Q2: 圖片壓縮策略 ✅ **B + 前端輔助**

**主策略**: 後端壓縮（Cloudflare Image Resizing）

**Variants 產生**:
```typescript
const VARIANTS = {
  detail: { width: 1200, height: 1200, quality: 85 },  // 詳頁
  thumb: { width: 256, height: 256, quality: 80 },     // 列表/縮圖
  original: { private: true }                           // 私有保留（不對外）
};
```

**前端輔助**（可選）:
```javascript
// 僅做輕量預縮放（減少上傳時間）
if (file.width > 4096 || file.height > 4096) {
  file = await resizeToFit(file, 4096);
}
```

---

### Q3: 圖片更新策略 ✅ **C - 軟刪除 + 版本化 key**

**版本化 R2 Key**:
```
r2://assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{variant}.webp

範例:
assets/abc-123/twin_front/f47ac10b/v1/1200.webp
assets/abc-123/twin_front/f47ac10b/v2/1200.webp
```

**更新流程**:
1. 新上傳 → 寫入新版本（v2, v3...）
2. DB 更新 `current_version`
3. 舊版本標記 `soft_deleted_at`
4. Cron 每日清理超過 30 天的舊版本

**優勢**:
- 避免 CDN 快取問題
- 支援回滾
- 可追蹤歷史

---

### Q4: 實體孿生啟用控制 ✅ **C - 規則式智慧啟用**

**狀態機**:
```
disabled → ready → stale → error
   ↓         ↓       ↓       ↓
  手動     自動    資產變更  重建失敗
```

**啟用規則**:
```typescript
function canEnableTwin(card: Card): boolean {
  // 必要欄位齊備
  const hasRequiredFields = card.display_name && card.title;
  
  // 至少 1 張核心圖片
  const hasCoreImage = card.avatar || card.twin_front_url;
  
  return hasRequiredFields && hasCoreImage;
}
```

**自動狀態轉換**:
- 啟用後，任何資產變更 → `stale`
- 背景重建完成 → `ready`
- 重建失敗 → `error`（可手動重試）

---

### Q5: 前端整合方式 ✅ **C - 漸進增強（3 層載入）**

**Layer 1: 首屏（文字優先）**
```javascript
// 不等圖片，先顯示文字資料
renderCardText(cardData);
```

**Layer 2: 圖片（Lazy Loading）**
```javascript
// 進入 viewport 才載入
<img loading="lazy" src="/api/assets/...?variant=1200">
```

**Layer 3: 孿生互動（按需載入）**
```javascript
// 使用者點「展開孿生」才載入 heavy bundle
document.getElementById('reveal-twin').addEventListener('click', async () => {
  const { initPhysicalTwin } = await import('./physical-twin-enhanced.js');
  initPhysicalTwin(cardData.physical_twin);
});
```

---

### Q6: 圖片格式與尺寸 ✅ **微調後採用**

**上傳限制**:
```typescript
const UPLOAD_LIMITS = {
  maxSize: 5 * 1024 * 1024,        // 5 MB
  maxPixels: 25 * 1000 * 1000,     // 25 MP（防解碼炸彈）
  allowedFormats: ['jpeg', 'png', 'webp'],
  minDimensions: { width: 800, height: 800 },
  maxDimensions: { width: 4096, height: 4096 }
};
```

**儲存 Variants**:
```typescript
const STORAGE_VARIANTS = {
  detail: {
    format: 'webp',
    quality: 85,
    maxWidth: 1200,
    maxHeight: 1200
  },
  thumb: {
    format: 'webp',
    quality: 80,
    maxWidth: 256,
    maxHeight: 256
  },
  original: {
    private: true,  // 不對外
    retention: 90   // 保留 90 天
  }
};
```

---

### Q7: 錯誤處理策略 ✅ **C - 平衡模式（明確切分）**

**必拒（返回 4xx/5xx）**:
- 未授權（401）
- 格式/大小/像素不符（400）
- R2 寫入失敗（500）
- 圖片解碼失敗（400）

**可降級（返回部分功能）**:
- 孿生生成失敗 → 名片仍可讀（顯示文字）
- 縮圖生成失敗 → 回傳詳頁尺寸
- 部分資產缺失 → 顯示 placeholder

**必告警（監控觸發）**:
- 代理驗證失敗率 > 5%
- 上傳失敗率 > 10%
- R2 讀取延遲 > 2s

---

### Q8: Admin Dashboard 整合 ✅ **A - 獨立 Tab「實體孿生」**

**Tab 內容**:
```html
<div class="physical-twin-tab">
  <!-- 資產列表 -->
  <section class="asset-list">
    <h3>資產列表</h3>
    <table>
      <tr>
        <td>正面照片</td>
        <td>v3 (1.2 MB)</td>
        <td><span class="badge-ready">Ready</span></td>
        <td>2026-01-28 10:00</td>
      </tr>
      <tr>
        <td>背面照片</td>
        <td>v2 (980 KB)</td>
        <td><span class="badge-stale">Stale</span></td>
        <td>2026-01-27 15:30</td>
      </tr>
    </table>
  </section>
  
  <!-- 狀態控制 -->
  <section class="twin-status">
    <h3>孿生狀態</h3>
    <div class="status-card">
      <span class="status-icon">✓</span>
      <span class="status-text">Ready</span>
      <button onclick="disableTwin()">停用</button>
    </div>
    <p>最近重建：2026-01-28 10:05</p>
  </section>
  
  <!-- 上傳區域 -->
  <section class="upload-area">
    <h3>上傳新版本</h3>
    <!-- 拖放區域 -->
  </section>
  
  <!-- 清理排程 -->
  <section class="cleanup-schedule">
    <h3>清理排程</h3>
    <p>下次清理：2026-01-29 02:00 UTC</p>
    <p>待清理版本：3 個（共 2.5 MB）</p>
  </section>
</div>
```

---

## 🔌 後端 API 端點（最小可用集合）

### 1. POST /api/assets/upload
**用途**: 上傳資產（圖片）

**請求**:
```typescript
interface UploadRequest {
  card_uuid: string;
  asset_type: 'twin_front' | 'twin_back' | 'avatar';
  file: File;
}
```

**回應**:
```typescript
interface UploadResponse {
  asset_id: string;
  current_version: number;
  variants: {
    detail: string;  // URL
    thumb: string;
  };
  size: {
    original: number;
    detail: number;
    thumb: number;
  };
}
```

---

### 2. GET /api/assets/:asset_id
**用途**: 取得資產中繼資料（不含實檔）

**回應**:
```typescript
interface AssetMetadata {
  asset_id: string;
  card_uuid: string;
  asset_type: string;
  current_version: number;
  versions: Array<{
    version: number;
    created_at: string;
    size: number;
    soft_deleted_at: string | null;
  }>;
  status: 'ready' | 'stale' | 'error';
}
```

---

### 3. GET /api/assets/:asset_id/content
**用途**: 代理取圖（必驗 Session）

**查詢參數**:
```typescript
interface ContentQuery {
  variant: '256' | '1200';
  card_uuid: string;
  session: string;
}
```

**安全驗證流程**:
```typescript
async function handleAssetContent(request: Request, env: Env) {
  const { asset_id } = params;
  const { variant, card_uuid, session } = query;
  
  // 1. 驗證 Session（與 /read 同語意）
  const sessionData = await getSession(env, session);
  if (!sessionData || sessionData.card_uuid !== card_uuid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. 檢查 Session 過期
  if (new Date(sessionData.expires_at) < new Date()) {
    return new Response('Session expired', { status: 401 });
  }
  
  // 3. 檢查併發讀取限制
  if (sessionData.current_reads >= sessionData.max_reads) {
    return new Response('Concurrent read limit exceeded', { status: 429 });
  }
  
  // 4. Rate Limiting（圖片專用）
  const allowed = await checkImageRateLimit(env, session);
  if (!allowed) {
    return new Response('Rate limited', { status: 429 });
  }
  
  // 5. 從 DB 讀取資產路徑
  const asset = await env.DB.prepare(
    'SELECT r2_key FROM assets WHERE asset_id = ? AND card_uuid = ?'
  ).bind(asset_id, card_uuid).first();
  
  if (!asset) {
    return new Response('Asset not found', { status: 404 });
  }
  
  // 6. 構建 R2 key
  const r2Key = `${asset.r2_key}/v${asset.current_version}/${variant}.webp`;
  
  // 7. 從 R2 讀取
  const object = await env.PHYSICAL_CARDS.get(r2Key);
  if (!object) {
    return new Response('Image not found', { status: 404 });
  }
  
  // 8. 返回圖片
  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
```

---

### 4. POST /api/assets/:asset_id/delete
**用途**: 軟刪除資產

**請求**:
```typescript
interface DeleteRequest {
  version?: number;  // 可選，刪除特定版本；不提供則刪除整個資產
}
```

**回應**:
```typescript
interface DeleteResponse {
  success: boolean;
  deleted_versions: number[];
}
```

---

### 5. POST /api/twin/enable
**用途**: 啟用實體孿生

**請求**:
```typescript
interface EnableTwinRequest {
  card_uuid: string;
}
```

**驗證**:
```typescript
// 檢查是否符合啟用條件
if (!canEnableTwin(card)) {
  return new Response('Missing required fields or assets', { status: 400 });
}
```

---

### 6. POST /api/twin/disable
**用途**: 停用實體孿生（不刪除資產）

---

### 7. POST /api/twin/rebuild
**用途**: 手動重建孿生（stale → ready）

---

## 🗄️ 資料庫 Schema

### Migration 0013: 實體孿生基礎表

```sql
-- 資產表
CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('twin_front', 'twin_back', 'avatar')),
  current_version INTEGER NOT NULL DEFAULT 1,
  r2_key_prefix TEXT NOT NULL,  -- assets/{card_uuid}/{asset_type}/{asset_id}
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'stale', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_uuid) REFERENCES cards(card_uuid) ON DELETE CASCADE
);

-- 資產版本表
CREATE TABLE IF NOT EXISTS asset_versions (
  asset_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  size_original INTEGER,
  size_detail INTEGER,
  size_thumb INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  soft_deleted_at TIMESTAMP,
  PRIMARY KEY (asset_id, version),
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- 孿生狀態表
CREATE TABLE IF NOT EXISTS twin_status (
  card_uuid TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'ready', 'stale', 'error')),
  last_rebuild_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (card_uuid) REFERENCES cards(card_uuid) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_assets_card_uuid ON assets(card_uuid);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_asset_versions_soft_deleted ON asset_versions(soft_deleted_at) WHERE soft_deleted_at IS NOT NULL;
CREATE INDEX idx_twin_status_enabled ON twin_status(enabled) WHERE enabled = TRUE;
```

---

## 🔒 防濫用與資源保護

### 上傳端 Rate Limiting
```typescript
// 以 email + IP 做限制
const UPLOAD_RATE_LIMIT = {
  window: 600,  // 10 分鐘
  max: 10       // 最多 10 張
};

async function checkUploadRateLimit(env: Env, email: string, ip: string): Promise<boolean> {
  const key = `upload_rate:${email}:${ip}`;
  const count = await env.KV.get(key);
  
  if (count && parseInt(count) >= UPLOAD_RATE_LIMIT.max) {
    return false;
  }
  
  await env.KV.put(
    key,
    String((count ? parseInt(count) : 0) + 1),
    { expirationTtl: UPLOAD_RATE_LIMIT.window }
  );
  
  return true;
}
```

### 讀取端 Rate Limiting
```typescript
// 沿用現有 dedup + rate limit
// 圖片讀取加入「每 session 每分鐘最多 N 次圖片請求」
const IMAGE_RATE_LIMIT = {
  window: 60,  // 1 分鐘
  max: 20      // 最多 20 次圖片請求
};

async function checkImageRateLimit(env: Env, session_id: string): Promise<boolean> {
  const key = `img_rate:${session_id}`;
  const count = await env.KV.get(key);
  
  if (count && parseInt(count) >= IMAGE_RATE_LIMIT.max) {
    return false;
  }
  
  await env.KV.put(
    key,
    String((count ? parseInt(count) : 0) + 1),
    { expirationTtl: IMAGE_RATE_LIMIT.window }
  );
  
  return true;
}
```

### 撤銷語意
```typescript
// 撤銷名片或 Session 時，圖片代理立即拒絕（與 /read 同語意）
// 無需額外邏輯，Session 驗證層自動處理
```

---

## 📦 R2 Key 命名規範

### 格式
```
assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{variant}.webp
```

### 範例
```
assets/abc-123/twin_front/f47ac10b-58cc-4372/v1/1200.webp
assets/abc-123/twin_front/f47ac10b-58cc-4372/v1/256.webp
assets/abc-123/twin_front/f47ac10b-58cc-4372/v2/1200.webp
assets/abc-123/twin_back/a3d5e8f2-9b1c-4d6e/v1/1200.webp
```

### 優勢
- **版本化**: 避免快取問題
- **隔離**: 每張名片獨立目錄
- **可追蹤**: 清楚的版本歷史
- **可清理**: 依版本批次刪除

---

## 🚀 實作順序（3 週計畫）

### Week 1: P0 核心機能
**Day 1**: 資料庫 Migration
- [ ] 創建 `assets` 表
- [ ] 創建 `asset_versions` 表
- [ ] 創建 `twin_status` 表
- [ ] 執行 Migration 至 Staging

**Day 2**: 上傳 API
- [ ] `POST /api/assets/upload`
- [ ] 檔案驗證（大小、格式、像素）
- [ ] Magic Bytes 驗證
- [ ] R2 上傳邏輯

**Day 3**: 圖片處理
- [ ] Cloudflare Image Resizing 整合
- [ ] Variants 生成（1200 + 256）
- [ ] EXIF 清除

**Day 4**: 讀取 API
- [ ] `GET /api/assets/:asset_id/content`
- [ ] Session 驗證整合
- [ ] Rate Limiting（圖片專用）

**Day 5**: 測試與安全審查
- [ ] 單元測試
- [ ] 整合測試
- [ ] OWASP 檢查清單

---

### Week 2: P1 增強機能
**Day 1-2**: Admin Dashboard
- [ ] 獨立 Tab「實體孿生」
- [ ] 資產列表顯示
- [ ] 上傳 UI（拖放）
- [ ] 狀態控制按鈕

**Day 3**: 孿生狀態管理
- [ ] `POST /api/twin/enable`
- [ ] `POST /api/twin/disable`
- [ ] `POST /api/twin/rebuild`
- [ ] 狀態機邏輯

**Day 4**: 軟刪除與清理
- [ ] `POST /api/assets/:asset_id/delete`
- [ ] Cron 清理腳本
- [ ] 清理排程顯示

**Day 5**: 前端整合
- [ ] 擴充 `/api/read` 回應
- [ ] card-display.html 漸進增強
- [ ] Lazy Loading 圖片

---

### Week 3: P2 進階機能（可選）
**Day 1-2**: 效能優化
- [ ] CDN 快取策略
- [ ] 圖片預載入
- [ ] 縮圖優先載入

**Day 3-4**: 監控與告警
- [ ] 上傳失敗率監控
- [ ] R2 讀取延遲監控
- [ ] 代理驗證失敗率告警

**Day 5**: 文檔與部署
- [ ] API 文檔
- [ ] 使用者指南
- [ ] Production 部署

---

## ✅ 驗收標準

### P0 核心機能
- [ ] 可上傳實體名片照片（< 5 MB, < 25 MP）
- [ ] 自動產生 2 個 variants（1200 + 256）
- [ ] 所有安全驗證層級通過（Magic Bytes + 像素檢查）
- [ ] 圖片必須透過 Session 驗證才能存取
- [ ] 撤銷名片/Session 後圖片立即無法存取
- [ ] Rate Limiting 生效（上傳 10/10min, 讀取 20/min）

### P1 增強機能
- [ ] Admin Dashboard 可管理資產版本
- [ ] 孿生狀態機正常運作（disabled → ready → stale → error）
- [ ] 軟刪除與定期清理正常運作
- [ ] 前端漸進增強載入正常

### 安全性
- [ ] 通過 OWASP 檔案上傳檢查清單
- [ ] 無法繞過 Session 驗證存取圖片
- [ ] 無法遍歷其他名片的圖片
- [ ] Rate Limiting 防止資源耗盡

### 效能
- [ ] 圖片載入時間 < 1s（1200 variant）
- [ ] 縮圖載入時間 < 300ms（256 variant）
- [ ] 上傳處理時間 < 5s

---

## 📝 下一步行動

1. **確認設計** ✅（已完成）
2. **創建 BDD 規格**（下一步）
3. **實作 Migration**
4. **實作上傳 API**
5. **實作讀取 API**
6. **整合 Admin Dashboard**
7. **測試與部署**

---

**設計版本**: v1.0  
**確認日期**: 2026-01-28  
**預計完成**: 2026-02-18（3 週）
