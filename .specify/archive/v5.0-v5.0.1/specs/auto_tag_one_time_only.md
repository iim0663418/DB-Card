# Auto Tag: One-Time Only Strategy

## Context
在協同學習機制（FileSearchStore + Cross-User Matching）下，標籤品質會隨著知識庫累積而自然提升，不需要定期重新標籤。

## BDD Specification

### Scenario: Auto-tag only untagged cards
**Given**: 
- 系統有協同學習機制（FileSearchStore 累積組織知識）
- 名片已經被標籤過一次（auto_tagged_at IS NOT NULL）

**When**: 
- Cron Job 執行 auto-tag-cards

**Then**: 
- 該名片應該被跳過（不重新標籤）
- 只處理 auto_tagged_at IS NULL 的名片

### Scenario: Process untagged cards
**Given**: 
- 名片尚未被標籤（auto_tagged_at IS NULL）

**When**: 
- Cron Job 執行 auto-tag-cards

**Then**: 
- 該名片應該被處理
- 標籤生成後設定 auto_tagged_at = now()

## Technical Changes

### File: `src/cron/auto-tag-cards.ts`

**Remove**:
```typescript
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
console.log(`[AutoTag] Looking for cards with auto_tagged_at < ${new Date(sevenDaysAgo).toISOString()}`);
```

**Simplify SQL**:
```sql
-- Before
WHERE deleted_at IS NULL
  AND merged_to IS NULL
  AND (auto_tagged_at IS NULL OR auto_tagged_at < ?)

-- After
WHERE deleted_at IS NULL
  AND merged_to IS NULL
  AND auto_tagged_at IS NULL
```

**Remove bind parameter**:
```typescript
// Before
.bind(sevenDaysAgo).all();

// After
.all();
```

## Rationale

1. **協同學習優勢**: FileSearchStore 會累積組織知識，後續名片自動受益
2. **避免浪費**: 重新標籤消耗 Gemini API quota，但標籤不會顯著改善
3. **簡化邏輯**: 移除時間判斷，降低複雜度
4. **一致性**: 標籤成為「歷史快照」，不會因重新標籤而改變

## Expected Outcome

- 每張名片只被標籤一次
- Cron Job 只處理新增的未標籤名片
- 降低 Gemini API 使用量
- 簡化代碼邏輯
