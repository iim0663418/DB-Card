# Phase 2 Task List - Core API Development

**Phase**: Week 2  
**Start Date**: 2026-01-18  
**Owner**: Commander + Claude (Builder)  
**Goal**: 實作 NFC Tap 與 Read API

---

## Task 2.1: 實作 POST /api/nfc/tap

### BDD Specification
```gherkin
Scenario: 首次碰卡簽發 ReadSession
  Given 名片 UUID 存在於資料庫
  And 名片狀態為 active
  When 發送 POST /api/nfc/tap with { card_uuid }
  Then 回傳 200
  And 創建新的 ReadSession
  And session_id 不為空
  And expires_at = now + 24h
  And max_reads = 20 (Personal 類型)
  And revoked_previous = false

Scenario: 再次碰卡撤銷最近 1 筆
  Given 名片有一個 5 分鐘前的 ReadSession
  And 該 session 的 reads_used = 1
  When 發送 POST /api/nfc/tap with { card_uuid }
  Then 回傳 200
  And 舊 session 被撤銷 (revoked_reason: 'retap')
  And 新 session_id 不同於舊 session
  And revoked_previous = true
```

### Implementation Files
- `src/handlers/tap.ts` - NFC Tap Handler
- `src/utils/session.ts` - ReadSession 管理工具
- `src/utils/policy.ts` - CardType Policy 管理

---

## Task 2.2: 實作 GET /api/read

### BDD Specification
```gherkin
Scenario: 有效 ReadSession 讀取名片
  Given 名片存在且已加密
  And ReadSession 有效 (未過期、未撤銷、未達 max_reads)
  When 發送 GET /api/read?uuid={uuid}&session={session_id}
  Then 回傳 200
  And 解密名片資料
  And reads_used++
  And 回傳 session_info (reads_remaining, expires_at)

Scenario: ReadSession 過期
  Given ReadSession 已過期 (expires_at < now)
  When 發送 GET /api/read?uuid={uuid}&session={session_id}
  Then 回傳 403
  And error.code = session_expired
  And error.message = 請再次碰卡以重新取得授權
```

### Implementation Files
- `src/handlers/read.ts` - Read Handler
- `src/utils/audit.ts` - Audit Log 工具

---

## Task 2.3: 整合 Envelope Encryption

### BDD Specification
```gherkin
Scenario: 加密名片資料
  Given 名片資料為 JSON 物件
  When 呼叫 encryptCard(cardData)
  Then 生成隨機 DEK
  And 使用 DEK 加密資料
  And 使用 KEK 包裝 DEK
  And 回傳 encrypted_payload 和 wrapped_dek

Scenario: 解密名片資料
  Given encrypted_payload 和 wrapped_dek 存在
  When 呼叫 decryptCard(encrypted_payload, wrapped_dek)
  Then 使用 KEK 解包 DEK
  And 使用 DEK 解密資料
  And 回傳原始 JSON 物件
```

---

## Task 2.4: 實作 Rate Limiting

### BDD Specification
```gherkin
Scenario: Rate Limit 未超過
  Given card_uuid 在當前分鐘內請求次數 < 10
  When 發送 POST /api/nfc/tap
  Then 允許請求
  And 增加計數器

Scenario: Rate Limit 超過
  Given card_uuid 在當前分鐘內請求次數 >= 10
  When 發送 POST /api/nfc/tap
  Then 回傳 429
  And error.code = rate_limit_exceeded
```

### Implementation Files
- `src/middleware/ratelimit.ts` - Rate Limiting 中介層

---

## Task 2.5: 單元測試

### Test Files
- `test/handlers/tap.spec.ts`
- `test/handlers/read.spec.ts`
- `test/crypto/envelope.spec.ts`

---

## Acceptance Criteria

- [ ] POST /api/nfc/tap 正常簽發 ReadSession
- [ ] 再次碰卡可撤銷最近 1 筆 (10分鐘內 OR reads_used <= 2)
- [ ] GET /api/read 正確驗證 ReadSession 並解密資料
- [ ] reads_used 正確遞增
- [ ] ReadSession 過期回傳 403
- [ ] max_reads 限制生效
- [ ] Rate Limiting 生效 (10 req/min)
- [ ] Envelope Encryption 正常運作
- [ ] Audit Logs 記錄所有操作
- [ ] 單元測試通過率 >= 90%

---

**[END OF PHASE 2 TASK LIST]**
