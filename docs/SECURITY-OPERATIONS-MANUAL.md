# 安全操作手冊

## 概述
本手冊提供 NFC 數位名片系統的完整安全操作指引，涵蓋日常維護、事件回應、監控告警等關鍵安全操作程序。

## 🔒 安全架構概覽

### 三層安全防護
- **輸入層**: SecurityInputHandler - 輸入驗證與清理
- **認證層**: SecurityAuthHandler - 授權檢查與會話管理
- **資料層**: SecurityDataHandler - XSS防護與安全儲存

### PWA 匯入功能安全漏洞狀態 (已修復完成)
- ✅ **SEC-PWA-001**: 檔案上傳攻擊 (CWE-434) - 已完成修復並通過測試
- ✅ **SEC-PWA-002**: JSON.parse Prototype Pollution (CWE-1321) - 已完成修復並通過測試
- ✅ **SEC-PWA-003**: 授權檢查缺失 (CWE-862) - 已完成修復並通過測試
- ✅ **SEC-PWA-004**: PII 資料洩露 (CWE-359) - 已完成修復並通過測試
- ✅ **SEC-PWA-005**: 不安全的檔案處理 (CWE-73) - 已完成修復並通過測試
- ✅ **SEC-PWA-006**: 資料注入攻擊 (CWE-74) - 已完成修復並通過測試
- ✅ **SEC-PWA-007**: 不安全的反序列化 (CWE-502) - 已完成修復並通過測試
- ✅ **SEC-PWA-008**: 錯誤處理資訊洩露 (CWE-209) - 已完成修復並通過測試

### 已修復的安全漏洞
- ✅ SEC-001: 生產環境 prompt() 使用 (Critical)
- ✅ SEC-002: 不安全密碼輸入 (Critical)
- ✅ SEC-003: confirm() 對話框濫用 (Critical)
- ✅ SEC-004: 日誌注入漏洞 CWE-117 (High)
- ✅ SEC-005: XSS漏洞 CWE-79 (High)
- ✅ SEC-006: 授權檢查缺失 CWE-862 (High)

## 📋 日常安全操作

### 1. 安全狀態檢查
```javascript
// 執行完整安全測試
const results = await SecurityTestSuite.runAllTests();
console.log(`安全測試結果: ${results.passed} 通過, ${results.failed} 失敗`);

// 執行滲透測試
const penTest = await SecurityTestSuite.runPenetrationTests();
console.log(`滲透測試: ${penTest.blocked}/${penTest.total} 攻擊被阻擋`);
```

### 2. 會話管理監控
```javascript
// 檢查活躍會話
const activeSessions = SecurityAuthHandler.getActiveSessions();
console.log(`目前活躍會話數: ${activeSessions.length}`);

// 清理過期會話
SecurityAuthHandler.cleanupExpiredSessions();
```

### 3. 日誌安全檢查
```javascript
// 檢查日誌完整性
const logIntegrity = await SecurityDataHandler.validateLogIntegrity();
if (!logIntegrity.valid) {
    console.warn('日誌完整性檢查失敗');
}
```

## 🚨 安全事件回應

### PWA 匯入功能 Critical 級別事件回應
**緊急行動計畫 (< 15 分鐘)**
1. **立即停用 PWA 匯入功能**
   ```javascript
   // 緊急停用代碼
   window.EMERGENCY_DISABLE_IMPORT = true;
   ```
2. **隔離受影響檔案**
   - `pwa-card-storage/src/features/transfer-manager.js`
   - `pwa-card-storage/src/features/card-manager.js`
3. **啟動緊急修復小組**
4. **通知所有用戶停止使用匯入功能**

### Critical 級別事件
**立即行動 (< 15 分鐘)**
1. 隔離受影響系統
2. 啟動事件回應小組
3. 收集初步證據
4. 通知相關利害關係人

### High 級別事件
**快速回應 (< 1 小時)**
1. 評估影響範圍
2. 實施臨時緩解措施
3. 開始詳細調查
4. 準備修復計畫

### 事件分類標準
- **Critical**: 系統完全妥協、資料外洩
- **High**: 部分功能受影響、潛在安全風險
- **Medium**: 輕微安全問題、效能影響
- **Low**: 一般性問題、建議改善

## 📊 安全監控與告警

### 1. 自動監控指標
```javascript
// 監控配置
const securityMetrics = {
    failedAuthAttempts: { threshold: 5, window: '5m' },
    suspiciousInputs: { threshold: 10, window: '1h' },
    sessionAnomalies: { threshold: 3, window: '10m' },
    logInjectionAttempts: { threshold: 1, window: '1m' }
};
```

### 2. 告警觸發條件
- 連續 5 次授權失敗
- 檢測到 XSS 攻擊嘗試
- 異常的會話行為
- 日誌注入攻擊嘗試
- 系統資源異常使用

### 3. 監控儀表板指標
- 安全事件數量趨勢
- 攻擊類型分布
- 系統健康狀態
- 會話活動統計

## 🧪 安全測試套件執行指南

### Jest 測試框架執行 (建議)

#### 快速安全驗證
```bash
# 進入測試目錄
cd tests/

# 安裝測試依賴 (首次執行)
npm install

# 執行安全測試套件 (45個測試案例)
npm run test:security

# 檢查結果
# ✅ 所有測試通過 = 系統安全
# ❌ 有測試失敗 = 需要立即調查
```

#### 完整測試執行
```bash
# 執行所有測試並生成覆蓋率報告
npm run test:all

# 持續監控模式 (開發時使用)
npm run test:security:watch

# CI/CD 環境執行
npm run test:ci
```

### 視覺化測試執行器使用

#### 基本操作
1. 開啟 `tests/security/security-test-runner.html`
2. 點擊「執行完整安全測試」
3. 監控 45 個測試案例的即時執行進度
4. 檢查安全狀態顯示：
   - 🟢 安全：所有測試通過
   - 🔴 危險：有測試失敗
   - ⚠️ 未知：尚未執行測試

#### 緊急功能測試
```javascript
// 測試緊急停用功能
1. 點擊「緊急停用匯入功能」
2. 執行快速驗證測試
3. 確認所有匯入操作被拒絕
4. 點擊「恢復匯入功能」
5. 重新測試正常功能
```

#### 檔案安全測試
- 拖拽測試檔案到上傳區域
- 系統自動執行：
  - 檔案類型檢查
  - 檔案大小檢查  
  - 檔案名稱安全檢查
- 查看即時測試結果

### 測試結果解讀

#### 測試成功指標
- **總測試數**: 45 個
- **通過率**: 100%
- **Critical 安全測試**: 32/32 通過
- **緊急機制測試**: 2/2 通過
- **功能驗證測試**: 8/8 通過  
- **合規性測試**: 4/4 通過

#### 失敗排除步驟
1. **檢查測試日誌**: 查看具體失敗原因
2. **重置測試環境**: 點擊「重置測試環境」
3. **單獨測試**: 執行快速驗證測試
4. **檢查代碼變更**: 確認最近是否有修改核心檔案
5. **聯絡安全團隊**: 如問題持續存在

### 持續監控建議

#### 自動化執行
```bash
# 設定 cron job 每日執行
0 9 * * * cd /path/to/tests && npm run test:security

# 設定 CI/CD 觸發條件
- 每次程式碼提交後自動執行
- 部署前強制執行安全測試
- 週期性完整測試執行
```

#### 監控告警
- 測試失敗立即發送告警
- 執行時間異常告警  
- 覆蓋率下降告警
- 新增測試案例提醒

## 🔧 安全配置管理

### 1. 安全參數配置
```javascript
const SecurityConfig = {
    // 會話管理
    session: {
        timeout: 30 * 60 * 1000,    // 30分鐘
        maxSessions: 10,             // 最大並發會話
        renewThreshold: 5 * 60 * 1000 // 5分鐘續期閾值
    },
    
    // 輸入驗證
    input: {
        maxLength: 1000,
        sanitizeLevel: 'strict',
        allowedTags: []
    },
    
    // 日誌設定
    logging: {
        level: 'info',
        retention: 30,               // 保留30天
        maxSize: 10 * 1024 * 1024   // 10MB
    }
};
```

### 2. 權限矩陣
| 資源 | 讀取 | 寫入 | 刪除 | 管理 |
|------|------|------|------|------|
| card-data | ✅ | ✅ | ✅ | ❌ |
| storage | ✅ | ✅ | ❌ | ❌ |
| export | ✅ | ❌ | ❌ | ❌ |
| import | ❌ | ✅ | ❌ | ❌ |
| admin | ❌ | ❌ | ❌ | ✅ |

## 🛠️ 維護程序

### 每日檢查清單
- [ ] 執行安全測試套件 (45個測試案例)
- [ ] **PWA 匯入功能安全狀態檢查** (已修復，持續監控)
- [ ] 執行 Jest 安全測試: `npm run test:security`
- [ ] 檢查視覺化測試器狀態: `security-test-runner.html`
- [ ] 檢查系統日誌異常
- [ ] 監控檔案上傳攻擊嘗試
- [ ] 驗證備份完整性
- [ ] 監控資源使用狀況
- [ ] 檢查會話活動

### 每週檢查清單
- [ ] 執行完整滲透測試
- [ ] 更新安全規則
- [ ] 檢查依賴套件安全性
- [ ] 審查存取日誌
- [ ] 測試災難恢復程序

### 每月檢查清單
- [ ] 全面安全評估
- [ ] 更新威脅模型
- [ ] 檢查合規性狀態
- [ ] 安全培訓更新
- [ ] 事件回應演練

## 🔍 故障排除指南

### PWA 匯入功能緊急問題

#### 1. 檔案上傳攻擊檢測
**症狀**: 不明檔案被上傳或異常檔案類型
**緊急處理**:
```javascript
// 立即停用匯入功能
window.EMERGENCY_DISABLE_IMPORT = true;

// 檢查上傳檔案記錄
const uploadLogs = SecurityMonitor.getSecurityEvents('file_upload');
console.log('檔案上傳記錄:', uploadLogs);

// 清理可疑檔案
SecurityDataHandler.quarantineSuspiciousFiles();
```

#### 2. JSON Prototype Pollution 攻擊
**症狀**: 物件原型被污染，系統行為異常
**緊急處理**:
```javascript
// 檢查原型污染
if (Object.prototype.hasOwnProperty('__proto__')) {
  console.error('Prototype pollution detected!');
  // 重新載入頁面
  window.location.reload();
}

// 清理可疑資料
SecurityDataHandler.sanitizeStoredData();
```

#### 3. PII 資料洩露
**症狀**: 個人資料出現在日誌或錯誤訊息中
**緊急處理**:
```javascript
// 立即清理日誌
SecurityDataHandler.clearSensitiveLogs();

// 停用詳細錯誤訊息
window.DISABLE_DETAILED_ERRORS = true;

// 通知用戶更新密碼
SecurityAuthHandler.forcePasswordReset();
```

### 常見安全問題

#### 1. 授權檢查失敗
**症狀**: 操作被拒絕，顯示「存取被拒絕」
**排除步驟**:
```javascript
// 檢查權限配置
const authResult = SecurityAuthHandler.validateAccess('card-data', 'write');
console.log('授權結果:', authResult);

// 檢查會話狀態
const sessionValid = SecurityAuthHandler.validateSession(sessionId);
console.log('會話有效:', sessionValid);
```

#### 2. XSS 防護觸發
**症狀**: 輸入被清理或拒絕
**排除步驟**:
```javascript
// 測試輸入清理
const result = SecurityDataHandler.sanitizeOutput(input, 'html');
console.log('清理結果:', result);

// 檢查輸入驗證
const validation = SecurityInputHandler.validateAndSanitize(input, 'text');
console.log('驗證結果:', validation);
```

#### 3. 會話超時問題
**症狀**: 用戶頻繁需要重新登入
**排除步驟**:
```javascript
// 檢查會話配置
console.log('會話超時設定:', SecurityConfig.session.timeout);

// 檢查會話續期
SecurityAuthHandler.renewSession(sessionId);
```

## 📈 效能監控

### 安全功能效能指標
- 輸入驗證延遲: < 10ms
- 授權檢查延遲: < 5ms
- 日誌記錄延遲: < 2ms
- 會話驗證延遲: < 3ms

### 效能優化建議
1. 快取授權結果 (5分鐘)
2. 批次處理日誌寫入
3. 使用索引加速會話查詢
4. 定期清理過期資料

## 🔄 更新與升級

### 安全更新流程
1. **評估階段**: 分析安全更新影響
2. **測試階段**: 在測試環境驗證
3. **部署階段**: 分階段生產部署
4. **驗證階段**: 確認更新成功
5. **監控階段**: 持續監控穩定性

### 緊急安全補丁
- 立即隔離受影響系統
- 應用臨時緩解措施
- 快速測試關鍵功能
- 部署安全補丁
- 全面系統檢查

## 📚 合規性檢查

### OWASP Top 10 對應
- ✅ A01: 存取控制失效 → SecurityAuthHandler
- ✅ A02: 加密機制失效 → SecurityDataHandler
- ✅ A03: 注入攻擊 → SecurityInputHandler
- ✅ A04: 不安全設計 → 安全架構設計
- ✅ A05: 安全配置錯誤 → 配置管理
- ✅ A06: 易受攻擊元件 → 依賴管理
- ✅ A07: 身份驗證失效 → 會話管理
- ✅ A08: 軟體完整性失效 → 完整性檢查
- ✅ A09: 日誌監控失效 → 安全日誌
- ✅ A10: 伺服器端請求偽造 → 輸入驗證

### 政府資安規範
- 符合數位發展部資安要求
- 遵循個資法相關規定
- 實作資料最小化原則
- 建立完整稽核軌跡

## 🆘 緊急聯絡資訊

### 安全事件回應小組
- **安全負責人**: [聯絡資訊]
- **技術負責人**: [聯絡資訊]
- **法務聯絡人**: [聯絡資訊]
- **公關聯絡人**: [聯絡資訊]

### 外部資源
- **CERT/CC**: https://www.cert.org/
- **CVE 資料庫**: https://cve.mitre.org/
- **OWASP**: https://owasp.org/

---

**文件版本**: v2.0  
**最後更新**: 2025-01-03 (新增 PWA 安全測試套件指引)  
**下次審查**: 2025-02-03  
**維護者**: 安全團隊 + 測試團隊  
**測試套件版本**: v3.0.0 (Jest + 視覺化工具)