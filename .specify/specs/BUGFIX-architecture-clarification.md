# [BUGFIX] User Self-Revoke Feature - 架構澄清

**Date**: 2026-01-20
**Issue**: 文檔中錯誤提到需要 Migration 0010 來添加 `revoked_at` 欄位
**Resolution**: 澄清架構並更新文檔

---

## 問題描述

實作摘要文檔（`user-self-revoke-implementation-summary.md`）中提到：
- Migration 0010 需要添加 `uuid_bindings.revoked_at` 欄位
- 暗示需要新增此欄位來支援用戶自助撤銷功能

**這是錯誤的理解！**

---

## 正確的架構理解

### 1. revoked_at 欄位已存在

**Migration 0004** (`0004_uuid_bindings_v2.sql`) 已經定義了完整的 `uuid_bindings` 表結構：

```sql
CREATE TABLE uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('official', 'temporary', 'event')),
  status TEXT NOT NULL CHECK (status IN ('bound', 'revoked', 'quarantine')),
  bound_email TEXT,
  bound_at INTEGER,
  created_ip TEXT,
  created_user_agent TEXT,
  revoked_at INTEGER,          -- ✅ 已存在
  revoke_reason TEXT,
  quarantine_until INTEGER
);
```

- `revoked_at` 欄位在第 14 行已定義
- 欄位用途：記錄**所有類型的撤銷**（管理員撤銷 + 用戶自助撤銷）

### 2. 如何區分撤銷來源

不需要新增 `user_revoked_at` 或其他欄位，區分方式有兩種：

#### 方式一：透過 audit_logs 查詢（最準確）
```sql
SELECT event_type FROM audit_logs
WHERE card_uuid = ? AND event_type IN ('user_card_revoke', 'admin_revoke')
ORDER BY timestamp DESC LIMIT 1;
```

#### 方式二：簡化前端邏輯（推薦）
只要 `revoked_at` 存在且 < 7 天，就允許用戶嘗試恢復：
- 如果是用戶自己撤銷的：允許恢復
- 如果是管理員撤銷的：後端會在 `handleUserRestoreCard()` 中檢查並拒絕

### 3. 現有實作已正確

#### types.ts (107-118行)
```typescript
export interface UUIDBinding {
  uuid: string;
  type: UserCardType;
  status: UUIDBindingStatus;
  bound_email: string | null;
  bound_at: number | null;
  created_ip: string | null;
  created_user_agent: string | null;
  revoked_at: number | null;      // ✅ 已正確定義
  revoke_reason: string | null;
  quarantine_until: number | null;
}
```

#### handlers/user/cards.ts

**handleUserRevokeCard (589-744行)**:
```typescript
// 直接使用現有的 revoked_at 欄位
await env.DB.prepare(`
  UPDATE uuid_bindings
  SET status = 'revoked', revoked_at = ?
  WHERE uuid = ?
`).bind(now, uuid)
```

**handleUserRestoreCard (750-842行)**:
```typescript
// 檢查現有 revoked_at 計算 7 天窗口
const revokedAt = binding.revoked_at;
const restoreDeadline = revokedAt + (7 * 86400);

if (now > restoreDeadline) {
  return errorResponse('RESTORE_WINDOW_EXPIRED', ...);
}
```

#### 前端 user-portal.html (1187-1217行)
```javascript
// 判斷是否顯示恢復按鈕
${isRevoked ? (data.revoked_at ? (() => {
    const revokedTime = new Date(data.revoked_at * 1000);
    const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
    const canRestore = Date.now() < restoreDeadline.getTime();
    return canRestore ? `恢復按鈕` : `已過期按鈕`;
})() : `管理員撤銷提示`) : ''}
```

---

## 修正內容

### 1. ❌ 不需要的檔案
- `workers/migrations/0010_uuid_bindings_revoked_at.sql` - **從未建立**

### 2. ✅ 文檔更新

**檔案**: `.specify/specs/user-self-revoke-implementation-summary.md`

**修改內容**:
1. 第 25-31 行：說明 Migration 0010 不需要
2. 第 271-276 行：澄清 revoked_at 已在 Migration 0004 中存在
3. 第 379 行：移除 Migration 0010 檔案清單

### 3. ✅ 代碼驗證

所有相關代碼均已正確使用現有的 `revoked_at` 欄位：
- ✅ `workers/src/types.ts`: UUIDBinding 類型定義正確
- ✅ `workers/src/handlers/user/cards.ts`: 撤銷/恢復邏輯正確
- ✅ `workers/public/user-portal.html`: 前端顯示邏輯正確

---

## 資料庫架構總結

### uuid_bindings 表完整結構
```sql
CREATE TABLE uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,              -- 'bound' | 'revoked' | 'quarantine'
  bound_email TEXT,
  bound_at INTEGER,
  created_ip TEXT,
  created_user_agent TEXT,
  revoked_at INTEGER,                -- 所有撤銷時間（統一欄位）
  revoke_reason TEXT,
  quarantine_until INTEGER
);
```

### audit_logs 相關事件類型
```typescript
event_type:
  | 'user_card_revoke'    // 用戶自助撤銷
  | 'user_card_restore'   // 用戶自助恢復
  | 'admin_revoke'        // 管理員撤銷
  | 'card_restore'        // 管理員恢復
```

---

## Migration 清單

### ✅ 已應用
- `0004_uuid_bindings_v2.sql`: 包含 revoked_at 欄位
- `0009_revocation_rate_limits.sql`: Rate limiting 支援

### ❌ 不需要
- ~~`0010_uuid_bindings_revoked_at.sql`~~: revoked_at 已在 0004 中存在

---

## 驗證步驟

1. **檢查資料庫結構**:
```bash
wrangler d1 execute DB-Card --remote --command "PRAGMA table_info(uuid_bindings);"
```

預期輸出應包含：
```
...
7|revoked_at|INTEGER|0||0
...
```

2. **檢查 Migrations 清單**:
```bash
wrangler d1 migrations list DB-Card --remote
```

預期結果：
- ✅ 0004_uuid_bindings_v2.sql: Applied
- ✅ 0009_revocation_rate_limits.sql: Applied
- ❌ 0010: 不存在

3. **功能測試**:
- 用戶撤銷名片 → `revoked_at` 被設定
- 7 天內恢復 → `revoked_at` 被清除
- 7 天後恢復 → 返回 403 錯誤

---

## 最佳實踐建議

### 1. 統一欄位設計
✅ **DO**: 使用單一欄位記錄所有撤銷
```sql
revoked_at INTEGER  -- 適用所有撤銷類型
```

❌ **DON'T**: 為不同撤銷來源建立多個欄位
```sql
admin_revoked_at INTEGER
user_revoked_at INTEGER
system_revoked_at INTEGER
```

### 2. 透過 audit_logs 追蹤來源
✅ **DO**: 使用審計日誌區分操作者
```typescript
event_type: 'user_card_revoke' | 'admin_revoke'
actor_type: 'user' | 'admin' | 'system'
actor_id: email
```

### 3. 前端簡化邏輯
✅ **DO**: 使用時間窗口判斷
```javascript
const canRestore = Date.now() < (revokedAt + 7 * 86400 * 1000);
```

❌ **DON'T**: 前端嘗試區分撤銷來源（讓後端決定）

---

## Conclusion

✅ **無需任何代碼修改** - 所有實作已正確使用現有的 `revoked_at` 欄位

✅ **無需 Migration 0010** - `revoked_at` 欄位已在 Migration 0004 中定義

✅ **文檔已更新** - 移除錯誤的 Migration 0010 引用

✅ **架構驗證完成** - 確認所有代碼遵循正確的資料庫結構

---

**Status**: ✅ 架構澄清完成，無需代碼變更
**Next Steps**: 執行 Migration 0009，部署代碼，進行功能測試
