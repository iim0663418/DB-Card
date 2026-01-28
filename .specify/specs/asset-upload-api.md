# BDD Spec: Asset Upload API

## Feature: POST /api/assets/upload

作為管理員  
我需要上傳實體名片圖片  
以便啟用實體孿生功能

---

## Scenario 1: 成功上傳圖片

**Given** 我已登入為管理員  
**And** 我有一張有效的圖片檔案（2 MB, JPEG, 1920x1080）  
**When** 我 POST 到 `/api/assets/upload` 包含：
```json
{
  "card_uuid": "abc-123",
  "asset_type": "twin_front",
  "file": <binary>
}
```
**Then** 應返回 200 OK  
**And** 回應包含：
```json
{
  "asset_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "current_version": 1,
  "variants": {
    "detail": "assets/abc-123/twin_front/f47ac10b.../v1/1200.webp",
    "thumb": "assets/abc-123/twin_front/f47ac10b.../v1/256.webp"
  },
  "size": {
    "original": 2097152,
    "detail": 456789,
    "thumb": 12345
  }
}
```
**And** 資料庫 `assets` 表應插入 1 筆記錄  
**And** 資料庫 `asset_versions` 表應插入 1 筆記錄  
**And** R2 應包含 2 個檔案（1200.webp + 256.webp）

---

## Scenario 2: 拒絕超過大小限制的檔案

**Given** 我已登入為管理員  
**When** 我上傳一張 6 MB 的圖片  
**Then** 應返回 413 Payload Too Large  
**And** 錯誤訊息為 "File size exceeds 5 MB limit"  
**And** 不應寫入資料庫  
**And** 不應上傳至 R2

---

## Scenario 3: 拒絕無效的檔案格式

**Given** 我已登入為管理員  
**When** 我上傳一個 .exe 檔案（偽裝成 .jpg）  
**Then** 應返回 400 Bad Request  
**And** 錯誤訊息為 "Invalid file format"  
**And** Magic Bytes 驗證應失敗

---

## Scenario 4: 拒絕超過像素限制的圖片

**Given** 我已登入為管理員  
**When** 我上傳一張 8000x8000 的圖片（64 MP）  
**Then** 應返回 400 Bad Request  
**And** 錯誤訊息為 "Image exceeds 25 megapixels limit"

---

## Scenario 5: 拒絕未授權的請求

**Given** 我未登入  
**When** 我嘗試上傳圖片  
**Then** 應返回 401 Unauthorized  
**And** 不應處理檔案

---

## Scenario 6: 上傳 Rate Limiting

**Given** 我已登入為管理員  
**And** 我在 10 分鐘內已上傳 10 張圖片  
**When** 我嘗試上傳第 11 張圖片  
**Then** 應返回 429 Too Many Requests  
**And** 錯誤訊息為 "Upload rate limit exceeded. Try again in X minutes"

---

## Scenario 7: 更新現有資產（版本控制）

**Given** 我已登入為管理員  
**And** card_uuid "abc-123" 已有 twin_front 資產（v1）  
**When** 我上傳新的 twin_front 圖片  
**Then** 應返回 200 OK  
**And** `current_version` 應為 2  
**And** 舊版本（v1）應標記 `soft_deleted_at`  
**And** R2 應包含 v1 和 v2 兩個版本

---

## Scenario 8: 自動產生 Variants

**Given** 我已登入為管理員  
**When** 我上傳一張 3000x2000 的圖片  
**Then** 應自動產生 2 個 variants：
- detail: 1200x800 (保持比例)
- thumb: 256x171 (保持比例)
**And** 格式應為 WebP  
**And** 品質應為 85% (detail) 和 80% (thumb)

---

## Acceptance Criteria

### 檔案驗證
- [x] 檔案大小 ≤ 5 MB
- [x] 格式限制：JPEG, PNG, WebP
- [x] Magic Bytes 驗證
- [x] 像素限制 ≤ 25 MP
- [x] 最小尺寸 ≥ 800x800

### 安全性
- [x] 管理員認證（HttpOnly Cookie）
- [x] Rate Limiting（10 張 / 10 分鐘）
- [x] 檔名安全化（UUID）
- [x] EXIF 資料清除

### 資料庫
- [x] 插入 `assets` 表
- [x] 插入 `asset_versions` 表
- [x] 版本控制（軟刪除舊版本）
- [x] 外鍵約束驗證

### R2 儲存
- [x] 版本化 key 格式
- [x] 2 個 variants（1200 + 256）
- [x] WebP 格式
- [x] 正確的 Content-Type

### 效能
- [x] 處理時間 < 5s
- [x] 壓縮率 > 50%
- [x] 並行處理 variants

---

## Technical Notes

### Magic Bytes 驗證
```typescript
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  webp: [0x52, 0x49, 0x46, 0x46] // RIFF
};
```

### R2 Key 格式
```
assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{variant}.webp
```

### Rate Limiting Key
```
upload_rate:{email}:{ip}
TTL: 600 seconds (10 minutes)
Max: 10 uploads
```
