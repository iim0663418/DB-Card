# Asset Upload API Implementation

**Created:** 2026-01-28
**BDD Spec:** `.specify/specs/asset-upload-api.md`

## Overview

實作完整的 Asset Upload API，支援實體名片圖片上傳、驗證、處理與儲存。

## Files Created

### 1. `workers/src/utils/image-validator.ts`
圖片驗證工具，提供：
- `verifyMagicBytes()` - Magic bytes 驗證（JPEG/PNG/WebP）
- `validateFileSize()` - 檔案大小驗證（≤ 5 MB）
- `validateImageDimensions()` - 尺寸與像素驗證（≥ 800x800, ≤ 25 MP）

### 2. `workers/src/utils/image-processor.ts`
圖片處理工具，提供：
- `generateR2Key()` - 產生版本化 R2 key
- 支援 2 種 variants：
  - `detail`: 1200x1200, quality 85%
  - `thumb`: 256x256, quality 80%
- 輸出格式：WebP

### 3. `workers/src/handlers/admin/assets.ts`
主要上傳處理器，實作所有 8 個 BDD scenarios：

#### Scenario 1: 成功上傳
- 完整驗證流程
- 並行產生 2 個 variants
- 寫入資料庫（assets + asset_versions）
- 上傳至 R2
- 返回完整回應

#### Scenario 2: 拒絕超大檔案
- 檔案大小 > 5 MB → 413 Payload Too Large

#### Scenario 3: 拒絕無效格式
- Magic bytes 驗證失敗 → 400 Bad Request

#### Scenario 4: 拒絕超像素圖片
- 像素 > 25 MP → 400 Bad Request

#### Scenario 5: 拒絕未授權請求
- 使用 `verifySetupToken()` 中間件
- 未授權 → 401 Unauthorized

#### Scenario 6: Rate Limiting
- 限制：10 uploads / 10 分鐘（per email+IP）
- 超限 → 429 Too Many Requests
- KV key: `upload_rate:{email}:{ip}`

#### Scenario 7: 版本控制
- 檢查現有資產
- 軟刪除舊版本（`soft_deleted_at`）
- 遞增版本號
- R2 保留所有版本

#### Scenario 8: 自動產生 Variants
- 並行處理 2 個 variants
- 保持比例縮放
- WebP 格式輸出

## Files Modified

### 1. `workers/src/types.ts`
新增類型定義：
```typescript
export type AssetType = 'twin_front' | 'twin_back' | 'avatar';
export type AssetStatus = 'ready' | 'stale' | 'error';

export interface Asset { ... }
export interface AssetVersion { ... }
export interface AssetUploadResponse { ... }
```

### 2. `workers/src/index.ts`
新增路由：
```typescript
// Line 7: Import handler
import { handleAssetUpload } from './handlers/admin/assets';

// Line 374: Add route
if (url.pathname === '/api/admin/assets/upload' && request.method === 'POST') {
  return handleAssetUpload(request, env);
}
```

## API Endpoint

### POST /api/admin/assets/upload

**Authentication:** Admin token (Cookie or Authorization header)

**Request:** `multipart/form-data`
```
card_uuid: string (UUID)
asset_type: 'twin_front' | 'twin_back' | 'avatar'
file: File (JPEG/PNG/WebP, ≤ 5 MB)
```

**Response:** `200 OK`
```json
{
  "asset_id": "uuid",
  "current_version": 1,
  "variants": {
    "detail": "assets/.../v1/1200.webp",
    "thumb": "assets/.../v1/256.webp"
  },
  "size": {
    "original": 2097152,
    "detail": 456789,
    "thumb": 12345
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid format/dimensions
- `401 Unauthorized` - Not authenticated
- `413 Payload Too Large` - File too large
- `429 Too Many Requests` - Rate limit exceeded

## Database Schema

使用現有 migration `0013_physical_card_twin.sql`：

### assets 表
- `asset_id` (PK)
- `card_uuid` (FK to cards)
- `asset_type` (twin_front/twin_back/avatar)
- `current_version`
- `r2_key_prefix`
- `status` (ready/stale/error)

### asset_versions 表
- `asset_id, version` (PK)
- `size_original, size_detail, size_thumb`
- `soft_deleted_at` (for cleanup)

## R2 Storage

**Bucket:** `env.PHYSICAL_CARDS`

**Key Format:**
```
assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{size}.webp
```

**Example:**
```
assets/abc-123/twin_front/f47ac10b-58cc.../v1/1200.webp
assets/abc-123/twin_front/f47ac10b-58cc.../v1/256.webp
```

## Security Features

✅ **Authentication** - Admin token required
✅ **Rate Limiting** - 10 uploads/10min per email+IP
✅ **Magic Bytes** - Prevent file type spoofing
✅ **CSRF Protection** - Via existing middleware
✅ **File Size Limit** - 5 MB maximum
✅ **Pixel Limit** - 25 megapixels maximum
✅ **EXIF Stripping** - Metadata removed (via WebP conversion)

## Performance

- **並行處理** - 2 variants 同時上傳
- **預期壓縮率** - > 50% (WebP)
- **目標處理時間** - < 5 seconds

## Testing

執行以下指令進行 TypeScript 類型檢查：
```bash
cd workers
npm run typecheck
```

或使用 Wrangler dry-run：
```bash
npx wrangler deploy --dry-run
```

## Next Steps

1. 執行資料庫 migration（如果尚未執行）
2. 配置 R2 bucket `PHYSICAL_CARDS`
3. 測試 API endpoint
4. 實作前端上傳介面
5. 新增 asset 清理 cron job（清理軟刪除版本）

## Compliance

✅ 所有 8 個 BDD scenarios 已實作
✅ 使用現有 middleware（auth, rate limit）
✅ 錯誤處理清晰明確
✅ 代碼最小化（避免冗長）
✅ TypeScript 類型完整
