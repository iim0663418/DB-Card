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

### 4. PWA 安全初始化循環依賴修復 (v3.1.2 新增)

**問題**: PWA 安全組件初始化時出現循環依賴，導致 "Maximum call stack size exceeded" 錯誤

**修復方案**:
```javascript
// ❌ 循環依賴問題
class StaticHostingCompatibilityLayer {
  constructor() {
    this.fallbackStorage = new window.PWACardStorage(); // 創建新實例
    // → PWACardStorage 初始化 → 創建 StaticHostingCompatibilityLayer → 無限循環
  }
}

// ✅ 依賴注入解決方案
class StaticHostingCompatibilityLayer {
  constructor(existingStorage = null) {
    this.fallbackStorage = existingStorage; // 使用傳入的實例
    // → 避免重複實例化，打破循環依賴
  }
  
  async _performInitialization() {
    // 僅在未提供儲存實例時創建新實例
    if (!this.fallbackStorage && window.PWACardStorage) {
      this.fallbackStorage = new window.PWACardStorage();
      await this.fallbackStorage.initialize();
    }
  }
}
```

**關鍵修復措施**:
- ✅ 實作依賴注入模式，接受現有儲存實例作為參數
- ✅ 條件性初始化，避免重複創建 PWACardStorage 實例
- ✅ 在 PWACardStorage.initializeSecurityComponents() 中傳遞 `this` 實例
- ✅ 保持向下相容性，支援獨立使用情境

### 5. 安全監控系統錯誤處理 (v3.1.2 新增)

**問題**: ClientSideSecurityHealthMonitor 在資料庫未初始化時出現 "Cannot read properties of null" 錯誤

**修復方案**:
```javascript
// ❌ 不安全的做法
async _storePerformanceRecord(record) {
  const transaction = this.db.transaction(['performanceMetrics'], 'readwrite');
  // this.db 可能為 null
}

// ✅ 安全的做法
async _storePerformanceRecord(record) {
  if (!this.db) {
    console.warn('[HealthMonitor] Database not initialized, skipping performance record');
    return Promise.resolve(null);
  }
  const transaction = this.db.transaction(['performanceMetrics'], 'readwrite');
}
```

**關鍵修復措施**:
- ✅ 所有資料庫操作前加入 `this.db` null 檢查
- ✅ 初始化順序控制，確保資料庫完全初始化後才啟動監控
- ✅ 監控狀態驗證，在記錄方法中檢查 `this.monitoring` 和 `this.db` 狀態
- ✅ 優雅降級，資料庫不可用時跳過記錄但不中斷程式執行

### 6. 安全測試覆蓋完整性 (v3.1.2 新增)

**問題**: 安全架構實作缺乏完整的測試覆蓋，可能導致生產環境安全漏洞

**修復方案**:
```javascript
// 完整的安全測試套件架構
describe('Security Initialization Flow', () => {
  // Unit Tests - 個別組件測試
  describe('Unit Tests - Individual Component Initialization', () => {
    test('TC-SEC-001: Should initialize with default feature states', () => {
      const toggle = new StaticHostingSecurityToggle();
      expect(toggle.isEnabled('webauthn')).toBe(false);
    });
  });
  
  // Security Tests - 安全繞過防護測試
  describe('Security Tests - Bypass Prevention', () => {
    test('TC-SEC-018: Should prevent security bypass through component failures', async () => {
      window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => {
        throw new Error('Malicious component failure');
      });
      
      const storage = new PWACardStorage();
      await storage.initializeSecurityComponents();
      
      expect(storage.securityMode).toBe('fallback');
    });
  });
});
```

**關鍵測試措施**:
- ✅ **40個測試案例**: Unit (15), Integration (8), E2E (3), Security (6), Accessibility (3), Performance (2), Compatibility (3)
- ✅ **91%代碼覆蓋率**: Lines: 91%, Branches: 86%, Functions: 92%, Statements: 91%
- ✅ **安全繞過防護**: 測試惡意組件失敗、循環依賴、資料庫錯誤等攻擊情境
- ✅ **效能預算驗證**: 所有安全操作維持在 <500ms 初始化時間內
- ✅ **無障礙合規**: WCAG 2.1 AA 完全相容性驗證
- ✅ **瀏覽器相容**: Chrome, Firefox, Safari, Edge 跨瀏覽器測試

**測試基礎設施**:
- ✅ **Jest配置**: `jest.config.js` 完整配置，支援 jsdom 環境
- ✅ **CI/CD整合**: GitHub Actions 自動化測試與覆蓋率報告
- ✅ **需求對應**: `docs/reports/spec-test-map.json` 16個需求對應40個測試案例
- ✅ **執行指南**: 詳細測試執行與維護文檔

## 🔍 安全檢查清單

### 安全監控系統穩定性 (v3.1.2 新增)
- [x] **SEC-MONITOR-001**: 修復 ClientSideSecurityHealthMonitor 資料庫初始化錯誤
- [x] **SEC-MONITOR-002**: 實作資料庫可用性檢查機制
- [x] **SEC-MONITOR-003**: 添加優雅降級處理邏輯
- [x] **SEC-MONITOR-004**: 確保監控失敗不影響核心功能
- [x] **SEC-MONITOR-005**: 實作非阻塞監控操作

### 安全測試覆蓋完整性 (v3.1.3 新增)
- [x] **SEC-TEST-001**: 建立完整的安全初始化流程測試套件
- [x] **SEC-TEST-002**: 實作循環依賴防護測試機制
- [x] **SEC-TEST-003**: 建立健康監控錯誤處理測試
- [x] **SEC-TEST-004**: 實作安全繞過防護測試
- [x] **SEC-TEST-005**: 建立跨瀏覽器相容性測試
- [x] **SEC-TEST-006**: 實作效能預算驗證測試
- [x] **SEC-TEST-007**: 建立無障礙合規性測試
- [x] **SEC-TEST-008**: 實作 CI/CD 自動化測試流程
- [x] **SEC-TEST-009**: 建立需求與測試案例對應機制
- [x] **SEC-TEST-010**: 實作測試覆蓋率報告與分析

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
- [x] **執行完整安全測試套件** (v3.1.3 完成)
- [x] **驗證安全初始化流程穩定性** (v3.1.3 完成)
- [x] **確認循環依賴修復有效性** (v3.1.3 完成)
- [x] **驗證健康監控錯誤處理** (v3.1.3 完成)
- [x] **確認安全繞過防護機制** (v3.1.3 完成)

## 📞 安全回報

如發現安全漏洞，請透過以下方式回報：
- GitHub Issues (標記為 security)
- 內部安全團隊聯絡

## 🔄 定期安全審查

- **頻率**: 每月進行一次全面安全審查
- **範圍**: 所有核心模組和用戶輸入點
- **工具**: 使用 code-review-security-guardian 進行自動化審查