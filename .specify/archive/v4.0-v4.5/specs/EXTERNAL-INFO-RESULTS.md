# External Information Query Results

**Query Date**: 2026-01-18T01:43:44+08:00  
**Status**: P0 查詢完成

---

## ✅ P0 查詢結果

### 1. Cloudflare D1 Foreign Key 支援

**結論**: ✅ **完全支援**

**證據**:
- D1 支援定義和強制執行 Foreign Key Constraints
- 可在 CREATE TABLE 時定義 FOREIGN KEY
- 支援 ON DELETE CASCADE 等選項

**來源**: [Cloudflare D1 Query Documentation](https://developers.cloudflare.com/d1/best-practices/query-d1/)

**影響**: ✅ ARCH-001 Schema 設計無需修改

---

### 2. Cloudflare Workers Secrets 限制

**結論**: ⚠️ **有限制，需注意**

**限制**:
- **數量限制**: 32 個 Secrets (環境變數 + Secrets 總和)
- **大小限制**: 每個 Secret 最大 1KB (1024 bytes)

**證據**:
- 社群討論確認 1KB 限制
- 官方文件確認 32 個變數限制

**來源**: 
- [Cloudflare Community - Secrets Size](https://community.cloudflare.com/t/worker-secrets-size-limitation/229106)
- [Cloudflare Secrets Store](https://developers.cloudflare.com/secrets-store/manage-secrets/)

**影響**: 
- ✅ KEK (256-bit = 32 bytes) 遠小於 1KB
- ✅ SETUP_TOKEN (64 hex chars = 32 bytes) 遠小於 1KB
- ✅ 總共需要 2 個 Secrets，遠小於 32 個限制

---

### 3. Web Crypto API 在 Cloudflare Workers

**結論**: ✅ **完全支援 AES-GCM**

**支援的演算法**:
- ✅ AES-GCM (加密/解密)
- ✅ AES-CBC
- ✅ RSA-OAEP
- ✅ ECDSA
- ✅ HMAC

**證據**:
- Cloudflare Workers 實作完整 Web Crypto API
- `crypto.subtle` 可用於 AES-GCM 加密
- 社群有大量成功案例

**來源**: 
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Community Success Cases](https://community.cloudflare.com/t/internal-error-when-using-web-crypto/118062)

**影響**: ✅ Envelope Encryption 設計無需修改

**範例**:
```javascript
// Cloudflare Workers 中使用 AES-GCM
const key = await crypto.subtle.importKey(
  'raw',
  keyData,
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt']
);

const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  data
);
```

---

### 4. NFC URL 長度限制

**結論**: ✅ **足夠容納設計的 URL**

**NTAG 晶片容量**:
| 晶片型號 | 用戶記憶體 | 最大 URL 長度 |
|----------|-----------|---------------|
| NTAG213 | 144 bytes | **136 chars** |
| NTAG215 | 504 bytes | 488 chars |
| NTAG216 | 888 bytes | 868 chars |

**我們的 URL 長度**:
```
https://db-card.example.com/tap?uuid=550e8400-e29b-41d4-a716-446655440000
```
- 基礎 URL: `https://db-card.example.com/tap?uuid=` (40 chars)
- UUID: 36 chars
- **總計**: 76 chars

**來源**: [Seritag NFC Chip Comparison](https://seritag.com/learn/tech/chips/ntag213-v-ntag216)

**影響**: 
- ✅ NTAG213 (136 chars) 足夠使用
- ✅ 有 60 chars 餘裕空間
- ✅ 可支援更長的網域名稱

**建議**: 使用 NTAG213 (最常見且便宜)

---

## 📊 P1 查詢結果

### 5. Cloudflare KV Rate Limiting

**結論**: ⚠️ **可用但有限制**

**最終一致性**:
- 新 key-value 立即可用
- 值變更可能需要 **最多 60 秒** 傳播到所有邊緣節點

**影響 Rate Limiting**:
- ❌ 不適合嚴格的 Rate Limiting (可能被繞過)
- ✅ 適合寬鬆的防濫用機制

**替代方案**: Cloudflare Durable Objects
- ✅ 強一致性
- ✅ 適合 Rate Limiting
- ❌ 額外費用

**來源**: 
- [Cloudflare KV FAQ](https://developers.cloudflare.com/kv/reference/faq/)
- [Community Discussion](https://community.cloudflare.com/t/cloudflare-workers-kv-and-rate-limiting/137207)

**建議**: 
- Phase 1: 使用 KV (簡單實作)
- Phase 2: 升級 Durable Objects (嚴格限制)

---

## 🎯 設計決策更新

### 需要調整的設計

#### 1. Rate Limiting 策略
**原設計**: 使用 KV 實作嚴格 Rate Limiting

**調整後**:
```javascript
// Phase 1: KV 寬鬆限制 (60秒延遲容忍)
const key = `ratelimit:${card_uuid}:${Math.floor(Date.now() / 60000)}`;
const count = parseInt(await env.KV.get(key) || '0');
if (count >= 10) { // 寬鬆限制 (原 5 改為 10)
  return new Response('Rate limit exceeded', { status: 429 });
}
await env.KV.put(key, (count + 1).toString(), { expirationTtl: 120 });

// Phase 2: Durable Objects 嚴格限制
const limiter = env.RATE_LIMITER.get(id);
const allowed = await limiter.checkLimit(card_uuid, 5, 60);
```

---

### 無需調整的設計

#### 1. Database Schema
✅ D1 完全支援 Foreign Key，無需修改

#### 2. Envelope Encryption
✅ Web Crypto API 完全支援 AES-GCM，無需修改

#### 3. NFC URL 格式
✅ NTAG213 容量足夠，無需修改

#### 4. Secrets 管理
✅ KEK + SETUP_TOKEN 遠小於限制，無需修改

---

## 📋 待查詢項目 (P2)

### 6. IndexedDB Dexie.js
- 最新版本
- Compound Index 支援
- 清理策略

### 7. GitHub Actions Wrangler
- Wrangler Action 使用
- D1 Migration 執行

### 8. GDPR 技術要求
- Article 32 加密標準
- DPIA 需求

### 9. D1 查詢效能
- 索引最佳實踐
- Query Plan 分析

### 10. Envelope Encryption 效能
- 本地 Benchmark
- 加密/解密時間

---

## ✅ 結論

**P0 查詢完成，設計可行性確認**:
1. ✅ D1 Foreign Key 支援 → Schema 無需修改
2. ✅ Workers Secrets 限制 → KEK + SETUP_TOKEN 可用
3. ✅ Web Crypto AES-GCM → Envelope Encryption 可用
4. ✅ NFC URL 長度 → NTAG213 足夠

**唯一需要調整**:
- ⚠️ Rate Limiting: Phase 1 使用 KV 寬鬆限制，Phase 2 升級 Durable Objects

**可以開始 Phase 1 實作** ✅

---

**[END OF QUERY RESULTS]**
