# v4.1.0 & v4.2.0 前端更新規劃

**規劃時間**: 2026-01-20T15:16:00+08:00  
**修訂原因**: Budget 重置功能從 P2 提升到 P0（必須實作）

---

## 實作範圍

### Phase 1: 核心功能 (P0 - 必須完成)

#### 1.1 後端 API - Budget 重置
- POST /api/admin/cards/:uuid/reset-budget
- 重置 total_sessions 到 0
- 清除 daily/monthly KV counters
- Audit logging

#### 1.2 前端錯誤處理
- card-display.html - 顯示 rate limit 和 budget 錯誤
- user-portal.html - 顯示錯誤訊息
- admin-dashboard.html - 顯示錯誤訊息

#### 1.3 前端重置功能
- admin-dashboard.html - 重置按鈕
- 確認對話框
- 成功後刷新列表

---

## 實作清單

### 後端
- [ ] handlers/admin/cards.ts - handleResetBudget()
- [ ] index.ts - 註冊路由
- [ ] types.ts - 新增 audit event type

### 前端
- [ ] card-display.html - 錯誤處理 + warning banner
- [ ] user-portal.html - 錯誤處理
- [ ] admin-dashboard.html - 錯誤處理 + 重置功能
