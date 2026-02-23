# Feature: 公開分享收到的名片 (Public Shared Cards)

## Business Value
- 提高 received_cards 資料重用性
- 使用者可將有價值的名片公開分享給所有人
- 建立社群名片庫

---

## Scenario 1: 公開分享名片

### Given
- 使用者 A (alice@example.com) 擁有一張 received_card (uuid: 550e8400-e29b-41d4-a716-446655440000)
- 名片未被 soft delete (deleted_at IS NULL)
- 名片目前為私密狀態

### When
- 使用者 A 點擊「公開分享」切換鈕
- 前端呼叫 `POST /api/user/received-cards/550e8400-e29b-41d4-a716-446655440000/share`

### Then
- 系統創建 shared_cards 記錄：
  - card_uuid: 550e8400-e29b-41d4-a716-446655440000
  - owner_email: alice@example.com
  - shared_at: 當前時間戳
- 回傳 HTTP 201 Created
- 切換鈕立即切換為 ON 狀態
- 所有登入使用者可透過 `GET /api/user/shared-cards` 查看此名片

---

## Scenario 2: 取消公開分享

### Given
- 使用者 A 已公開分享 550e8400-e29b-41d4-a716-446655440000

### When
- 使用者 A 點擊「公開分享」切換鈕（關閉）
- 前端呼叫 `DELETE /api/user/received-cards/550e8400-e29b-41d4-a716-446655440000/share`

### Then
- 系統刪除對應的 shared_cards 記錄
- 回傳 HTTP 204 No Content
- 切換鈕立即切換為 OFF 狀態
- 其他使用者無法再查看此名片

---

## Scenario 3: 查看公開名片庫

### Given
- 3 位使用者各公開分享了 1 張名片

### When
- 使用者 B 呼叫 `GET /api/user/shared-cards`

### Then
- 回傳 JSON 陣列，包含：
  - received_card 完整資料
  - shared_by (分享者 email)
  - shared_at (分享時間)
- 排序：最新分享在前
- 不包含已 soft delete 的名片

---

## Scenario 4: 防止重複公開

### Given
- 使用者 A 已公開分享 550e8400-e29b-41d4-a716-446655440000

### When
- 使用者 A 再次呼叫 `POST /api/user/received-cards/550e8400-e29b-41d4-a716-446655440000/share`

### Then
- 回傳 HTTP 409 Conflict
- Error Message: "Card is already shared publicly"

---

## Scenario 5: 權限驗證

### Given
- 使用者 A 擁有 550e8400-e29b-41d4-a716-446655440000
- 使用者 C 嘗試公開此名片

### When
- 使用者 C 呼叫 `POST /api/user/received-cards/550e8400-e29b-41d4-a716-446655440000/share`

### Then
- 回傳 HTTP 403 Forbidden
- Error Message: "You don't own this card"

---

## Database Schema

### Migration 0031: 公開分享表

```sql
-- Migration 0031_shared_cards.sql
-- Purpose: Public sharing of received cards

-- Step 1: Add composite unique index to received_cards
CREATE UNIQUE INDEX IF NOT EXISTS idx_received_cards_uuid_owner 
ON received_cards(uuid, user_email);

-- Step 2: Create shared_cards table (simplified for public sharing)
CREATE TABLE IF NOT EXISTS shared_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL UNIQUE,  -- 每張名片只能公開一次
  owner_email TEXT NOT NULL,
  shared_at INTEGER NOT NULL,
  
  -- 複合外鍵：確保 owner_email 真的擁有該 card_uuid
  FOREIGN KEY (card_uuid, owner_email) 
    REFERENCES received_cards(uuid, user_email) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shared_cards_owner ON shared_cards(owner_email);
CREATE INDEX IF NOT EXISTS idx_shared_cards_shared_at ON shared_cards(shared_at DESC);
```

### 重要說明：Soft Delete 處理

- `received_cards` 使用 soft delete (`deleted_at`)，不會觸發 `ON DELETE CASCADE`
- **所有查詢必須 JOIN received_cards 並過濾 `deleted_at IS NULL`**
- 當 owner soft delete 名片時，應用層需同步刪除 shared_cards 記錄

---

## API Endpoints

### 1. POST /api/user/received-cards/:uuid/share
- **Auth**: OAuth 驗證（Cookie 或 Bearer token）
- **UUID Validation**: 必須符合 RFC 4122 格式（36 字元）
- **Body**: 無（公開分享不需要指定對象）
- **Response**: 
  - 201 Created: 公開成功
  - 404 Not Found: UUID 不存在 或 名片已 soft delete (`deleted_at IS NOT NULL`)
  - 403 Forbidden: 名片存在但非 owner（`user_email` 不匹配）
  - 409 Conflict: 已公開分享

**錯誤碼優先順序**：404 (不存在) → 403 (權限) → 409 (重複)

### 2. DELETE /api/user/received-cards/:uuid/share
- **Auth**: OAuth 驗證（Cookie 或 Bearer token）
- **UUID Validation**: 必須符合 RFC 4122 格式
- **Response**: 
  - 204 No Content: 取消公開成功
  - 404 Not Found: UUID 不存在 或 名片已 soft delete
  - 403 Forbidden: 名片存在但非 owner
  - 404 Not Found (Share): 分享記錄不存在

**錯誤碼優先順序**：404 (不存在) → 403 (權限) → 404 (分享記錄)

### 3. GET /api/user/shared-cards
- **Auth**: OAuth 驗證（Cookie 或 Bearer token）
- **Query Logic**: 
  ```sql
  SELECT rc.*, sc.owner_email AS shared_by, sc.shared_at
  FROM shared_cards sc
  INNER JOIN received_cards rc ON sc.card_uuid = rc.uuid
  WHERE rc.deleted_at IS NULL  -- 過濾已刪除名片
  ORDER BY sc.shared_at DESC
  ```
- **Response**: 200 OK with JSON array（所有公開名片）

---

## Frontend Changes

### received-cards.html
- 每張名片新增「公開分享」切換鈕
- 切換鈕狀態：
  - ON (藍色): 已公開分享
  - OFF (灰色): 私密
- 立即生效：點擊後立即呼叫 API 並更新 UI

### 新增頁面：shared-cards.html (Optional)
- 顯示「公開名片庫」
- 所有使用者可瀏覽
- 顯示分享者資訊

---

## Acceptance Criteria

- [ ] Migration 0031: 創建 shared_cards 表（簡化版，無 recipient_email）
- [ ] API 三個端點通過 TypeScript 編譯
- [ ] UUID 格式驗證：拒絕非 RFC 4122 格式
- [ ] 權限驗證：非 owner 無法公開（資料庫層 + 應用層雙重保護）
- [ ] 防重複公開機制生效（UNIQUE 約束）
- [ ] Soft delete 處理：查詢必須過濾 deleted_at IS NULL
- [ ] 取消公開後，其他使用者無法查看
- [ ] 前端切換鈕立即生效（符合 NN/g Toggle Switch Guidelines）

---

## Open Questions (Resolved)

1. **是否支援指定分享對象？**  
   → **否**。採用「公開給所有人」模式，簡化設計。

2. **切換鈕是否適合？**  
   → **是**。符合 NN/g 指南：二元狀態（公開/私密）+ 立即生效。
