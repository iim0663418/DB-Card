# R2 Staging 環境配置完成

## 配置內容

### 1. R2 Buckets 創建
```bash
✅ db-card-physical-images-staging (Standard storage)
✅ db-card-physical-images-preview (Standard storage)
```

### 2. wrangler.toml 配置
```toml
[[r2_buckets]]
binding = "PHYSICAL_CARDS"
bucket_name = "db-card-physical-images-staging"
preview_bucket_name = "db-card-physical-images-preview"
```

### 3. TypeScript 類型定義
```typescript
export interface Env {
  // ... 其他綁定
  PHYSICAL_CARDS: R2Bucket;
}
```

---

## 驗證結果

### Dry-run 部署測試
```
✅ Total Upload: 818.98 KiB / gzip: 149.96 KiB
✅ env.PHYSICAL_CARDS (db-card-physical-images-staging) - R2 Bucket
```

---

## 使用方式

### 上傳檔案
```typescript
async function uploadImage(env: Env, key: string, buffer: ArrayBuffer) {
  await env.PHYSICAL_CARDS.put(key, buffer, {
    httpMetadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });
}
```

### 讀取檔案
```typescript
async function getImage(env: Env, key: string) {
  const object = await env.PHYSICAL_CARDS.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
```

### 刪除檔案
```typescript
async function deleteImage(env: Env, key: string) {
  await env.PHYSICAL_CARDS.delete(key);
}
```

---

## 下一步

1. ✅ R2 配置完成
2. ⏳ 實作圖片上傳 API
3. ⏳ 實作安全驗證邏輯
4. ⏳ 資料庫 Migration
5. ⏳ Admin Dashboard 整合

---

## 成本估算

**免費額度**（每月）:
- 儲存: 10 GB
- Class A 操作: 100 萬次
- Class B 操作: 1000 萬次
- Egress: 完全免費

**預估使用**（100 張名片）:
- 儲存: 0.1 GB (200 張照片 × 500 KB)
- 上傳: 200 次
- 讀取: 20,000 次/月

**成本**: $0/月 ✅
