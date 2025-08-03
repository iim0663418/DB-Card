# 安全指南 (Security Guide)

## 🔒 安全原則

本專案遵循「隱私優先」和「Secure by Default」原則，確保用戶資料安全和系統穩定性。

## 🚨 已知安全問題與修復狀態

### Critical 級別問題 - PWA 匯入功能

| 問題ID | 狀態 | 描述 | 修復優先級 | 發現日期 |
|--------|------|------|------------|----------|
| SEC-PWA-001 | ❌ **待修復** | 檔案上傳攻擊 (CWE-434) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-002 | ❌ **待修復** | JSON.parse Prototype Pollution (CWE-1321) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-003 | ❌ **待修復** | 授權檢查缺失 (CWE-862) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-004 | ❌ **待修復** | PII 資料洩露 (CWE-359) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-005 | ❌ **待修復** | 不安全的檔案處理 (CWE-73) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-006 | ❌ **待修復** | 資料注入攻擊 (CWE-74) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-007 | ❌ **待修復** | 不安全的反序列化 (CWE-502) | P0 - 立即 | 2025-01-03 |
| SEC-PWA-008 | ❌ **待修復** | 錯誤處理資訊洩露 (CWE-209) | P0 - 立即 | 2025-01-03 |

### 已修復的安全問題

| 問題ID | 狀態 | 描述 | 修復日期 |
|--------|------|------|----------|
| SEC-001 | ✅ **已修復** | 生產環境使用 `prompt()` 函數 | 2024-12-20 |
| SEC-002 | ✅ **已修復** | 密碼輸入使用不安全的 `prompt()` | 2024-12-20 |
| SEC-003 | ✅ **已修復** | 確認對話框使用 `confirm()` | 2024-12-20 |
| SEC-004 | ✅ **已修復** | 日誌注入漏洞 (CWE-117) | 2024-12-20 |
| SEC-005 | ✅ **已修復** | XSS漏洞 (CWE-79) | 2024-12-20 |
| SEC-006 | ✅ **已修復** | 缺少授權檢查 (CWE-862) | 2024-12-20 |

## 🛡️ 安全修復指南

### 1. PWA 匯入功能緊急修復

#### SEC-PWA-001: 檔案上傳攻擊防護
```javascript
// ❌ 不安全的做法
async importData(file, password = null) {
  const fileContent = await this.readFile(file);
  // 直接處理任何檔案類型
}

// ✅ 安全的做法
async importData(file, password = null) {
  // 檔案類型白名單驗證
  const allowedTypes = ['application/json', 'application/octet-stream'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支援的檔案類型');
  }
  
  // 檔案大小限制
  if (file.size > 10 * 1024 * 1024) { // 10MB
    throw new Error('檔案大小超過限制');
  }
  
  const fileContent = await this.readFile(file);
}
```

#### SEC-PWA-002: JSON.parse Prototype Pollution 防護
```javascript
// ❌ 不安全的做法
importData = JSON.parse(fileContent);

// ✅ 安全的做法
importData = JSON.parse(fileContent, (key, value) => {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
});
```

#### SEC-PWA-003: 授權檢查實作
```javascript
// ❌ 缺少授權檢查
async importData(file, password = null) {
  // 直接執行匯入
}

// ✅ 安全的做法
async importData(file, password = null) {
  // 檢查用戶權限
  if (!SecurityAuthHandler.hasPermission('import')) {
    throw new Error('無權限執行匯入操作');
  }
  
  // 記錄操作日誌
  SecurityMonitor.logSecurityEvent('import_attempt', {
    filename: file.name,
    size: file.size,
    timestamp: new Date().toISOString()
  });
}
```

### 2. 移除生產環境彈出視窗 (已修復)

**問題**: 使用 `prompt/alert/confirm` 在生產環境中存在安全風險

**修復方案**: 已實作 `SecurityInputHandler` 統一安全輸入處理模組

### 2. 輸入清理與驗證

**問題**: 未清理的用戶輸入可能導致XSS攻擊

**修復方案**:
```javascript
// ❌ 不安全的做法
element.innerHTML = userInput;

// ✅ 安全的做法
element.textContent = DOMPurify.sanitize(userInput);
```

### 3. 日誌安全

**問題**: 用戶輸入直接寫入日誌可能導致日誌注入

**修復方案**:
```javascript
// ❌ 不安全的做法
console.log('[App] User data:', userData);

// ✅ 安全的做法
console.log('[App] User data:', encodeURIComponent(JSON.stringify(userData)));
```

## 🔍 安全檢查清單

### PWA 匯入功能緊急修復 (Critical)
- [ ] **SEC-PWA-001**: 實作檔案類型白名單驗證
- [ ] **SEC-PWA-002**: 修復 JSON.parse Prototype Pollution
- [ ] **SEC-PWA-003**: 添加匯入操作授權檢查
- [ ] **SEC-PWA-004**: 實作 PII 資料遮罩和加密
- [ ] **SEC-PWA-005**: 加強檔案路徑驗證和清理
- [ ] **SEC-PWA-006**: 實作輸入資料驗證和清理
- [ ] **SEC-PWA-007**: 使用安全的 JSON 解析器
- [ ] **SEC-PWA-008**: 實作安全的錯誤處理機制

### 開發階段 (已完成)
- [x] 移除所有 `prompt/alert/confirm` 使用
- [x] 實作 SecurityInputHandler 輸入清理
- [x] 添加授權檢查機制
- [x] 實作安全的模態對話框
- [x] 清理所有日誌輸入

### 部署前
- [ ] 進行 PWA 匯入功能滲透測試
- [ ] 驗證所有 Critical 級別安全修復
- [ ] 更新安全文檔和操作手冊
- [ ] 進行完整程式碼安全審查
- [ ] 執行 OWASP ASVS 合規性檢查

## 📞 安全回報

如發現安全漏洞，請透過以下方式回報：
- GitHub Issues (標記為 security)
- 內部安全團隊聯絡

## 🔄 定期安全審查

- **頻率**: 每月進行一次全面安全審查
- **範圍**: 所有核心模組和用戶輸入點
- **工具**: 使用 code-review-security-guardian 進行自動化審查