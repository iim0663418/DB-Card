# Admin Dashboard Budget Display - BDD Specification (Full Version)

## Feature: 管理者介面顯示名片使用狀態（每日/每月/總計）

### Architecture Understanding
- Budget 資料存儲：
  - D1 `cards.total_sessions` (總計)
  - KV `session:budget:{uuid}:daily:{YYYYMMDD}` (今日)
  - KV `session:budget:{uuid}:monthly:{YYYYMM}` (本月)
- 限制定義：`CARD_POLICIES` in types.ts
- 實作策略：批量查詢 KV（使用 Promise.all 並行）

### Scenario 1: API 返回完整 budget 資訊
**Given**: 管理者已登入後台  
**When**: 調用 GET /api/admin/cards  
**Then**: 
- 返回成功 (200)
- 每張名片包含 budget 物件
- budget 包含: daily_used, daily_limit, monthly_used, monthly_limit, total_used, total_limit, status, percentage

### Scenario 2: 正常名片不顯示徽章 (所有維度 <80%)
**Given**: 名片使用率為 今日 5/10 (50%), 本月 50/100 (50%), 總計 450/1000 (45%)  
**When**: 渲染名片列表  
**Then**: 
- 不顯示 budget 徽章
- 顯示: "今日 5/10 • 本月 50/100 • 總計 450/1000"

### Scenario 3: 每日達到上限顯示紅色徽章
**Given**: 名片使用率為 今日 10/10 (100%), 本月 50/100 (50%), 總計 450/1000 (45%)  
**When**: 渲染名片列表  
**Then**: 
- 顯示紅色徽章 [100%]
- 顯示: "今日 10/10 • 本月 50/100 • 總計 450/1000"
- 今日數字標示為紅色

### Scenario 4: 本月接近上限顯示黃色徽章
**Given**: 名片使用率為 今日 5/10 (50%), 本月 85/100 (85%), 總計 450/1000 (45%)  
**When**: 渲染名片列表  
**Then**: 
- 顯示黃色徽章 [85%]
- 顯示: "今日 5/10 • 本月 85/100 • 總計 450/1000"
- 本月數字標示為黃色

### Scenario 5: 總計達到上限顯示紅色徽章
**Given**: 名片使用率為 今日 5/10 (50%), 本月 50/100 (50%), 總計 980/1000 (98%)  
**When**: 渲染名片列表  
**Then**: 
- 顯示紅色徽章 [98%]
- 顯示: "今日 5/10 • 本月 50/100 • 總計 980/1000"
- 總計數字標示為紅色

### Scenario 6: 處理 NULL 和 KV 不存在
**Given**: total_sessions 為 NULL，KV 不存在  
**When**: 計算 budget 狀態  
**Then**: 
- 將 NULL 和不存在的 KV 視為 0
- 顯示: "今日 0/10 • 本月 0/100 • 總計 0/1000"

### Scenario 7: 載入中顯示 Skeleton
**Given**: API 正在載入  
**When**: 渲染名片列表  
**Then**: 
- 顯示 skeleton loading 動畫
- 3 個灰色矩形閃爍效果

## Technical Implementation

### Backend Changes (workers/src/handlers/admin/cards.ts)

1. Import CARD_POLICIES:
```typescript
import { CARD_POLICIES, type CardType } from '../../types';
```

2. Update SQL query (line ~655):
```sql
SELECT 
  c.uuid, c.encrypted_payload, c.wrapped_dek,
  c.key_version, c.created_at, c.updated_at,
  c.total_sessions,
  b.type as card_type,
  b.status as card_status
FROM cards c
INNER JOIN uuid_bindings b ON c.uuid = b.uuid
WHERE b.status IN ('bound', 'revoked')
ORDER BY c.created_at DESC
```

3. Calculate budget in map function (after decryption):
```typescript
// Calculate budget (total only)
const limits = CARD_POLICIES[card.card_type as CardType];
const totalUsed = card.total_sessions ?? 0;
const percentage = Math.round((totalUsed / limits.max_total_sessions) * 100);

let budgetStatus: 'normal' | 'warning' | 'critical' = 'normal';
if (percentage >= 95) budgetStatus = 'critical';
else if (percentage >= 80) budgetStatus = 'warning';
```

4. Add budget to return object:
```typescript
return {
  uuid: card.uuid,
  card_type: card.card_type,
  status: card.card_status,
  data: cardData,
  budget: {
    total_used: totalUsed,
    total_limit: limits.max_total_sessions,
    status: budgetStatus,
    percentage
  },
  created_at: new Date(card.created_at).toISOString(),
  updated_at: new Date(card.updated_at).toISOString()
};
```

5. Add default budget in error case:
```typescript
budget: {
  total_used: 0,
  total_limit: 1000,
  status: 'normal',
  percentage: 0
},
```

### Frontend Changes (workers/public/admin-dashboard.html)

1. Add CSS (after .badge-suspended):
```css
/* Budget Badge */
.badge-budget-warning { 
    background: rgba(245, 158, 11, 0.1); 
    color: #f59e0b; 
    border: 1px solid rgba(245, 158, 11, 0.3);
}
.badge-budget-critical { 
    background: rgba(239, 68, 68, 0.1); 
    color: #ef4444; 
    border: 1px solid rgba(239, 68, 68, 0.3);
}
```

2. Add badge (after statusBadge):
```javascript
// Budget badge
if (c.budget && c.budget.status !== 'normal') {
    const budgetBadge = document.createElement('span');
    budgetBadge.className = `badge badge-budget-${c.budget.status}`;
    budgetBadge.textContent = `${c.budget.percentage}%`;
    budgetBadge.title = `使用率 ${c.budget.percentage}%`;
    nameRow.appendChild(budgetBadge);
}
```

3. Add usage text (after titleP):
```javascript
// Budget usage
if (c.budget) {
    const budgetP = document.createElement('p');
    budgetP.className = 'text-[10px] text-slate-500 mt-1';
    budgetP.textContent = `已使用 ${c.budget.total_used}/${c.budget.total_limit} (${c.budget.percentage}%)`;
    textDiv.appendChild(budgetP);
}
```

## Key Points

- ✅ No KV queries (performance optimized)
- ✅ Only show total sessions (most important metric)
- ✅ Use existing CARD_POLICIES
- ✅ Handle NULL with ?? 0
- ✅ Semantic colors (80%/95% thresholds)

