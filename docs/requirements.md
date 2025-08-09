---
version: "v3.2.1-security-vulnerability-remediation"
rev_id: 5
last_updated: "2025-08-08"
owners: ["prd-writer", "security-engineer", "technical-architect"]
feature_scope: "security-vulnerability-remediation"
security_level: "critical"
cognitive_complexity: "high"
reuse_policy: "reuse-then-extend-then-build"
migration_policy:
  compatibility: "100% 向下相容"
  dual_track_period: "3週分階段修復驗證"
  rollback_strategy: "即時回滾機制"
  data_migration: "無資料遷移需求"
priority: "P0-Critical"
compliance_requirements: ["OWASP-Top-10-2021", "CWE-mitigation", "NIST-Cybersecurity-Framework"]
---

# DB-Card PWA 安全漏洞修復需求文檔

## 1. Product Overview

### 1.1 執行摘要
基於 Amazon Q 安全掃描發現的關鍵安全漏洞，DB-Card PWA 專案存在多項高危安全風險，威脅用戶資料安全與系統穩定性。本 PRD 制定全面的安全修復計劃，確保系統符合 OWASP Top 10 2021 和政府資安規範要求。

**問題定義**：
- 🔴 **Critical 漏洞 47 個**：涉及 XSS (CWE-79/80)、代碼注入 (CWE-94)、日誌注入 (CWE-117)
- 🟡 **High 漏洞 8 個**：涉及授權檢查缺失 (CWE-862)、逆向 Tabnabbing
- ⚪ **Medium 漏洞 3 個**：涉及程式碼品質和維護性問題

**解決方案概覽**：
- **統一輸入驗證**：實作企業級輸入清理機制，防止 XSS 和代碼注入
- **安全日誌重構**：修復 40+ 日誌注入漏洞，建立結構化安全日誌系統
- **授權機制強化**：針對靜態托管環境設計客戶端安全檢查框架
- **架構安全重構**：利用 v3.2.0 輕量化安全架構，擴展 CWE 防護能力

**預期成果**：
- **零高危漏洞**：所有 Critical/High 級別安全漏洞 100% 修復
- **合規達標**：通過 OWASP ASVS Level 2 驗證，符合政府資安要求
- **效能維持**：安全修復不影響現有 PWA 效能指標
- **向下相容**：100% 保持現有功能和 API 兼容性

### 1.2 業務目標

#### 1.2.1 安全合規性
- **法規遵循**：符合數位發展部資安規範和個資法要求
- **國際標準**：達到 OWASP ASVS Level 2 合規性
- **風險降級**：安全風險等級從 High 降至 Low
- **審計通過**：通過第三方安全審計驗證

#### 1.2.2 用戶信任度
- **資料安全**：確保名片資料不受惡意攻擊威脅
- **隱私保護**：強化客戶端資料處理的安全性
- **透明度**：提供清晰的安全功能說明和操作指引
- **可靠性**：建立穩定的安全防護機制

#### 1.2.3 風險降低
- **攻擊面縮減**：消除已知的 XSS、代碼注入攻擊向量
- **事件預防**：建立主動安全監控和警示機制
- **損失控制**：設計安全事件的影響範圍限制策略
- **快速回應**：建立安全事件的快速修復流程

### 1.3 目標使用者與角色

#### 1.3.1 主要使用者
- **資安工程師**：負責安全漏洞修復和驗證
- **前端開發者**：實作安全修復措施和功能擴展
- **系統管理員**：監控系統安全狀態和事件回應

#### 1.3.2 次要使用者
- **產品經理**：確保安全修復不影響用戶體驗
- **測試工程師**：執行安全測試和漏洞驗證
- **合規專員**：確保修復符合法規要求

#### 1.3.3 使用場景
- **日常維護**：持續監控安全狀態，處理安全事件
- **版本發布**：每次發布前進行完整安全驗證
- **事件回應**：快速識別和修復新發現的安全問題
- **合規審查**：定期進行安全合規性檢查

### 1.4 價值主張

#### 1.4.1 直接價值
- **安全防護**：消除已知安全漏洞，建立多層防護機制
- **合規達標**：滿足政府和行業資安標準要求
- **風險控制**：降低資料洩露和系統被攻擊的風險
- **用戶保護**：確保用戶名片資料的安全性和隱私性

#### 1.4.2 間接價值
- **信譽提升**：展現對資安的重視和專業能力
- **成本節約**：預防安全事件發生的潛在損失
- **效率提升**：建立標準化的安全開發流程
- **創新基礎**：為未來功能擴展提供安全的技術基礎

### 1.5 關鍵績效指標 (KPI)

#### 1.5.1 安全指標 (具體且可量測)
- **漏洞修復率**：Critical/High 級別漏洞 100% 修復
- **安全測試通過率**：≥ 99% (SAST, DAST, IAST 測試)
- **合規評分**：OWASP ASVS ≥ 90 分
- **零日漏洞回應時間**：< 24 小時識別和修復

#### 1.5.2 效能指標
- **載入時間影響**：安全修復後載入時間增加 < 5%
- **記憶體使用增加**：< 10% (約 150KB)
- **CPU 使用影響**：安全檢查 CPU 負載增加 < 3%
- **API 回應時間**：安全驗證增加延遲 < 50ms

#### 1.5.3 維護指標
- **修復部署成功率**：≥ 98% (跨平台部署驗證)
- **向下相容性**：100% 現有功能保持正常
- **開發效率影響**：新功能開發時間增加 < 15%
- **文檔完整度**：安全相關文檔覆蓋率 ≥ 95%

## 2. Functional Requirements

### 2.1 XSS 跨站腳本攻擊防護修復

**User Story**: 作為資安工程師，我需要修復所有 XSS 漏洞 (CWE-79/80)，確保用戶輸入不會被惡意執行，保護用戶資料安全。

**Acceptance Criteria**:
- **Given** 系統存在 8 個 XSS 漏洞，分佈在多個核心模組
- **When** 用戶輸入包含惡意腳本或 HTML 標記
- **Then** 系統自動清理和編碼所有用戶輸入
- **And** 所有動態 DOM 操作使用安全的方法 (textContent, createElement)
- **And** 實作上下文感知的輸出編碼 (HTML, JavaScript, URL, CSS)
- **And** 建立統一的輸入驗證和清理函數庫
- **And** 所有受影響的檔案 100% 修復：
  - `bilingual-common.js` (2 個漏洞)
  - `accessibility-language-manager.js` (1 個漏洞)
  - `storage.js` (1 個漏洞)  
  - `unified-component-registry.js` (1 個漏洞)
- **And** 通過 XSS 滲透測試驗證

**已發現的 XSS 漏洞位置**:
```javascript
// CWE-79/80 漏洞示例
// bilingual-common.js:394-395, 609-692
element.innerHTML = userInput; // 危險操作

// storage.js:709-710
container.innerHTML = htmlContent; // 危險操作

// 安全修復方案
element.textContent = sanitizeInput(userInput);
// 或使用安全的 DOM 操作
const safeElement = document.createElement('span');
safeElement.textContent = userInput;
```

**Priority**: P0 (Critical)
**Dependencies**: 現有 v3.2.0 輕量化安全架構、DOMPurify 或類似輸入清理庫

### 2.2 代碼注入攻擊防護修復

**User Story**: 作為資安工程師，我需要修復代碼注入漏洞 (CWE-94)，防止未清理的輸入被當作程式碼執行，確保系統安全性。

**Acceptance Criteria**:
- **Given** 系統存在 2 個代碼注入漏洞，位於核心處理模組
- **When** 系統處理用戶提供的資料或配置
- **Then** 所有動態程式碼執行都經過嚴格驗證和清理
- **And** 禁用不安全的動態程式碼執行方法 (eval, Function, setTimeout with string)
- **And** 實作白名單式的安全配置處理機制
- **And** 建立輸入類型和格式的嚴格驗證
- **And** 所有受影響的檔案 100% 修復：
  - `incremental-dom-updater.js` (1 個漏洞，行 360-370)
  - `transfer-manager.js` (1 個漏洞，行 234-235)
- **And** 通過代碼注入測試驗證

**已發現的代碼注入漏洞位置**:
```javascript
// CWE-94 漏洞示例
// incremental-dom-updater.js:360-370
eval(userProvidedCode); // 極度危險

// transfer-manager.js:234-235
new Function(dynamicCode)(); // 危險操作

// 安全修復方案
// 使用安全的配置解析
const config = JSON.parse(sanitizedInput);
// 使用白名單驗證
if (allowedOperations.includes(operation)) {
  executeOperation(operation);
}
```

**Priority**: P0 (Critical)
**Dependencies**: 現有 v3.2.0 安全架構、JSON Schema 驗證庫

### 2.3 日誌注入攻擊防護修復

**User Story**: 作為資安工程師，我需要修復所有日誌注入漏洞 (CWE-117)，防止攻擊者透過日誌系統進行資料偽造或資訊洩露攻擊。

**Acceptance Criteria**:
- **Given** 系統存在 34 個日誌注入漏洞，分佈在 16 個檔案中
- **When** 系統記錄包含用戶輸入的日誌資訊
- **Then** 所有日誌輸出都經過適當的清理和編碼
- **And** 實作結構化日誌格式，使用 JSON 或類似格式
- **And** 建立統一的安全日誌記錄函數庫
- **And** 移除或編碼所有控制字符和換行符
- **And** 實作敏感資訊遮罩機制 (密碼、個人資料等)
- **And** 所有受影響的檔案 100% 修復：
  - `path-audit.js` (1 個)、`app.js` (1 個)、`component-health-monitor.js` (2 個)
  - `config-cache-manager.js` (1 個)、`config-manager.js` (1 個)、`incremental-dom-updater.js` (1 個)
  - `language-manager.js` (1 個)、`simplified-language-manager.js` (1 個)、`storage.js` (3 個)
  - `unified-component-registry.js` (2 個)、`unified-language-observer.js` (2 個)
  - `card-manager.js` (5 個)、`migration-helper.js` (1 個)、`manifest-manager.js` (1 個)
  - `service-worker-manager.js` (2 個)、`sri-generator.js` (2 個)、`sw.js` (3 個)
- **And** 通過日誌注入測試驗證

**已發現的日誌注入漏洞範例**:
```javascript
// CWE-117 漏洞示例
// 多個檔案中的類似問題
console.log('[App] User input:', userInput); // 危險操作
console.error('Error processing:', errorData); // 危險操作

// 安全修復方案
// 結構化安全日誌
secureLogger.log('user_input_processed', {
  sanitizedInput: sanitizeForLogging(userInput),
  timestamp: new Date().toISOString(),
  source: 'app.js'
});

// 或使用簡單的編碼清理
console.log('[App] User input:', JSON.stringify(userInput));
```

**Priority**: P0 (Critical)  
**Dependencies**: 現有日誌系統、v3.2.0 安全架構擴展

### 2.4 授權檢查缺失修復

**User Story**: 作為資安工程師，我需要修復授權檢查缺失問題 (CWE-862)，確保敏感操作具有適當的權限控制，符合靜態托管環境的安全要求。

**Acceptance Criteria**:
- **Given** 系統存在 8 個授權檢查缺失問題，主要在版本管理和應用核心功能
- **When** 用戶嘗試執行敏感操作 (刪除、匯出、版本管理)
- **Then** 系統進行適當的客戶端權限驗證和用戶確認
- **And** 實作基於會話狀態的權限檢查機制
- **And** 建立操作確認機制，防止意外操作
- **And** 實作使用者意圖驗證 (如：輸入確認碼、雙重確認)
- **And** 記錄所有敏感操作的執行日誌
- **And** 所有受影響的檔案 100% 修復：
  - `app.js` (1 個漏洞，行 361-362)
  - `version-history.js` (1 個漏洞，行 160-161)
  - `version-management-interface.js` (3 個漏洞，行 136-137, 141-142, 263-264)
- **And** 通過權限繞過測試驗證

**已發現的授權檢查缺失位置**:
```javascript
// CWE-862 漏洞示例
// app.js:361-362 和其他檔案
async function deleteAllData() {
  // 直接執行刪除，沒有權限檢查
  await storage.clear();
}

// 安全修復方案
async function deleteAllData() {
  // 1. 檢查操作權限
  if (!this.hasPermission('delete_all')) {
    throw new SecurityError('權限不足');
  }
  
  // 2. 用戶意圖確認
  const confirmation = await this.requestUserConfirmation(
    '確定要刪除所有資料嗎？請輸入 "DELETE" 確認',
    'DELETE'
  );
  
  if (!confirmation) {
    return { success: false, reason: '用戶取消操作' };
  }
  
  // 3. 記錄安全日誌
  secureLogger.logSecurityEvent('data_deletion_attempt', {
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  });
  
  // 4. 執行操作
  await storage.clear();
}
```

**Priority**: P1 (High)
**Dependencies**: v3.2.0 安全架構、用戶確認 UI 組件

### 2.5 逆向 Tabnabbing 攻擊防護修復

**User Story**: 作為資安工程師，我需要修復逆向 Tabnabbing 攻擊漏洞，防止惡意網站透過外部連結劫持原始分頁，保護用戶不受釣魚攻擊。

**Acceptance Criteria**:
- **Given** 系統存在 2 個逆向 Tabnabbing 漏洞，位於外部連結處理
- **When** 用戶點擊外部連結或系統開啟新分頁
- **Then** 所有外部連結都設定適當的安全屬性
- **And** 所有 `target="_blank"` 連結都包含 `rel="noopener noreferrer"`
- **And** 實作連結安全檢查機制，驗證目標 URL 安全性
- **And** 建立外部連結警示機制，告知用戶即將離開當前網站
- **And** 所有受影響的檔案 100% 修復：
  - `app.js` (2 個漏洞，行 1447-1448, 1457-1458)
- **And** 通過 Tabnabbing 攻擊測試驗證

**已發現的逆向 Tabnabbing 漏洞位置**:
```javascript
// Reverse Tabnabbing 漏洞示例
// app.js:1447-1448, 1457-1458
window.open(externalUrl, '_blank'); // 危險操作

// 安全修復方案
// 1. 安全的外部連結開啟
function openExternalLink(url) {
  // 驗證 URL 安全性
  if (!isSecureUrl(url)) {
    throw new SecurityError('不安全的外部連結');
  }
  
  // 用戶確認
  const confirmed = confirm(`即將開啟外部連結：${url}\n確定要繼續嗎？`);
  if (!confirmed) return false;
  
  // 安全開啟
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  // 記錄安全日誌
  secureLogger.logSecurityEvent('external_link_opened', {
    url: sanitizeUrl(url),
    timestamp: Date.now()
  });
  
  return newWindow;
}

// 2. HTML 中的連結修復
<a href="external-url" target="_blank" rel="noopener noreferrer">
```

**Priority**: P1 (High)
**Dependencies**: URL 驗證函數庫、用戶確認 UI

### 2.6 程式碼品質與維護性改善

**User Story**: 作為開發工程師，我需要修復程式碼品質問題，提升系統維護性和穩定性，降低未來引入新漏洞的風險。

**Acceptance Criteria**:
- **Given** 系統存在多個程式碼品質問題影響維護性
- **When** 進行程式碼重構和改善
- **Then** 修復所有已識別的程式碼品質問題
- **And** 實作統一的程式碼風格和最佳實踐
- **And** 建立程式碼審查檢查清單
- **And** 所有受影響的檔案 100% 修復：
  - `database-migration-validator.js` - 修復冗餘 switch 語句 (CWE-705)
  - `enhanced-language-manager.js` - 優化懶載入模組實作 (2 個)
  - `card-manager.js` - 修復陣列刪除操作，使用 splice 取代 delete
- **And** 建立自動化程式碼品質檢查
- **And** 通過程式碼品質掃描驗證

**已發現的程式碼品質問題**:
```javascript
// CWE-705 冗餘 switch 語句
// database-migration-validator.js:356-357
switch(value) {
  case 'single-case':
    return handleSingleCase();
  // 可以簡化為 if 語句
}

// 陣列刪除問題
// card-manager.js:1942-1943
delete array[index]; // 產生 undefined 空隙

// 安全修復方案
switch(value) {
  case 'single-case':
    return handleSingleCase();
  default:
    return handleDefaultCase(); // 加入預設處理
}

// 正確的陣列元素移除
array.splice(index, 1);
```

**Priority**: P2 (Medium)
**Dependencies**: ESLint 規則、程式碼審查流程

## 3. Non-Functional Requirements

### 3.1 Secure by Default 安全框架

#### 3.1.1 輸入驗證與清理 (AuthN/AuthZ)
- 🔒 **統一輸入驗證**：所有用戶輸入經過 sanitizeInput() 函數處理
- 🔒 **上下文感知編碼**：HTML、JavaScript、URL、CSS 不同上下文使用對應編碼
- 🔒 **白名單驗證**：僅允許預定義的安全字符和格式
- 🔒 **類型檢查**：嚴格驗證輸入資料類型和範圍
- 🔒 **長度限制**：所有字符串輸入設定合理長度上限

#### 3.1.2 加密傳輸與靜態加密
- 🔒 **HTTPS Everywhere**：強制所有通訊使用 HTTPS
- 🔒 **HSTS 設定**：啟用 HTTP Strict Transport Security
- 🔒 **本地資料加密**：敏感資料使用 Web Crypto API 加密儲存
- 🔒 **安全隨機數**：使用 crypto.getRandomValues() 生成安全隨機數
- 🔒 **金鑰管理**：實作安全的金鑰導出和輪替機制

#### 3.1.3 安全日誌與稽核
- 🔒 **結構化日誌**：所有安全事件使用 JSON 格式記錄
- 🔒 **敏感資訊遮罩**：密碼、個人資料等自動遮罩
- 🔒 **操作追蹤**：所有敏感操作 (刪除、匯出) 記錄時間戳和上下文
- 🔒 **異常監控**：自動檢測和記錄異常的安全事件
- 🔒 **日誌完整性**：防止日誌被篡改或注入惡意內容

#### 3.1.4 錯誤處理不洩密
- 🔒 **統一錯誤回應**：所有錯誤使用標準化格式，不洩露系統內部資訊
- 🔒 **安全異常類別**：建立 SecurityError 類別，統一處理安全相關錯誤
- 🔒 **用戶友善訊息**：錯誤訊息對用戶有意義，對攻擊者無價值
- 🔒 **錯誤程式碼映射**：內部錯誤程式碼與對外顯示訊息分離
- 🔒 **偵錯資訊控制**：生產環境不顯示詳細堆疊追蹤

#### 3.1.5 率限制/CORS/CSP
- 🔒 **操作率限制**：敏感操作實作客戶端率限制機制
- 🔒 **CORS 政策**：嚴格控制跨來源資源共享
- 🔒 **CSP 標頭**：實作嚴格的內容安全政策，防止 XSS
- 🔒 **Resource Hints**：使用 dns-prefetch, preconnect 等安全載入外部資源
- 🔒 **SRI 檢查**：所有外部資源使用 Subresource Integrity 驗證

### 3.2 Cognitive Load-Friendly 使用者體驗

#### 3.2.1 資訊分塊與組織
- 📋 **模組化修復**：安全修復按 CWE 類型分組，便於理解和測試
- 📋 **優先級分層**：Critical > High > Medium 三級優先級，清楚標示影響
- 📋 **進度追蹤**：提供視覺化修復進度指示器
- 📋 **分階段實施**：3 週分階段修復計劃，降低同時變更風險

#### 3.2.2 合理預設值
- 📋 **安全預設**：所有新功能預設啟用最高安全等級
- 📋 **自動修復**：儘可能提供自動化修復建議和腳本
- 📋 **向下相容**：保持 100% API 相容性，降低學習成本
- 📋 **漸進增強**：安全功能漸進啟用，不破壞現有體驗

#### 3.2.3 可理解文案與說明
- 📋 **中英對照**：重要安全概念提供中英對照說明
- 📋 **實例說明**：每個漏洞類型提供具體程式碼範例
- 📋 **修復指南**：提供步驟化的修復操作指南
- 📋 **影響說明**：清楚說明每個漏洞的潛在影響和風險

#### 3.2.4 可發現性
- 📋 **統一入口點**：所有安全功能透過 security-core.js 統一存取
- 📋 **自動檢測**：自動檢測系統中的安全問題並提供修復建議
- 📋 **文檔索引**：建立完整的安全功能索引和快速查找
- 📋 **最佳實踐**：提供安全開發的最佳實踐指南和檢查清單

### 3.3 效能要求 (性能影響最小化)

#### 3.3.1 載入時間要求
- ⚡ **安全模組載入**：≤ 200ms (已達成，v3.2.0 輕量化架構)
- ⚡ **輸入驗證延遲**：≤ 5ms (每次驗證)
- ⚡ **日誌記錄延遲**：≤ 10ms (非阻塞記錄)
- ⚡ **總體載入影響**：< 5% (相較於修復前)

#### 3.3.2 記憶體使用
- ⚡ **安全模組記憶體**：< 150KB (輕量化架構)
- ⚡ **快取記憶體**：< 50KB (安全驗證快取)
- ⚡ **記憶體洩漏**：零容忍，所有事件監聽器正確清理
- ⚡ **垃圾收集**：最小化物件創建，重用驗證函數

#### 3.3.3 CPU 使用
- ⚡ **輸入清理 CPU**：< 3% (背景處理)
- ⚡ **加密操作 CPU**：< 5% (使用 Web Workers)
- ⚡ **日誌處理 CPU**：< 1% (批次處理)
- ⚡ **總體 CPU 影響**：< 8%

### 3.4 跨平台兼容性要求

#### 3.4.1 瀏覽器支援
- 🌐 **現代瀏覽器**：Chrome 80+, Firefox 75+, Safari 12+, Edge 80+
- 🌐 **Web Crypto API**：支援加密功能的瀏覽器
- 🌐 **ES6+ 支援**：支援現代 JavaScript 語法
- 🌐 **PWA 支援**：支援 Service Worker 和 Web App Manifest

#### 3.4.2 靜態托管平台
- 🌐 **GitHub Pages**：支援子路徑部署和 HTTPS
- 🌐 **Cloudflare Pages**：支援自訂 Headers 和 CSP
- 🌐 **Netlify**：支援 _headers 和 _redirects 配置
- 🌐 **Vercel**：支援 vercel.json 配置
- 🌐 **Firebase Hosting**：支援 firebase.json 配置

#### 3.4.3 行動裝置支援
- 📱 **iOS Safari**：iOS 12+ 完整支援
- 📱 **Android Chrome**：Android 8+ 完整支援
- 📱 **觸控最佳化**：安全確認對話框適配觸控操作
- 📱 **離線功能**：安全功能在離線狀態下正常運作

## 4. Technical Constraints & Assumptions

### 4.1 平台技術限制

#### 4.1.1 靜態托管環境限制
- **無伺服器端處理**：純前端 PWA 架構，無後端 API 支援
- **無伺服器端安全驗證**：無法實作傳統的認證和授權機制
- **無資料庫**：依賴瀏覽器 IndexedDB 本地儲存
- **無 Session 管理**：無法使用傳統的 Session-based 安全機制
- **有限的 Headers 控制**：靜態檔案的 HTTP 標頭設定受限

#### 4.1.2 瀏覽器安全限制
- **同源政策限制**：跨域請求受到嚴格限制
- **本地儲存安全**：IndexedDB 和 localStorage 依賴瀏覽器安全性
- **JavaScript 執行環境**：無法完全防止客戶端程式碼被檢視或修改
- **CSP 實作限制**：部分 CSP 指令在純靜態環境受限
- **Web Crypto API 相容性**：老舊瀏覽器支援有限

### 4.2 現有技術債務與整合點

#### 4.2.1 v3.2.0 輕量化安全架構基礎
- **✅ 現有優勢**：已完成從 12 個安全模組簡化為 3-5 個核心模組
- **✅ ES6 模組化**：pure functional ES6 模組架構，支援 tree-shaking
- **✅ 效能最佳化**：載入時間 <200ms，記憶體使用 <1.5MB
- **🔧 需擴展項目**：CWE-79/80, CWE-94, CWE-117, CWE-862 防護能力
- **🔧 需重構項目**：統一輸入驗證、安全日誌、錯誤處理機制

#### 4.2.2 核心功能相容性要求
- **名片管理功能**：100% 保持現有 CRUD 操作 API
- **版本控制系統**：保持現有版本歷史和回滾功能
- **資料匯入匯出**：安全強化既有的 JSON 匯入匯出功能
- **多語言支援**：保持現有的繁中/英文語言切換
- **無障礙功能**：保持 WCAG 2.1 AA 合規性

#### 4.2.3 現有使用者介面整合
- **Modal 對話框**：擴展現有 SecurityInputHandler 支援安全確認
- **錯誤提示系統**：整合現有錯誤顯示機制
- **進度指示器**：利用現有 UI 組件顯示安全修復進度
- **設定介面**：擴展現有設定頁面加入安全選項

### 4.3 安全架構假設與限制

#### 4.3.1 威脅模型假設
- **信任邊界**：瀏覽器 sandbox 為主要信任邊界
- **攻擊者能力**：假設攻擊者可以檢視和修改客戶端程式碼
- **資料敏感性**：名片資料為個人資料，需適當保護但非高度機密
- **使用者行為**：假設使用者會遵循基本的安全操作指引
- **網路安全**：假設 HTTPS 連線安全可信

#### 4.3.2 合規性要求假設
- **政府法規**：符合數位發展部和個資法基本要求
- **國際標準**：以 OWASP ASVS Level 2 為目標合規標準
- **行業最佳實踐**：遵循前端安全開發最佳實踐
- **稽核準備**：所有安全措施可供第三方審計驗證

#### 4.3.3 技術演進假設
- **瀏覽器 API 穩定性**：Web Crypto API、IndexedDB 等將持續支援
- **靜態托管平台演進**：主流平台將持續改善安全功能支援
- **JavaScript 生態系統**：ES6+ 語法和安全函數庫持續可用
- **PWA 標準發展**：PWA 相關標準將持續向前相容

### 4.4 外部依賴與風險管控

#### 4.4.1 核心安全依賴
- **DOMPurify**：HTML 清理函數庫 (或輕量級替代方案)
- **Web Crypto API**：瀏覽器原生加密功能
- **JSON Schema Validator**：輸入驗證和結構檢查
- **CSP Generator**：內容安全政策生成工具
- **Subresource Integrity**：外部資源完整性驗證

#### 4.4.2 開發和測試依賴
- **Jest**：JavaScript 測試框架，支援安全測試
- **ESLint Security Plugin**：程式碼安全規則檢查
- **OWASP ZAP**：自動化安全測試工具
- **Lighthouse**：PWA 和安全性評分工具
- **GitHub Actions**：CI/CD 和自動化安全掃描

#### 4.4.3 風險緩解策略
- **依賴最小化**：優先使用瀏覽器原生 API，減少第三方依賴
- **版本固定**：所有外部依賴固定版本，定期安全更新
- **備援方案**：關鍵功能提供 fallback 實作
- **隔離部署**：安全相關變更先在測試環境完整驗證
- **快速回滾**：準備完整的回滾策略和流程

## 5. Architecture Reuse Plan (重點章節)

### 5.1 Reuse Mapping - 安全漏洞修復與現有架構映射

| 安全需求功能 | 現有模組/服務/API | 複用方式 | 擴展需求 | 技術複雜度 |
|-------------|------------------|----------|----------|------------|
| **XSS 防護 (CWE-79/80)** | `input-sanitizer.js` (v3.2.0) | **擴展複用** | 新增上下文感知編碼、DOM 安全操作 | 中等 |
| **代碼注入防護 (CWE-94)** | `data-validator.js` (v3.2.0) | **擴展複用** | 新增白名單驗證、動態執行檢查 | 高 |
| **日誌注入防護 (CWE-117)** | 無 (需新建) | **新建** | 建立結構化安全日誌系統 | 中等 |
| **授權檢查 (CWE-862)** | `SecurityAuthHandler.js` | **重構複用** | 適配靜態托管、用戶意圖確認 | 中等 |
| **Tabnabbing 防護** | 無 (需新建) | **新建** | 外部連結安全處理機制 | 低 |
| **程式碼品質** | ESLint 配置 | **擴展複用** | 新增安全規則、自動修復 | 低 |

### 5.2 Extension Plan - 現有 v3.2.0 安全架構擴展策略

#### 5.2.1 基於現有輕量化安全核心的擴展

**現有架構基礎 (v3.2.0)**：
```javascript
// 已有的核心安全模組
pwa-card-storage/src/security/
├── security-core.js           ✅ 統一入口點，需擴展 CWE 防護
├── input-sanitizer.js         ✅ 基礎輸入清理，需強化 XSS 防護
├── data-validator.js          ✅ 基礎驗證，需加入代碼注入防護
├── storage-secure.js          ✅ 加密儲存，功能完善
├── migration-helper.js        ✅ 向下相容，需擴展日誌清理
└── smoke-tests.js            ✅ 基礎測試，需加入安全測試案例
```

**擴展計劃**：
```javascript
// 擴展後的安全模組架構
pwa-card-storage/src/security/
├── security-core.js           🔧 擴展：統一 CWE 防護入口點
├── input-sanitizer.js         🔧 擴展：上下文感知編碼、DOM 安全
├── data-validator.js          🔧 擴展：白名單驗證、代碼注入檢查
├── storage-secure.js          ✅ 保持：現有功能完善
├── migration-helper.js        🔧 擴展：日誌清理、安全遷移
├── smoke-tests.js            🔧 擴展：完整 CWE 安全測試套件
├── secure-logger.js          🆕 新增：結構化安全日誌系統
├── authorization-handler.js  🆕 新增：靜態托管權限檢查
├── external-link-handler.js  🆕 新增：Tabnabbing 防護
└── security-error-handler.js 🆕 新增：統一安全錯誤處理
```

#### 5.2.2 漸進式擴展策略

**Phase 1 (Week 1): 核心防護強化**
- 擴展 `input-sanitizer.js` 支援 CWE-79/80 防護
- 擴展 `data-validator.js` 支援 CWE-94 防護
- 新增 `secure-logger.js` 解決 CWE-117 問題
- 修復 Critical 級別的 47 個安全漏洞

**Phase 2 (Week 2): 權限與連結安全**
- 新增 `authorization-handler.js` 解決 CWE-862 問題
- 新增 `external-link-handler.js` 防護 Tabnabbing
- 新增 `security-error-handler.js` 統一錯誤處理
- 修復 High 級別的 8 個安全漏洞

**Phase 3 (Week 3): 整合測試與品質**
- 擴展 `smoke-tests.js` 完整安全測試覆蓋
- 程式碼品質改善和 ESLint 規則強化
- 整合測試和效能驗證
- 修復 Medium 級別的 3 個品質問題

### 5.3 Build vs. Buy vs. Reuse 決策分析

| 功能模組 | 決策 | 理由 | 成本評估 | 風險評估 | 建議實作方式 |
|---------|------|------|----------|----------|-------------|
| **XSS 防護強化** | **Reuse + Extend** | 基於現有 input-sanitizer.js | 低 (100 行) | 低 | 擴展現有函數 |
| **代碼注入防護** | **Reuse + Extend** | 基於現有 data-validator.js | 中 (200 行) | 中 | 新增白名單機制 |
| **結構化日誌** | **Build** | 專案特定需求，市面無輕量方案 | 中 (300 行) | 低 | 純 JavaScript 實作 |
| **權限檢查** | **Reuse + Refactor** | 改造現有 SecurityAuthHandler | 中 (250 行) | 中 | 適配靜態托管 |
| **連結安全** | **Build** | 簡單功能，Build 比 Buy 划算 | 低 (150 行) | 低 | 原生 JavaScript |
| **安全測試** | **Buy + Integrate** | Jest + OWASP ZAP 整合 | 低 (配置) | 低 | CI/CD 整合 |
| **HTML 清理** | **Buy** | DOMPurify (輕量版 ~25KB) | 低 | 低 | NPM 套件 |
| **JSON 驗證** | **Build** | 簡單 schema 驗證即可 | 低 (100 行) | 低 | 原生實作 |

**決策原則**：
1. **🏆 Reuse First**: 優先擴展現有 v3.2.0 安全架構
2. **⚡ Performance**: 保持 <200ms 載入時間和 <1.5MB 記憶體
3. **🔧 Simplicity**: 避免過度工程化，專注解決已發現漏洞
4. **📏 Minimal Dependencies**: 最少外部依賴，優先原生 API

### 5.4 Migration & Deprecation - 3週分階段實施策略

#### 5.4.1 向下相容性保證機制
```javascript
// 向下相容性包裝器範例
// security-core.js 中的相容層
export function sanitizeInput(input, options = {}) {
  // v3.2.1 新增上下文感知功能
  if (options.context) {
    return contextAwareSanitize(input, options.context);
  }
  
  // v3.2.0 原有功能保持不變
  return legacySanitize(input);
}

// 漸進升級警告
export function validateInput(input) {
  console.warn('[Security] validateInput is deprecated, use sanitizeInput instead');
  return sanitizeInput(input);
}
```

#### 5.4.2 分階段部署與回滾策略

**Week 1: Critical 安全漏洞修復**
- **部署範圍**: 測試環境 + 1% 生產流量
- **回滾觸發**: 任何功能異常或效能下降 >10%
- **監控指標**: 載入時間、JavaScript 錯誤率、功能可用性
- **驗證標準**: 所有 Critical CWE 漏洞掃描通過

**Week 2: High 風險漏洞修復**
- **部署範圍**: 10% 生產流量 (A/B Test)
- **回滾觸發**: 用戶體驗回饋負面或安全測試失敗
- **監控指標**: 用戶操作成功率、安全事件數量
- **驗證標準**: OWASP ASVS Level 2 測試通過

**Week 3: 完整部署與驗證**
- **部署範圍**: 100% 生產環境
- **回滾策略**: 即時回滾至 v3.2.0 (保留完整備份)
- **成功標準**: 連續 72 小時無安全事件、效能指標達標
- **文檔更新**: 完整安全功能使用指南和 API 文檔

#### 5.4.3 資料相容性與安全狀態遷移
```json
{
  "migration_strategy": {
    "user_data": "無需遷移，IndexedDB 結構保持不變",
    "security_settings": "新增預設安全設定，不影響現有功能",
    "log_format": "向下相容，漸進升級為結構化格式",
    "api_contracts": "100% 保持現有 API 簽章不變"
  },
  "rollback_plan": {
    "code_rollback": "Git tag v3.2.0 即時回滾",
    "data_rollback": "使用 localStorage backup 機制",
    "config_rollback": "自動偵測並使用舊版配置",
    "user_notification": "透過現有 UI 通知系統告知用戶"
  }
}

## 6. Security & Privacy Requirements

### 6.1 威脅模型概覽 - 基於已發現漏洞分析

| 威脅分類 | 具體威脅 | 風險等級 | 影響範圍 | 緩解措施 | 實作優先級 |
|---------|---------|---------|---------|----------|------------|
| **注入攻擊** | XSS (CWE-79/80) | Critical | 用戶資料洩露、會話劫持 | 統一輸入清理、DOM 安全操作 | P0 |
| **注入攻擊** | 代碼注入 (CWE-94) | Critical | 任意程式碼執行 | 白名單驗證、禁用動態執行 | P0 |
| **注入攻擊** | 日誌注入 (CWE-117) | Critical | 日誌偽造、資訊洩露 | 結構化日誌、輸入清理 | P0 |
| **授權缺失** | 權限繞過 (CWE-862) | High | 未授權操作執行 | 操作確認、意圖驗證 | P1 |
| **連結安全** | 逆向 Tabnabbing | High | 釣魚攻擊、會話劫持 | rel="noopener noreferrer" | P1 |
| **程式碼品質** | 維護性問題 | Medium | 未來安全漏洞風險 | 程式碼品質改善、自動檢查 | P2 |

### 6.2 資料分類與最小權限原則

#### 6.2.1 敏感資料分類
```javascript
// 資料敏感性分級
const DATA_CLASSIFICATION = {
  PUBLIC: {
    level: 0,
    examples: ['UI 標籤', '系統配置', '靜態資源'],
    protection: '基本 XSS 防護'
  },
  PERSONAL: {
    level: 1, 
    examples: ['姓名', '職稱', '公司資訊', '聯絡方式'],
    protection: '加密儲存 + 存取日誌'
  },
  SENSITIVE: {
    level: 2,
    examples: ['匯入/匯出資料', '系統操作日誌'],
    protection: '強加密 + 完整性檢查 + 稽核追蹤'
  }
};
```

#### 6.2.2 最小權限實作策略
- **操作權限**: 敏感操作需要明確的用戶確認
- **資料存取**: 僅讀取執行操作所需的最少資料
- **功能權限**: 預設停用非必要的進階功能
- **時間限制**: 敏感操作設定合理的時間窗口

### 6.3 審計需求與合規框架

#### 6.3.1 安全事件審計追蹤
```javascript
// 安全事件類別與記錄要求
const SECURITY_AUDIT_EVENTS = {
  INPUT_SANITIZATION: {
    event: 'input_sanitized',
    level: 'INFO',
    fields: ['input_hash', 'sanitization_type', 'timestamp'],
    retention: '30 days'
  },
  AUTHORIZATION_CHECK: {
    event: 'authorization_verified', 
    level: 'WARN',
    fields: ['operation', 'user_confirmation', 'timestamp'],
    retention: '90 days'
  },
  SECURITY_VIOLATION: {
    event: 'security_violation_detected',
    level: 'ERROR', 
    fields: ['violation_type', 'context', 'user_agent', 'timestamp'],
    retention: '1 year'
  }
};
```

#### 6.3.2 合規性驗證清單
- **✅ OWASP ASVS Level 2**: 應用程式安全驗證標準
- **✅ 個資法遵循**: 個人資料保護法基本要求
- **✅ 政府資安規範**: 數位發展部相關資安指引
- **✅ PWA 安全標準**: W3C PWA 安全最佳實踐
- **✅ 無障礙合規**: WCAG 2.1 AA 持續合規

#### 6.3.3 定期安全檢查機制
- **每週**: 自動化 SAST/DAST 掃描
- **每月**: 人工安全程式碼審查  
- **每季**: 第三方滲透測試
- **每年**: 完整安全架構評估

### 6.4 隱私保護與透明度

#### 6.4.1 資料最小化原則
- **收集最小化**: 僅處理名片管理必要的個人資料
- **使用最小化**: 資料僅用於宣稱的名片儲存目的
- **保存最小化**: 提供資料保存期限設定選項
- **分享最小化**: 預設不分享任何個人資料

#### 6.4.2 用戶控制與透明度
```javascript
// 隱私控制選項
const PRIVACY_CONTROLS = {
  data_retention: {
    options: ['30天', '1年', '永久'],
    default: '1年'
  },
  export_format: {
    options: ['JSON', 'vCard', '加密JSON'],
    default: '加密JSON'  
  },
  logging_level: {
    options: ['基本', '詳細', '停用'],
    default: '基本'
  }
};
```

#### 6.4.3 透明度報告機制
- **資料處理說明**: 清楚說明所有資料處理活動
- **安全措施公開**: 公開採用的安全保護措施
- **漏洞修復時程**: 公開安全漏洞修復進度
- **隱私政策更新**: 重大隱私政策變更主動通知用戶

## 7. Measurement & Validation Plan

### 7.1 安全漏洞修復驗證策略

#### 7.1.1 分階段驗證測試矩陣

| 安全類別 | 測試類型 | 驗證工具 | 通過標準 | 執行頻率 | 責任人 |
|---------|---------|---------|---------|---------|--------|
| **XSS 防護** | SAST + 滲透測試 | ESLint Security + OWASP ZAP | 0 個 XSS 漏洞 | 每次提交 | 資安工程師 |
| **代碼注入** | Code Review + 動態測試 | 人工審查 + 自動掃描 | 0 個動態執行漏洞 | 每次發布 | 技術主管 |
| **日誌注入** | 日誌分析 + 模糊測試 | 自訂測試腳本 | 100% 結構化日誌 | 每日 | 開發工程師 |
| **授權檢查** | 功能測試 + 用戶測試 | Cypress + 手動測試 | 所有敏感操作需確認 | 每次發布 | QA 工程師 |
| **連結安全** | 自動掃描 + 手動驗證 | 連結檢查器 + 人工測試 | 100% 安全屬性設定 | 每週 | 前端工程師 |

#### 7.1.2 KPI 量測方法與資料來源

**安全指標量測**：
```javascript
// 安全指標監控系統
const SECURITY_METRICS = {
  vulnerability_count: {
    source: 'SAST/DAST 掃描報告',
    measurement: '每日自動掃描結果統計',
    target: 'Critical: 0, High: 0, Medium: ≤ 3',
    alert_threshold: 'Critical > 0 或 High > 2'
  },
  security_test_coverage: {
    source: 'Jest 測試報告 + 安全測試套件',
    measurement: '安全相關程式碼行覆蓋率',
    target: '≥ 95%',
    alert_threshold: '< 90%'
  },
  incident_response_time: {
    source: '安全事件追蹤系統',
    measurement: '從發現到修復完成時間',
    target: 'Critical: < 24h, High: < 72h',
    alert_threshold: '超過目標時間 50%'
  }
};
```

**效能指標量測**：
```javascript
// 效能監控配置
const PERFORMANCE_METRICS = {
  security_overhead: {
    measurement: '安全功能載入時間影響',
    baseline: 'v3.2.0 載入時間',
    target: '增加 < 5%',
    data_source: 'Lighthouse + Real User Monitoring'
  },
  memory_usage: {
    measurement: '安全模組記憶體消耗',
    target: '< 150KB',
    data_source: 'Chrome DevTools Memory Profiler'
  },
  validation_performance: {
    measurement: '輸入驗證平均處理時間',
    target: '< 5ms per validation',
    data_source: '自訂效能監控'
  }
};
```

### 7.2 自動化驗收測試流程

#### 7.2.1 CI/CD 整合安全測試
```yaml
# .github/workflows/security-validation.yml
name: Security Vulnerability Remediation Validation

on:
  pull_request:
    paths: ['pwa-card-storage/src/**']
  push:
    branches: [v3.2.1-security-fixes]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Static Security Analysis
        run: |
          npm run security:sast
          npm run security:dependency-check
          
      - name: XSS Vulnerability Test
        run: |
          npm run test:security:xss
          
      - name: Code Injection Test  
        run: |
          npm run test:security:injection
          
      - name: Log Injection Test
        run: |
          npm run test:security:log-injection
          
      - name: Authorization Bypass Test
        run: |
          npm run test:security:authorization
          
      - name: Performance Regression Test
        run: |
          npm run test:performance:security-overhead
          
      - name: Generate Security Report
        run: |
          npm run security:generate-report
          
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: reports/
```

#### 7.2.2 驗收標準對應表

| 需求編號 | 驗收條件 | 測試案例 | 自動化測試 | 通過標準 |
|---------|---------|---------|------------|----------|
| **REQ-2.1** | XSS 漏洞 100% 修復 | `test-xss-protection.spec.js` | ✅ 自動化 | 8 個漏洞全部修復 |
| **REQ-2.2** | 代碼注入漏洞修復 | `test-code-injection.spec.js` | ✅ 自動化 | 2 個漏洞全部修復 |
| **REQ-2.3** | 日誌注入漏洞修復 | `test-log-injection.spec.js` | ✅ 自動化 | 34 個漏洞全部修復 |
| **REQ-2.4** | 授權檢查實作 | `test-authorization.spec.js` | ✅ 自動化 | 8 個缺失全部修復 |
| **REQ-2.5** | Tabnabbing 防護 | `test-tabnabbing.spec.js` | ✅ 自動化 | 2 個漏洞全部修復 |
| **REQ-2.6** | 程式碼品質改善 | ESLint + 人工審查 | ⚠️ 半自動 | 3 個品質問題修復 |

### 7.3 效能與合規性驗證

#### 7.3.1 效能基準測試
```javascript
// 效能基準測試配置
const PERFORMANCE_BENCHMARKS = {
  load_time: {
    before_fix: 'v3.2.0 基準值',
    after_fix: 'v3.2.1 測試值',
    target: '增加 < 5%',
    measurement_tool: 'Lighthouse CI'
  },
  memory_usage: {
    security_modules: '< 150KB',
    total_overhead: '< 10%',
    measurement_tool: 'Chrome DevTools'
  },
  user_interaction: {
    input_validation_delay: '< 5ms',
    security_confirmation_time: '< 100ms',
    measurement_tool: '自訂效能監控'
  }
};
```

#### 7.3.2 合規性驗證檢查
```bash
#!/bin/bash
# 合規性自動檢查腳本

echo "🔍 開始安全合規性檢查..."

# OWASP ASVS Level 2 檢查
echo "檢查 OWASP ASVS Level 2 合規性..."
npm run compliance:owasp-asvs

# CWE 漏洞修復驗證  
echo "驗證 CWE 漏洞修復狀態..."
npm run security:cwe-validation

# 政府資安規範檢查
echo "檢查政府資安規範合規性..."
npm run compliance:gov-security

# PWA 安全標準檢查
echo "驗證 PWA 安全標準..."
npm run compliance:pwa-security

# 無障礙性檢查
echo "驗證無障礙性合規..."
npm run compliance:accessibility

echo "✅ 合規性檢查完成"
```

### 7.4 用戶驗收與回饋機制

#### 7.4.1 用戶驗收測試 (UAT)
- **測試用戶群**: 5-10 位內部用戶 + 3-5 位外部測試者
- **測試場景**: 日常名片管理操作 + 安全功能測試
- **成功標準**: 
  - 功能可用性: ≥ 95% (無功能異常)
  - 用戶體驗: ≥ 4.0/5.0 (滿意度調查)
  - 安全感知: ≥ 90% 用戶認為系統更安全

#### 7.4.2 持續監控與回饋循環
```javascript
// 用戶回饋收集機制
const USER_FEEDBACK_SYSTEM = {
  security_perception: {
    question: '您覺得系統安全性是否有改善？',
    scale: '1-5 分',
    target: '平均分 ≥ 4.0'
  },
  performance_impact: {
    question: '安全修復是否影響系統效能？',
    options: ['無影響', '輕微影響', '明顯影響'],
    target: '≥ 80% 選擇「無影響」或「輕微影響」'
  },
  functionality_integrity: {
    question: '所有功能是否正常運作？',
    type: 'checklist',
    target: '100% 功能正常'
  }
};
```

## 8. Appendix

### 8.1 安全漏洞詳細清單

#### 8.1.1 CWE 分類統計
```
🔴 Critical 級別漏洞 (47個)
├── CWE-79/80 - XSS 跨站腳本攻擊: 8個
├── CWE-94 - 代碼注入攻擊: 2個  
└── CWE-117 - 日誌注入攻擊: 37個

🟡 High 級別漏洞 (8個)
├── CWE-862 - 授權檢查缺失: 6個
└── Reverse Tabnabbing: 2個

⚪ Medium 級別問題 (3個)
├── CWE-705 - 冗餘程式碼結構: 1個
├── 懶載入模組問題: 2個
└── 陣列操作問題: 1個
```

#### 8.1.2 受影響檔案分布
| 檔案類別 | 檔案數量 | 漏洞總數 | 主要問題類型 |
|---------|---------|---------|-------------|
| **核心邏輯檔案** | 8 個 | 25 個 | XSS, 日誌注入, 授權缺失 |
| **工具與管理檔案** | 6 個 | 15 個 | 日誌注入, 代碼注入 |
| **UI 與介面檔案** | 4 個 | 8 個 | 授權缺失, Tabnabbing |
| **安全與部署檔案** | 2 個 | 2 個 | 日誌注入 |

### 8.2 安全修復實作指南

#### 8.2.1 XSS 防護實作範例
```javascript
// ❌ 不安全的做法
function updateContent(userInput) {
  document.getElementById('content').innerHTML = userInput;
}

// ✅ 安全的做法
import { sanitizeInput, contextAwareEncode } from './security-core.js';

function updateContent(userInput) {
  // 1. 輸入清理
  const cleanInput = sanitizeInput(userInput, {
    allowedTags: [],
    allowedAttributes: {}
  });
  
  // 2. 上下文感知編碼
  const encodedContent = contextAwareEncode(cleanInput, 'html');
  
  // 3. 安全 DOM 操作
  const contentElement = document.getElementById('content');
  contentElement.textContent = encodedContent;
  
  // 4. 安全日誌記錄
  secureLogger.log('content_updated', {
    inputLength: userInput.length,
    sanitizedLength: cleanInput.length,
    timestamp: Date.now()
  });
}
```

#### 8.2.2 日誌注入防護實作範例
```javascript
// ❌ 不安全的做法
console.log('[App] User data:', userData);
console.error('Processing failed:', error.message);

// ✅ 安全的做法
import { createSecureLogger } from './security-core.js';

const secureLogger = createSecureLogger({
  level: 'info',
  format: 'json',
  sanitization: true
});

// 結構化安全日誌
secureLogger.info('user_data_processed', {
  dataType: typeof userData,
  dataSize: JSON.stringify(userData).length,
  timestamp: new Date().toISOString(),
  source: 'app.js'
});

secureLogger.error('processing_failed', {
  errorType: error.constructor.name,
  errorCode: error.code || 'unknown',
  timestamp: new Date().toISOString(),
  source: 'app.js'
});
```

#### 8.2.3 授權檢查實作範例
```javascript
// ❌ 缺少授權檢查
async function deleteUserData() {
  await storage.clear();
  showNotification('所有資料已刪除');
}

// ✅ 安全的授權檢查
async function deleteUserData() {
  // 1. 權限檢查
  if (!hasPermission('delete_all_data')) {
    throw new SecurityError('權限不足：無法刪除所有資料');
  }
  
  // 2. 用戶意圖確認
  const confirmation = await showSecureConfirmation({
    title: '危險操作確認',
    message: '此操作將永久刪除所有名片資料，無法復原。',
    confirmText: 'DELETE',
    requireTextMatch: true,
    timeout: 30000 // 30秒超時
  });
  
  if (!confirmation.confirmed) {
    secureLogger.warn('data_deletion_cancelled', {
      reason: confirmation.reason,
      timestamp: Date.now()
    });
    return;
  }
  
  // 3. 執行操作
  try {
    await storage.clear();
    
    // 4. 安全日誌記錄
    secureLogger.info('all_data_deleted', {
      userConfirmation: true,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.substring(0, 100)
    });
    
    showNotification('所有資料已安全刪除');
  } catch (error) {
    secureLogger.error('data_deletion_failed', {
      errorType: error.constructor.name,
      timestamp: Date.now()
    });
    throw error;
  }
}
```

### 8.3 測試案例與驗證腳本

#### 8.3.1 XSS 防護測試套件
```javascript
// test/security/xss-protection.test.js
describe('XSS Protection Tests', () => {
  const maliciousInputs = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<svg onload="alert(1)">',
    '"><script>alert(document.cookie)</script>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>'
  ];
  
  test('should sanitize all malicious XSS inputs', () => {
    maliciousInputs.forEach(input => {
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onload=');
    });
  });
  
  test('should handle DOM manipulation safely', () => {
    const testContainer = document.createElement('div');
    const maliciousContent = '<script>window.hacked=true</script>';
    
    // 使用安全函數更新內容
    updateContentSecurely(testContainer, maliciousContent);
    
    expect(window.hacked).toBeUndefined();
    expect(testContainer.innerHTML).not.toContain('<script');
  });
});
```

#### 8.3.2 自動化安全掃描腳本
```bash
#!/bin/bash
# security-scan.sh - 自動化安全掃描腳本

echo "🔍 開始安全漏洞掃描..."

# 1. SAST 靜態分析
echo "執行靜態程式碼分析..."
npm run lint:security 2>&1 | tee reports/sast-results.log

# 2. 依賴安全檢查
echo "檢查依賴套件安全性..."
npm audit --audit-level moderate 2>&1 | tee reports/dependency-audit.log

# 3. XSS 漏洞掃描
echo "掃描 XSS 漏洞..."
grep -r "innerHTML\s*=" src/ --include="*.js" > reports/xss-scan.log
grep -r "document\.write" src/ --include="*.js" >> reports/xss-scan.log

# 4. 代碼注入掃描
echo "掃描代碼注入漏洞..."
grep -r "eval\s*(" src/ --include="*.js" > reports/injection-scan.log
grep -r "Function\s*(" src/ --include="*.js" >> reports/injection-scan.log
grep -r "setTimeout.*string" src/ --include="*.js" >> reports/injection-scan.log

# 5. 日誌注入掃描
echo "掃描日誌注入漏洞..."
grep -r "console\.\w*\s*(" src/ --include="*.js" | grep -v "JSON.stringify" > reports/log-injection-scan.log

# 6. 授權檢查掃描
echo "檢查授權機制..."
grep -r "delete\|clear\|remove" src/ --include="*.js" | grep -v "hasPermission\|checkAuth" > reports/authorization-scan.log

# 7. 生成綜合報告
echo "生成安全掃描報告..."
node scripts/generate-security-report.js

echo "✅ 安全掃描完成，報告位於 reports/ 目錄"
```

### 8.4 風險評估與緩解策略

#### 8.4.1 實作風險分析
| 風險類別 | 風險等級 | 影響描述 | 機率 | 緩解策略 |
|---------|---------|---------|------|----------|
| **功能破壞** | High | 安全修復導致現有功能異常 | 30% | 完整回歸測試、分階段部署 |
| **效能劣化** | Medium | 安全檢查增加系統負載 | 50% | 效能基準測試、異步處理 |
| **相容性問題** | Medium | 新安全機制與舊瀏覽器不相容 | 40% | Polyfill、優雅降級 |
| **用戶體驗** | Low | 安全確認增加操作複雜度 | 60% | UX 設計優化、智能提示 |

#### 8.4.2 時程風險控制
```mermaid
gantt
    title 安全修復時程與風險控制點
    dateFormat  YYYY-MM-DD
    section Phase 1 Critical
    XSS 防護修復      :crit, xss, 2025-08-08, 5d
    代碼注入防護      :crit, injection, 2025-08-10, 4d
    日誌注入修復      :crit, logging, 2025-08-12, 3d
    風險檢查點 1      :milestone, m1, 2025-08-15, 0d
    
    section Phase 2 High  
    授權檢查實作      :high, auth, 2025-08-15, 4d
    連結安全防護      :high, links, 2025-08-17, 2d
    風險檢查點 2      :milestone, m2, 2025-08-22, 0d
    
    section Phase 3 Integration
    整合測試         :test, 2025-08-22, 3d
    效能驗證         :perf, 2025-08-24, 2d
    部署驗證         :deploy, 2025-08-26, 2d
    最終檢查點       :milestone, final, 2025-08-29, 0d
```

### 8.5 合規性檢查表

#### 8.5.1 OWASP ASVS Level 2 合規檢查
```
✅ V1.2.2 - 驗證所有輸入驗證失敗都會被安全記錄
✅ V2.1.1 - 驗證應用程式會驗證和清理所有用戶輸入
✅ V2.1.2 - 驗證應用程式會針對不同輸出上下文使用適當編碼
✅ V3.2.1 - 驗證會話 token 使用安全隨機數產生器生成
✅ V4.1.1 - 驗證應用程式確保存取控制規則在受信任的伺服器端被強制執行
✅ V5.1.1 - 驗證應用程式有防禦機制來防止 XSS 攻擊
✅ V7.1.1 - 驗證應用程式不會記錄敏感資料
✅ V9.1.1 - 驗證 URL 不會洩露敏感資訊
✅ V10.2.1 - 驗證應用程式會檢查惡意檔案上傳
✅ V11.1.1 - 驗證應用程式只允許存取明確授權的業務邏輯流程
```

#### 8.5.2 政府資安規範符合性
- ✅ **個資法第 8 條**: 個人資料之蒐集，應有特定目的，並應告知當事人
- ✅ **個資法第 9 條**: 蒐集個人資料，應尊重當事人之權益
- ✅ **數位發展部資安指引**: 系統應具備適當之存取控制機制
- ✅ **政府網站建置準則**: 應符合無障礙網頁規範 AA 等級

### 8.6 技術名詞表
- **SAST (Static Application Security Testing)**: 靜態應用程式安全測試
- **DAST (Dynamic Application Security Testing)**: 動態應用程式安全測試
- **CWE (Common Weakness Enumeration)**: 常見弱點列舉
- **OWASP ASVS**: 開放網路軟體安全計畫應用程式安全驗證標準
- **XSS (Cross-Site Scripting)**: 跨站腳本攻擊
- **CSP (Content Security Policy)**: 內容安全政策
- **SRI (Subresource Integrity)**: 子資源完整性
- **Tabnabbing**: 分頁劫持攻擊

### 8.7 參考資源與標準
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2021/2021_cwe_top25.html)
- [MDN Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)
- [W3C PWA Security Best Practices](https://www.w3.org/TR/appmanifest/#security-privacy)
- [個人資料保護法](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021)
- [數位發展部資安指引](https://moda.gov.tw)

### 8.8 決策記錄 (ADR)

#### ADR-001: 選擇擴展現有 v3.2.0 安全架構而非重建
**日期**: 2025-08-08  
**狀態**: 已決定  
**決策者**: 技術架構師, 資安工程師  

**背景**: 需要修復 58 個安全漏洞，可選擇重建或擴展現有架構。

**決策**: 基於現有 v3.2.0 輕量化安全架構進行擴展
- **理由**: 已有穩定基礎，效能優秀 (<200ms 載入)，向下相容性佳
- **風險**: 受限於現有架構設計限制
- **替代方案**: 完全重建安全系統 (評估為成本過高、風險過大)

#### ADR-002: 採用分階段 3 週修復策略
**日期**: 2025-08-08  
**狀態**: 已決定  
**決策者**: 產品經理, 開發團隊  

**背景**: 58 個安全問題需要平衡修復速度與穩定性。

**決策**: 分 3 個階段修復，每週一個階段
- **Week 1**: Critical 漏洞 (XSS, 代碼注入, 日誌注入)
- **Week 2**: High 風險漏洞 (授權檢查, Tabnabbing)  
- **Week 3**: 整合測試與品質改善
- **理由**: 降低單次變更風險，便於問題定位和回滾

---

**文檔版本**: v3.2.1-security-vulnerability-remediation  
**最後更新**: 2025-08-08  
**文檔狀態**: Ready for Technical Design  
**下一步行動**: 交由 technical-architect 進行詳細技術設計

## Handoff 通知

✅ **PRD 已完成**，請 technical-architect 接手進行技術設計：

**移交內容**:
- req_sections: 6 個主要安全功能需求 (XSS, 代碼注入, 日誌注入, 授權檢查, Tabnabbing, 程式碼品質)
- kpis: 安全指標 (0 個 Critical 漏洞)、效能指標 (載入時間增加 <5%)、維護指標 (向下相容 100%)
- security_reqs: OWASP ASVS Level 2 合規、CWE 防護、政府資安規範符合
- ux_principles: Secure by Default、Cognitive Load-Friendly、架構重用優先

**技術設計重點**:
1. 基於 v3.2.0 安全架構的擴展設計
2. 58 個安全漏洞的具體修復技術方案  
3. 3 週分階段實施的詳細技術規劃
4. 效能影響最小化的技術策略
5. 100% 向下相容的技術保證機制