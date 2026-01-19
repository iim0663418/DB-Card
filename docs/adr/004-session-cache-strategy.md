# ADR-004: 前端 Session 級別快取策略

## 狀態
已接受 (2026-01-19)

## 背景
在 [ADR-003](003-remove-client-cache.md) 中移除了 IndexedDB 持久化快取機制後，每次頁面重新整理都需要重新調用 Cloudflare Workers API 重新生成 vCard。這在用戶快速刷新頁面時會造成不必要的算力浪費，影響服務成本效率。

## 決策
採用 **sessionStorage** 實作 session 級別的臨時快取機制：

1. **快取媒介**: 使用 `sessionStorage` API
2. **快取範圍**: Tab/視窗級別（關閉 tab 自動清除）
3. **快取時效**: 1 小時過期時間
4. **快取鍵格式**: `card_cache_{uuid}_{sessionId}`
5. **清理策略**: 頁面載入時自動清理過期快取

## 理由

### 符合無持久化原則
- sessionStorage 在關閉 tab 時自動清除，符合 [ADR-002](002-no-persistent-session.md) 和 [ADR-003](003-remove-client-cache.md) 的無持久化會話原則
- 不會違反「瀏覽器層級授權會話綁定」的設計

### 優化用戶體驗
- 避免在同一 session 內快速刷新時重複請求
- 減少不必要的 API 調用，降低算力消耗
- 1 小時過期時間平衡了快取效益與資料新鮮度

### 技術優勢
- sessionStorage API 簡單、輕量，無需額外依賴
- 瀏覽器原生支援，兼容性良好
- 自動與 tab 生命週期綁定，無需手動管理

## 實作細節

### 快取鍵結構
```
card_cache_{uuid}_{sessionId}
```
- 每個名片的每個 session 有獨立快取
- 確保不同授權會話的資料隔離

### 快取資料結構
```json
{
  "data": { /* vCard data */ },
  "timestamp": 1234567890000,
  "expiresAt": 1234571490000
}
```

### 過期策略
- 儲存時設定 1 小時（3600000ms）過期時間
- 讀取時檢查 `expiresAt`，過期則不使用
- 頁面載入時清理所有過期快取項目

## 影響範圍
- 新增 `workers/public/js/cache-helper.js` 模組
- 修改 `workers/public/js/main.js` 整合快取機制
- 不影響現有授權流程和會話管理

## 替代方案

### 方案 A: 完全不快取
- 優點: 實作最簡單，資料永遠最新
- 缺點: 快速刷新浪費算力，用戶體驗不佳

### 方案 B: 使用 Memory Cache
- 優點: 更快的存取速度
- 缺點: 刷新頁面時快取丟失，無法解決問題

### 方案 C: 使用 localStorage
- 優點: 可跨 session 快取
- 缺點: **違反 ADR-002/003 無持久化原則**，不可採用

## 參考文獻
- [ADR-002: 無持久化會話策略](002-no-persistent-session.md)
- [ADR-003: 移除客戶端持久化快取](003-remove-client-cache.md)
- [MDN: Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
