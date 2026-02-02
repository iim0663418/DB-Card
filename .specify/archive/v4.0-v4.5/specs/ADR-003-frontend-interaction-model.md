# Architecture Decision Record: Frontend Interaction Model

**ADR ID**: ADR-003  
**Status**: ACCEPTED  
**Date**: 2026-01-18T01:37:22+08:00  
**Supersedes**: 部分 ARCH-001 前端設計  
**Related**: ADR-002 (Security Architecture)

---

## Context

前端與後端的互動流程需要明確定義，特別是：
1. NFC URL 格式與環境管理
2. `/tap` 與 `/read` 的責任邊界
3. session_id 的傳遞與儲存策略
4. 交換歷史的設計與隱私保護

---

## Decision

### 1. NFC URL 格式（最終定案）

#### 1.1 固定單一正式網域
```
NFC 寫入內容: https://db-card.example.com/tap?uuid={card_uuid}
```

**關鍵原則**:
- ✅ 固定單一正式網域
- ❌ NFC 不承擔環境資訊 (dev/staging/prod)
- ✅ 環境切換僅存在於後端與部署流程

**理由**:
- NFC 卡片一旦寫入無法輕易更改
- 環境切換應由後端路由處理，非 NFC 內容
- 簡化 NFC 內容，降低錯誤風險

---

### 2. `/tap` 責任邊界（再次收斂）

#### 2.1 `/tap` 不回傳任何名片資料

**職責**:
1. 驗證 `card_uuid` 存在性
2. 簽發 ReadSession
3. 回傳「交換成功頁（HTML Shell）」

**回應格式**:
```html
HTTP 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
  <title>交換成功</title>
</head>
<body>
  <h1>✅ 名片交換成功</h1>
  <p>有效期限: <span id="expires">2026-01-19 01:37</span></p>
  <p>剩餘回看次數: <span id="remaining">20</span></p>
  
  <script>
    // session_id 透過 URL fragment 傳遞
    const sid = window.location.hash.substring(1);
    // 儲存到 IndexedDB
    await saveSession(sid);
    // 清除 fragment
    history.replaceState(null, '', window.location.pathname);
    // 載入名片資料
    await loadCard();
  </script>
</body>
</html>
```

**不做的事**:
- ❌ 不回傳名片資料
- ❌ 不執行解密
- ❌ 不處理多語言名片內容

---

### 3. `/tap` → `/read` 前端互動模式（新增定案）

#### 3.1 顯示策略
```
1. /tap 先顯示「交換成功頁」
   ├─ 可回看到期時間 (expires_at)
   └─ 剩餘回看次數 (remaining_reads)

2. 前端自動呼叫 /read 載入名片資料
   └─ /read 為唯一資料來源與錯誤判斷點
```

#### 3.2 資料載入統一入口
- ✅ 所有名片內容一律由 `/read` 取得
- ✅ `/read` 為唯一資料來源與錯誤判斷點
- ✅ 支援完整多語系錯誤處理

---

### 4. session_id 傳遞與落地流程（最終定案）

#### 4.1 使用 URL Fragment 傳遞
```
/tap 回應: 
Location: /tap?uuid=xxx#session_id_here

理由:
- ✅ Fragment 不進入 server log
- ✅ Fragment 不進入 Referer header
- ✅ 僅客戶端可見
```

#### 4.2 前端流程（固定順序）
```javascript
// 1. 讀取 fragment
const sid = window.location.hash.substring(1); // 移除 #

// 2. 寫入 IndexedDB
await db.active_sessions.put({
  session_id: sid,
  card_uuid: uuid,
  expires_at: expiresAt,
  max_reads: maxReads,
  reads_used: 0
});

// 3. 清除 fragment（安全措施）
history.replaceState(null, '', window.location.pathname + window.location.search);

// 4. 呼叫 /read
const card = await fetch(`/api/read?uuid=${uuid}&session=${sid}`);
```

---

### 5. session_id 本機儲存策略（新增定案）

#### 5.1 採用 IndexedDB（不使用 LocalStorage）

**理由**:
- ✅ 支援結構化資料
- ✅ 支援索引查詢
- ✅ 容量更大（無 5MB 限制）
- ✅ 支援事務操作

#### 5.2 雙層模型（最終定案）

**A. active_sessions（授權層）**
```javascript
{
  session_id: "sess_abc123",
  card_uuid: "card-uuid-here",
  expires_at: 1737244642000,
  max_reads: 20,
  reads_used: 5,
  created_at: 1737158242000
}
```
- **用途**: 僅存未過期 ReadSession
- **作用**: 「是否可回看」的唯一依據
- **清理**: 即時清理過期 session

**B. exchange_history（回憶層）**
```javascript
{
  id: "history_001",
  card_uuid: "card-uuid-here",
  exchanged_at: 1737158242000,
  snapshot: {
    name: "張三",
    title: "工程師",
    department: "技術部"
    // ❌ 不含聯絡資訊
    // ❌ 不含 session_id
  },
  revoked: false
}
```
- **用途**: 保留最近 7 天交換記錄
- **作用**: 「曾交換過」的歷史紀錄
- **清理**: 7 天後自動刪除 + max 200 筆

---

### 6. 交換歷史（exchange_history）設計（新增定案）

#### 6.1 定位與隱私保護
- ✅ 提升使用者回憶與管理體驗
- ✅ 不提供任何解密或回看能力
- ✅ 即使外洩，也不構成名片資料暴露

#### 6.2 寫入條件
```javascript
// ✅ 僅在 /read 成功後寫入
if (readSuccess) {
  await db.exchange_history.put({
    card_uuid: uuid,
    exchanged_at: Date.now(),
    snapshot: {
      name: card.name,
      title: card.title,
      department: card.department
      // ❌ 不含 email, phone, mobile
    }
  });
}

// ❌ /tap 成功但 /read 失敗不寫入
```

#### 6.3 內容範圍（嚴格限制）
**允許儲存**:
- ✅ 姓名
- ✅ 職稱
- ✅ 部門/組織

**禁止儲存**:
- ❌ Email
- ❌ 電話號碼
- ❌ 手機號碼
- ❌ 地址
- ❌ 社群連結
- ❌ session_id
- ❌ token

#### 6.4 保留與清理策略
```javascript
// active_sessions: 即時清理過期
await db.active_sessions
  .where('expires_at').below(Date.now())
  .delete();

// exchange_history: 7 天 + 最多 200 筆
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
await db.exchange_history
  .where('exchanged_at').below(sevenDaysAgo)
  .delete();

const count = await db.exchange_history.count();
if (count > 200) {
  const oldest = await db.exchange_history
    .orderBy('exchanged_at')
    .limit(count - 200)
    .delete();
}
```

---

### 7. 撤銷與歷史的一致性（補充）

#### 7.1 撤銷行為對歷史的影響
```javascript
// 再次碰卡撤銷「最近 1 筆」ReadSession
if (shouldRevoke) {
  // 1. active_sessions 立即失效並刪除
  await db.active_sessions
    .where('session_id').equals(lastSession.session_id)
    .delete();
  
  // 2. exchange_history 保留，但標記為「已撤銷」
  await db.exchange_history
    .where('card_uuid').equals(card_uuid)
    .and(h => h.exchanged_at === lastSession.issued_at)
    .modify({ revoked: true });
}
```

**顯示邏輯**:
```javascript
// 交換歷史列表
history.forEach(h => {
  if (h.revoked) {
    // 顯示為灰色 + 「已撤銷」標籤
    renderRevokedHistory(h);
  } else {
    renderNormalHistory(h);
  }
});
```

---

### 8. Admin Setup Endpoint（最終補強定案）

#### 8.1 存在條件（prod 可用）
```javascript
// GET /api/admin/setup
if (await db.admin_users.count() > 0) {
  return new Response('Setup already completed', { status: 403 });
}

const setupToken = request.headers.get('X-Setup-Token');
if (setupToken !== env.SETUP_TOKEN) {
  return new Response('Invalid setup token', { status: 401 });
}

// 允許 setup
```

#### 8.2 setup_token 有效期策略
- ✅ 不設時間到期
- ✅ 直到成功 setup 才失效
- ✅ 必須人工嚴格隔離保管（建議分割保管）

**生成方式**:
```bash
# 生成 setup_token (僅一次)
openssl rand -hex 32 > setup_token.txt

# 上傳到 Cloudflare Secrets
wrangler secret put SETUP_TOKEN < setup_token.txt

# 分割保管（建議）
split -n 2 setup_token.txt token_part_
# token_part_aa -> 保管人 A
# token_part_ab -> 保管人 B

# 使用時合併
cat token_part_* > setup_token_recovered.txt
```

#### 8.3 Setup 流程
```javascript
// POST /api/admin/setup
{
  "username": "admin",
  "password": "temporary_password_123",
  "setup_token": "hex_string_here"
}

// 回應
{
  "success": true,
  "message": "Admin created. Please login and change password immediately.",
  "force_password_change": true
}
```

---

## Consequences

### Positive
- ✅ NFC URL 固定，無環境切換問題
- ✅ `/tap` 與 `/read` 責任清晰分離
- ✅ session_id 透過 fragment 傳遞，不進 log
- ✅ IndexedDB 雙層模型，授權與歷史分離
- ✅ exchange_history 即使外洩也不暴露聯絡資訊
- ✅ 撤銷行為保留歷史記錄，提升透明度

### Negative
- ⚠️ IndexedDB 操作複雜度高於 LocalStorage
- ⚠️ 需要額外實作清理邏輯（7 天 + 200 筆）
- ⚠️ setup_token 分割保管增加管理成本

### Risks
- 🟡 IndexedDB 在某些瀏覽器可能被清除（需提示用戶）
- 🟡 fragment 傳遞 session_id 可能被瀏覽器擴充套件讀取

---

## Implementation Notes

### API 端點更新
```
POST /api/nfc/tap?uuid={uuid}
  → 回傳 HTML Shell + fragment (#session_id)

GET /api/read?uuid={uuid}&session={session_id}
  → 回傳名片 JSON 資料
```

### IndexedDB Schema
```javascript
const db = new Dexie('DBCardStorage');
db.version(1).stores({
  active_sessions: 'session_id, card_uuid, expires_at',
  exchange_history: '++id, card_uuid, exchanged_at, revoked'
});
```

---

## 一句話總結

> NFC 碰卡不是資料載體，而是一次性、可撤銷、可回看的授權觸發器；  
> 本機只記得「曾經交換過誰」，真正能看的權限只活 24 小時。

---

**[END OF ADR-003]**
