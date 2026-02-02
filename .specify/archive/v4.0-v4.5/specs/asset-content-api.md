# BDD Spec: Asset Content API (Read with Transform)

## Feature: GET /api/assets/:asset_id/content

作為使用者  
我需要讀取實體名片圖片  
並自動轉換為適當的尺寸與格式

---

## Scenario 1: 成功讀取圖片（detail variant）

**Given** 資產 "abc-123" 存在於 R2  
**And** 我有有效的 Session  
**When** 我 GET 到 `/api/assets/abc-123/content?variant=detail&card_uuid=xyz&session=valid-session`  
**Then** 應返回 200 OK  
**And** Content-Type 應為 `image/webp`  
**And** 圖片應自動轉換為 1200x1200 WebP（quality 85）  
**And** Cache-Control 應為 `public, max-age=86400, immutable`

---

## Scenario 2: 成功讀取縮圖（thumb variant）

**Given** 資產 "abc-123" 存在於 R2  
**And** 我有有效的 Session  
**When** 我 GET 到 `/api/assets/abc-123/content?variant=thumb&card_uuid=xyz&session=valid-session`  
**Then** 應返回 200 OK  
**And** 圖片應自動轉換為 256x256 WebP（quality 80）

---

## Scenario 3: 拒絕無效 Session

**Given** 資產 "abc-123" 存在於 R2  
**When** 我 GET 到 `/api/assets/abc-123/content` 但 Session 無效  
**Then** 應返回 401 Unauthorized  
**And** 不應讀取 R2

---

## Scenario 4: 拒絕過期 Session

**Given** 資產 "abc-123" 存在於 R2  
**And** Session 已過期（> 24h）  
**When** 我嘗試讀取圖片  
**Then** 應返回 401 Unauthorized  
**And** 錯誤訊息為 "Session expired"

---

## Scenario 5: 拒絕超過併發限制

**Given** 資產 "abc-123" 存在於 R2  
**And** Session 已達到 max_reads 限制  
**When** 我嘗試讀取圖片  
**Then** 應返回 429 Too Many Requests  
**And** 錯誤訊息為 "Concurrent read limit exceeded"

---

## Scenario 6: 圖片 Rate Limiting

**Given** 我有有效的 Session  
**And** 我在 1 分鐘內已讀取 20 張圖片  
**When** 我嘗試讀取第 21 張圖片  
**Then** 應返回 429 Too Many Requests  
**And** 錯誤訊息為 "Image rate limit exceeded"

---

## Scenario 7: 資產不存在

**Given** 資產 "non-existent" 不存在於資料庫  
**When** 我嘗試讀取圖片  
**Then** 應返回 404 Not Found  
**And** 錯誤訊息為 "Asset not found"

---

## Scenario 8: R2 檔案不存在

**Given** 資產 "abc-123" 存在於資料庫  
**But** R2 檔案已被刪除  
**When** 我嘗試讀取圖片  
**Then** 應返回 404 Not Found  
**And** 錯誤訊息為 "Image not found"

---

## Scenario 9: R2 Transform on Read

**Given** 原始檔案為 3000x2000 JPEG (2 MB)  
**When** 我讀取 detail variant  
**Then** R2 應自動轉換為：
- 尺寸: 1200x800 (保持比例)
- 格式: WebP
- 品質: 85%
- EXIF: 已清除
- 預期大小: ~700 KB (壓縮 65%)

**When** 我讀取 thumb variant  
**Then** R2 應自動轉換為：
- 尺寸: 256x171 (保持比例)
- 格式: WebP
- 品質: 80%
- 預期大小: ~160 KB (壓縮 92%)

---

## Acceptance Criteria

### Session 驗證
- [x] 驗證 Session 存在
- [x] 驗證 card_uuid 匹配
- [x] 驗證 Session 未過期
- [x] 驗證併發讀取限制

### Rate Limiting
- [x] 每 Session 每分鐘最多 20 次圖片請求
- [x] 使用 KV 儲存計數器
- [x] TTL 60 秒

### R2 Transform
- [x] detail: 1200x1200, quality 85, WebP
- [x] thumb: 256x256, quality 80, WebP
- [x] 保持比例（fit=scale-down）
- [x] 自動清除 EXIF

### 快取
- [x] Cache-Control: public, max-age=86400, immutable
- [x] 瀏覽器快取 24 小時
- [x] CDN 快取生效

### 安全性
- [x] 必須有有效 Session
- [x] 撤銷名片/Session → 立即無法存取
- [x] 無法遍歷其他名片圖片

---

## Technical Notes

### R2 Transform URL 格式
```
https://r2.example.com/{key}?width=1200&height=1200&fit=scale-down&quality=85&format=webp
```

### Rate Limiting Key
```
img_rate:{session_id}
TTL: 60 seconds
Max: 20 requests
```

### 安全語意
```
與 /api/read 完全一致：
- Session 驗證
- 併發限制
- 撤銷機制
```
