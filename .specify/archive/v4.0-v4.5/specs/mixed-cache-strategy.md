# BDD Spec: Mixed Cache Strategy by Card Type

## Feature: 依名片類型的混合快取策略

### Background
為了平衡安全性與性能，不同類型的名片採用不同的快取策略：
- **sensitive**: 不快取解密資料（最高安全）
- **personal/event**: 快取 60s（平衡性能）

---

## Scenario 1: sensitive 名片 - 不快取解密資料

**Given**: 一張 sensitive 類型的名片  
**And**: 名片資料已加密儲存在 cards 表  
**When**: 調用 handleRead() 讀取名片  
**Then**: 
- 每次都執行解密操作
- 不寫入 KV 快取
- 返回解密後的資料
- 性能: ~200ms (包含解密)

**Security**: 解密資料不存在後端，僅在記憶體中短暫存在

---

## Scenario 2: personal 名片 - 快取 60s

**Given**: 一張 personal 類型的名片  
**And**: KV 中沒有快取  
**When**: 調用 handleRead() 讀取名片  
**Then**: 
- 執行解密操作
- 寫入 KV 快取 (TTL: 60s)
- 返回解密後的資料
- 性能: ~200ms (首次)

---

## Scenario 3: personal 名片 - 快取命中

**Given**: 一張 personal 類型的名片  
**And**: KV 中存在有效快取 (60s 內)  
**When**: 調用 handleRead() 讀取名片  
**Then**: 
- 從 KV 讀取快取資料
- 不執行解密操作
- 返回快取的資料
- 性能: ~100ms (快取命中)

---

## Scenario 4: event 名片 - 快取 60s

**Given**: 一張 event 類型的名片  
**And**: KV 中沒有快取  
**When**: 調用 handleRead() 讀取名片  
**Then**: 
- 執行解密操作
- 寫入 KV 快取 (TTL: 60s)
- 返回解密後的資料
- 性能: ~200ms (首次)

---

## Scenario 5: 快取過期後重新解密

**Given**: 一張 personal 類型的名片  
**And**: KV 快取已過期 (>60s)  
**When**: 調用 handleRead() 讀取名片  
**Then**: 
- 執行解密操作
- 更新 KV 快取 (新的 60s TTL)
- 返回解密後的資料

---

## Implementation Requirements

### 修改文件
- `workers/src/handlers/read.ts`

### 新增函數
```typescript
async function getCardType(
  env: Env, 
  cardUuid: string
): Promise<'personal' | 'event' | 'sensitive'>
```

### 修改函數
```typescript
async function getCachedCardData(
  env: Env,
  uuid: string,
  encryptedPayload: string,
  wrappedDek: string,
  ttl?: number  // 新增可選參數
): Promise<CardData>
```

### 修改邏輯
```typescript
// 在 handleRead() 中
const cardType = await getCardType(env, card_uuid);

if (cardType === 'sensitive') {
  // 不快取，直接解密
  cardData = await decryptCardData(...);
} else {
  // 快取 60s
  cardData = await getCachedCardData(env, card_uuid, ..., 60);
}
```

---

## Database Query

### 查詢名片類型
```sql
SELECT ub.card_type 
FROM uuid_bindings ub
WHERE ub.uuid = ?
  AND ub.status = 'bound'
LIMIT 1
```

---

## Performance Expectations

| 名片類型 | 首次訪問 | KV 快取命中 | 前端快取命中 |
|---------|---------|------------|-------------|
| sensitive | ~200ms | N/A (不快取) | <10ms |
| personal | ~200ms | ~100ms | <10ms |
| event | ~200ms | ~100ms | <10ms |

---

## Security Considerations

### sensitive 類型
- ✅ 解密資料不存在 KV
- ✅ 僅在 Worker 記憶體中短暫存在
- ✅ 請求結束即釋放
- ⚠️ 前端 sessionStorage 仍會快取（用戶端）

### personal/event 類型
- ⚠️ 解密資料在 KV 存 60s
- ✅ Cloudflare KV 本身加密
- ✅ 僅 Worker 可訪問
- ✅ 60s 後自動過期

---

## Error Handling

### 查詢 card_type 失敗
- 預設為 'personal' (保守策略)
- 記錄錯誤日誌

### KV 操作失敗
- 優雅降級：繼續解密，不快取
- 不影響功能

---

## Testing Checklist

- [ ] sensitive 名片不寫入 KV
- [ ] personal 名片寫入 KV (60s TTL)
- [ ] event 名片寫入 KV (60s TTL)
- [ ] KV 快取命中時不解密
- [ ] KV 快取過期後重新解密
- [ ] 查詢 card_type 錯誤時的降級行為
- [ ] 性能符合預期

---

## Notes

1. **向後相容**: 不影響現有 API 行為
2. **前端快取**: 所有類型都保留 sessionStorage 快取
3. **TTL 調整**: 未來可根據監控數據調整
4. **擴展性**: 可輕鬆新增更多類型和策略
