# P0 驗收清單

## 1. 程式碼檢查

### 1.1 External CDN 移除
- [ ] 無 unpkg.com 依賴
- [ ] 無 cdn.jsdelivr.net 依賴
- [ ] 所有 vendor 資源有 SRI hash
- [ ] 所有 vendor 資源可訪問 (HTTP 200)

### 1.2 Inline Event Handlers 移除
- [ ] 無 onclick= 屬性
- [ ] 無 onerror= 屬性
- [ ] 無 onload= 屬性
- [ ] 事件委派處理器存在
- [ ] 所有 data-action 有對應 handler

### 1.3 DOMPurify 安全強化
- [ ] 無 ADD_ATTR: ['onclick']
- [ ] 保留合法的 ADD_ATTR: ['data-action', 'data-ip']
- [ ] 所有 sanitize 呼叫正確

## 2. 功能測試

### 2.1 基本功能
- [ ] 登入功能正常
- [ ] Passkey 登入正常
- [ ] Tab 切換正常 (list, create, twin, security, tools)
- [ ] 登出功能正常

### 2.2 名片管理
- [ ] 載入名片列表
- [ ] 重新整理按鈕
- [ ] 編輯名片
- [ ] 取消編輯
- [ ] 刪除名片

### 2.3 資產管理
- [ ] 上傳資產
- [ ] 清除預覽
- [ ] 查看資產 (viewAsset)
- [ ] 關閉資產 modal (closeAssetModal)

### 2.4 安全功能
- [ ] 匯出安全事件 CSV
- [ ] 分頁導航 (Previous/Next)
- [ ] 查看 IP 詳情 (loadIPDetail)
- [ ] 解除 IP 封鎖 (handleUnblockIP)
- [ ] 關閉 IP 詳情 modal

### 2.5 工具功能
- [ ] KEK 輪替指引
- [ ] 複製指令到剪貼簿 (5 個按鈕)
- [ ] 關閉輪替指引 modal
- [ ] CDN 健康檢查

## 3. 安全驗證

### 3.1 靜態分析
```bash
# 檢查 onclick
grep -n "onclick=" workers/public/admin-dashboard.html

# 檢查 ADD_ATTR onclick
grep -n "ADD_ATTR.*onclick" workers/public/admin-dashboard.html

# 檢查外部 CDN
grep -n "unpkg\|jsdelivr" workers/public/admin-dashboard.html
```

### 3.2 瀏覽器 Console
- [ ] 無 JavaScript 錯誤
- [ ] 無 CSP 違規警告
- [ ] 事件委派正常運作

### 3.3 Network 面板
- [ ] 所有 vendor 資源 HTTP 200
- [ ] 無外部 CDN 請求
- [ ] SRI 驗證通過

## 4. 效能驗證

### 4.1 載入時間
- [ ] Admin Dashboard 載入時間 < 3s
- [ ] 無阻塞資源

### 4.2 互動回應
- [ ] 按鈕點擊回應 < 100ms
- [ ] Tab 切換流暢

## 5. 相容性測試

### 5.1 瀏覽器
- [ ] Chrome/Edge (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)

### 5.2 裝置
- [ ] 桌面 (1920x1080)
- [ ] 平板 (768x1024)
- [ ] 手機 (375x667)

## 驗收標準

### 必須通過 (P0)
- ✅ 零個 onclick 屬性
- ✅ 零個 ADD_ATTR onclick
- ✅ 零個外部 CDN
- ✅ 所有基本功能正常
- ✅ 無 JavaScript 錯誤

### 建議通過 (P1)
- ⏳ 所有進階功能正常
- ⏳ 跨瀏覽器相容
- ⏳ 響應式設計正常

## 驗收結果

**日期**: 2026-02-11  
**版本**: 035528e  
**環境**: Staging  

**結果**: [ ] PASS / [ ] FAIL  
**備註**: 
