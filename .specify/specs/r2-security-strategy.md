# R2 安全防護策略

基於外部研究與 OWASP 最佳實踐 (2026-01-28)

## 威脅模型

### 潛在攻擊
1. **遍歷攻擊**: 猜測檔名存取其他名片照片
2. **盜連攻擊**: 其他網站直接引用圖片
3. **列舉攻擊**: 嘗試列出所有檔案
4. **DDoS 攻擊**: 大量請求消耗資源

---

## 防護策略（多層防禦）

### Layer 1: 不使用公開 Bucket ✅

**原則**: 永不啟用 R2 Public Bucket

```bash
# ❌ 不要執行
wrangler r2 bucket update db-card-physical-images-staging --public-access

# ✅ 保持私有
# 所有存取必須透過 Workers API
```

**優勢**:
- 無法直接存取 R2 URL
- 無法列舉檔案
- 完全控制存取邏輯

---

### Layer 2: UUID 檔名 + 不可預測路徑 ✅

**檔名格式**:
```typescript
// ❌ 可預測
card-123-front.jpg
audrey-tang-front.jpg

// ✅ 不可預測
f47ac10b-58cc-4372-a567-0e02b2c3d479-front.webp
a3d5e8f2-9b1c-4d6e-8f2a-1c3b5d7e9f0a-back.webp
```

**實作**:
```typescript
function generateSecureKey(cardUuid: string, side: 'front' | 'back'): string {
  const imageUuid = crypto.randomUUID();
  return `cards/${cardUuid}/${imageUuid}-${side}.webp`;
}

// 範例: cards/abc-123/f47ac10b-front.webp
```

**優勢**:
- 無法從 card_uuid 推測圖片 URL
- 無法遍歷其他名片照片
- 每次上傳生成新 UUID

---

### Layer 3: Workers 代理存取 ✅

**架構**:
```
使用者 → Workers API → R2 (私有)
       ↓
    驗證 Session
```

**API 端點**:
```typescript
// GET /api/physical-card/:card_uuid/:side
// 需要有效的 ReadSession

async function handlePhysicalCardImage(request: Request, env: Env) {
  const { card_uuid, side } = params;
  const session_id = new URL(request.url).searchParams.get('session');
  
  // 1. 驗證 Session
  const session = await getSession(env, session_id);
  if (!session || session.card_uuid !== card_uuid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. 檢查 Session 是否過期
  if (new Date(session.expires_at) < new Date()) {
    return new Response('Session expired', { status: 401 });
  }
  
  // 3. 檢查併發讀取限制
  if (session.current_reads >= session.max_reads) {
    return new Response('Concurrent read limit exceeded', { status: 429 });
  }
  
  // 4. 從資料庫讀取圖片 URL
  const card = await env.DB.prepare(
    'SELECT physical_card_front_url, physical_card_back_url FROM cards WHERE card_uuid = ?'
  ).bind(card_uuid).first();
  
  if (!card) {
    return new Response('Card not found', { status: 404 });
  }
  
  const imageKey = side === 'front' ? card.physical_card_front_url : card.physical_card_back_url;
  if (!imageKey) {
    return new Response('Image not found', { status: 404 });
  }
  
  // 5. 從 R2 讀取圖片
  const object = await env.PHYSICAL_CARDS.get(imageKey);
  if (!object) {
    return new Response('Image not found', { status: 404 });
  }
  
  // 6. 返回圖片（帶快取）
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=86400', // 24 小時
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
```

**優勢**:
- 必須有有效 Session 才能存取
- 繼承現有的授權機制（24h TTL, 併發限制）
- 無法繞過驗證直接存取 R2

---

### Layer 4: Rate Limiting ✅

**限制規則**:
```typescript
// 每個 Session 每分鐘最多 10 次圖片請求
const RATE_LIMIT = {
  window: 60, // 秒
  max: 10     // 次數
};

async function checkImageRateLimit(env: Env, session_id: string): Promise<boolean> {
  const key = `img_rate:${session_id}`;
  const count = await env.KV.get(key);
  
  if (count && parseInt(count) >= RATE_LIMIT.max) {
    return false;
  }
  
  await env.KV.put(
    key,
    String((count ? parseInt(count) : 0) + 1),
    { expirationTtl: RATE_LIMIT.window }
  );
  
  return true;
}
```

---

### Layer 5: Referer 檢查（選配）

**防止盜連**:
```typescript
function checkReferer(request: Request): boolean {
  const referer = request.headers.get('referer');
  const allowedDomains = [
    'db-card.example.com',
    'db-card-staging.csw30454.workers.dev'
  ];
  
  if (!referer) {
    return false; // 拒絕無 Referer 的請求
  }
  
  const refererDomain = new URL(referer).hostname;
  return allowedDomains.some(domain => refererDomain.includes(domain));
}
```

---

### Layer 6: 簽名 URL（進階）

**時效性 URL**:
```typescript
// 生成帶簽名的臨時 URL
function generateSignedUrl(
  cardUuid: string,
  side: string,
  expiresIn: number = 3600
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const data = `${cardUuid}:${side}:${expires}`;
  
  // 使用 HMAC-SHA256 簽名
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getSigningKey(),
    new TextEncoder().encode(data)
  );
  
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `/api/physical-card/${cardUuid}/${side}?expires=${expires}&sig=${encodeURIComponent(sig)}`;
}

// 驗證簽名
async function verifySignedUrl(
  cardUuid: string,
  side: string,
  expires: number,
  signature: string
): Promise<boolean> {
  // 檢查過期
  if (Math.floor(Date.now() / 1000) > expires) {
    return false;
  }
  
  // 驗證簽名
  const data = `${cardUuid}:${side}:${expires}`;
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    await getSigningKey(),
    new TextEncoder().encode(data)
  );
  
  return signature === btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
}
```

---

## 推薦配置（分階段）

### Phase 1: 基礎防護（立即實作）
```
✅ Layer 1: 私有 Bucket（不啟用 Public Access）
✅ Layer 2: UUID 檔名（不可預測）
✅ Layer 3: Workers 代理（Session 驗證）
```

### Phase 2: 增強防護（短期）
```
✅ Layer 4: Rate Limiting（每 Session 每分鐘 10 次）
```

### Phase 3: 進階防護（可選）
```
⏳ Layer 5: Referer 檢查（防盜連）
⏳ Layer 6: 簽名 URL（時效性存取）
```

---

## 實作範例

### 完整 API Handler
```typescript
export async function handlePhysicalCardImage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const { card_uuid, side } = parseParams(url.pathname);
  const session_id = url.searchParams.get('session');
  
  // === Layer 3: Session 驗證 ===
  if (!session_id) {
    return new Response('Missing session', { status: 401 });
  }
  
  const session = await getSession(env, session_id);
  if (!session || session.card_uuid !== card_uuid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  if (new Date(session.expires_at) < new Date()) {
    return new Response('Session expired', { status: 401 });
  }
  
  if (session.current_reads >= session.max_reads) {
    return new Response('Concurrent read limit exceeded', { status: 429 });
  }
  
  // === Layer 4: Rate Limiting ===
  const allowed = await checkImageRateLimit(env, session_id);
  if (!allowed) {
    return new Response('Rate limited', { status: 429 });
  }
  
  // === Layer 5: Referer 檢查（選配）===
  // if (!checkReferer(request)) {
  //   return new Response('Invalid referer', { status: 403 });
  // }
  
  // === 讀取圖片 ===
  const card = await env.DB.prepare(
    'SELECT physical_card_front_url, physical_card_back_url FROM cards WHERE card_uuid = ?'
  ).bind(card_uuid).first();
  
  if (!card) {
    return new Response('Card not found', { status: 404 });
  }
  
  const imageKey = side === 'front' 
    ? card.physical_card_front_url 
    : card.physical_card_back_url;
    
  if (!imageKey) {
    return new Response('Image not available', { status: 404 });
  }
  
  // === 從 R2 讀取 ===
  const object = await env.PHYSICAL_CARDS.get(imageKey);
  if (!object) {
    return new Response('Image not found', { status: 404 });
  }
  
  // === 返回圖片 ===
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  });
}
```

---

## 安全檢查清單

### 配置階段
- [ ] R2 Bucket 保持私有（不啟用 Public Access）
- [ ] 不使用 r2.dev 公開域名
- [ ] 配置 CORS 白名單

### 上傳階段
- [ ] UUID 檔名生成
- [ ] 檔案路徑包含 card_uuid（隔離）
- [ ] 儲存 R2 key 至資料庫（不暴露）

### 存取階段
- [ ] 必須有有效 Session
- [ ] Session 驗證（TTL + 併發限制）
- [ ] Rate Limiting（每分鐘 10 次）
- [ ] Referer 檢查（選配）
- [ ] 簽名 URL（選配）

### 監控階段
- [ ] 審計日誌記錄存取
- [ ] 異常流量告警
- [ ] 定期安全審查

---

## 參考資料

**內容已依照授權要求重新表述**

1. **Cloudflare R2 官方文檔** - 建議使用 Presigned URLs 而非公開 Bucket 提供匿名存取
2. **安全研究** - R2 錯誤配置可能導致未授權存取，應避免公開 Bucket
3. **最佳實踐** - 透過 Workers 代理存取，結合 CORS 與 Referer 檢查防止盜連

---

## 推薦方案

**Phase 1 (立即實作)**:
```
✅ 私有 Bucket
✅ UUID 檔名
✅ Workers 代理 + Session 驗證
✅ Rate Limiting
```

**成本**: $0/月  
**安全等級**: 高  
**實作複雜度**: 低
