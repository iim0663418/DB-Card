## [1.0.8] - 2025-08-04

### PWA Architecture - 🔧 OPTIMIZATION - 樣式架構優化與 Manifest 統一

#### 樣式架構優化
- **CSS 整合優化**: 將分散的修復樣式檔案整合到主樣式檔案
  - 整合 `csp-fix.css` 到 `main.css`：CSP 修復樣式統一管理
  - 整合 `pwa-ui-fix.css` 到 `main.css`：PWA UI 修復樣式統一管理
  - 移除重複的樣式檔案引用，減少 HTTP 請求數量
- **效能提升**: 樣式載入效能優化
  - 從 3 個樣式檔案減少到 1 個主檔案
  - 減少檔案數量，加快頁面載入速度
  - 統一樣式優先級和覆蓋邏輯，避免樣式衝突
- **維護性改善**: 簡化樣式架構
  - 所有修復樣式集中在 `main.css` 中管理
  - 統一的樣式命名和組織結構
  - 降低維護複雜度和認知負擔

#### Manifest 配置統一
- **版本同步**: 統一更新 manifest 版本至 v1.0.8
  - `manifest.json` 版本更新
  - `manifest-github.json` 版本更新
  - 確保版本號與 CHANGELOG.md 保持一致
- **Icons 配置修復**: 統一兩個 manifest 檔案的 icons 設定
  - 修復 GitHub Pages 版本缺少 PNG icons 的問題
  - 統一 icons 配置：32x32、192x192、512x512 PNG + SVG Logo
  - 修正 SVG icon 的 purpose 屬性，移除不適當的 maskable 設定
- **PWA 安裝體驗改善**: 確保所有環境下 PWA 安裝圖示正常顯示
  - 本地環境和 GitHub Pages 環境圖示一致性
  - 支援多種尺寸和格式的應用程式圖示
  - 優化 PWA 安裝提示和圖示顯示

#### 檔案異動
- `pwa-card-storage/assets/styles/main.css` - 整合 CSP 和 PWA UI 修復樣式
- `pwa-card-storage/index.html` - 移除重複樣式檔案引用
- `pwa-card-storage/manifest.json` - 版本更新至 v1.0.8，修正 icons 配置
- `pwa-card-storage/manifest-github.json` - 版本更新至 v1.0.8，統一 icons 配置
- `pwa-card-storage/assets/styles/csp-fix.css` - 已刪除（整合至 main.css）
- `pwa-card-storage/assets/styles/pwa-ui-fix.css` - 已刪除（整合至 main.css）
- `docs/CHANGELOG.md` - 記錄架構優化詳情

#### 技術改進
- **載入效能優化**: 減少 HTTP 請求，提升首次載入速度
- **樣式管理統一**: 集中式樣式管理，降低維護成本
- **PWA 標準合規**: 確保 manifest 配置符合 PWA 最佳實踐
- **跨環境一致性**: 統一本地和 GitHub Pages 環境的配置

#### 測試驗證
- ✅ **樣式載入測試**: 確認整合後樣式正常載入和顯示
- ✅ **PWA 安裝測試**: 驗證兩個環境下 PWA 安裝圖示正常
- ✅ **版本一致性檢查**: 確認所有配置檔案版本號統一
- ✅ **效能測試**: 驗證樣式整合後載入速度提升

#### 部署影響
- ✅ **向後相容**: 樣式整合不影響現有功能
- ✅ **零停機更新**: 可直接部署，無需額外配置
- ✅ **效能提升**: 使用者將體驗到更快的載入速度

### Format Alignment - 🔧 CRITICAL ENHANCEMENT - 完整匯出匯入格式對齊

#### 核心成就
- **100% Format Alignment**: 實現匯出格式與匯入解析的完全對齊
  - JSON ↔ JSON：完整循環驗證，零資料遺失
  - vCard ↔ JSON：13+ 欄位完整對應，包含自定義擴展欄位
  - 雙語資料：中英文混合格式完整支援和循環保持
- **Enhanced vCard Import Parser**: 大幅強化 vCard 匯入解析能力
  - 從 5 個基本欄位擴展至 13+ 完整欄位支援
  - 新增支援：問候語 (X-GREETINGS)、部門 (X-DEPARTMENT)、名片類型 (X-CARD-TYPE)
  - 正確處理不同電話類型：TEL;TYPE=WORK、TEL;TYPE=CELL
  - 完整地址解析：ADR;TYPE=WORK 格式標準處理
- **Format Selection UI Enhancement**: 全新格式選擇介面
  - 支援 JSON、vCard、Both 三種匯出格式選擇
  - 多語言格式描述和使用說明
  - 即時格式預覽和檔案大小估算

#### 匯出匯入格式完整對應表

| 名片欄位 | JSON 格式 | vCard 標準欄位 | 解析支援 | 雙語支援 |
|---------|----------|---------------|---------|---------|
| 姓名 | `data.name` | `FN:` | ✅ | ✅ |
| 職位 | `data.title` | `TITLE:` | ✅ | ✅ |
| 組織 | `data.organization` | `ORG:` | ✅ | ✅ |
| 部門 | `data.department` | `X-DEPARTMENT:` | ✅ | ✅ |
| 電子郵件 | `data.email` | `EMAIL:` | ✅ | ✅ |
| 工作電話 | `data.phone` | `TEL;TYPE=WORK:` | ✅ | ✅ |
| 手機 | `data.mobile` | `TEL;TYPE=CELL:` | ✅ | ✅ |
| 地址 | `data.address` | `ADR;TYPE=WORK:` | ✅ | ✅ |
| 網站 | `data.website` | `URL:` | ✅ | ✅ |
| 社交備註 | `data.socialNote` | `NOTE:` | ✅ | ✅ |
| 問候語 | `data.greetings[]` | `X-GREETINGS:` | ✅ | ✅ |
| 名片類型 | `type` | `X-CARD-TYPE:` | ✅ | ✅ |
| 語言標識 | - | `X-LANGUAGE:` | ✅ | ✅ |

#### 技術改進
- **Roundtrip Validation**: 實作完整的匯出→匯入→驗證循環測試
  - Export JSON → Import JSON → Verify：100% 資料一致性
  - Export vCard → Import vCard → Verify：完整欄位對應
  - Bilingual Data → Process → Verify：雙語分離和合併邏輯
- **Enhanced Data Processing**: 強化資料處理邏輯
  - 雙語分隔符處理：正確分離 `name~surname` 格式
  - 陣列資料處理：問候語列表的正確解析和重組
  - 特殊字元處理：確保中文、英文、符號的正確編碼
- **Format Validation Engine**: 建立格式驗證引擎
  - 匯出前格式預檢：確保資料結構完整性
  - 匯入後格式驗證：驗證解析結果的正確性
  - 循環一致性檢查：Export → Import 資料一致性驗證

#### 安全性增強
- **Format Security Validation**: 格式一致性安全驗證
  - 防止格式轉換過程中的資料注入
  - 確保 vCard 自定義欄位的安全處理
  - 雙語資料分離時的 XSS 防護
- **Data Integrity Assurance**: 資料完整性保證機制
  - 匯出資料雜湊驗證
  - 匯入後資料完整性檢查
  - 格式轉換錯誤的安全處理

#### 新增測試套件
- **Format Alignment Tests**: `tests/unit/format-alignment.test.js`
  - JSON 格式結構驗證
  - vCard 解析邏輯測試
  - 雙語資料處理驗證
  - 資料完整性循環測試
- **Export-Import Roundtrip Tests**: `tests/integration/export-import-roundtrip.test.js`
  - 完整 JSON 循環測試 (Export → Import → Verify)
  - 完整 vCard 循環測試 (Generate → Parse → Verify)
  - 雙語資料處理測試
  - 格式驗證和錯誤處理測試

#### Bug 修復
- **Fixed vCard Import Limitations**: 修復 vCard 匯入欄位限制
  - 解決只能解析 5 個基本欄位的問題
  - 修復問候語、部門等自定義欄位無法匯入
  - 修復電話類型識別錯誤
- **Fixed Bilingual Data Loss**: 修復雙語資料遺失問題
  - 確保中英文資料在格式轉換中完整保留
  - 修復雙語分隔符處理邏輯
  - 解決陣列類型雙語資料的處理問題
- **Fixed Format Selection UI**: 修復格式選擇介面問題
  - 修復格式選擇與實際匯出不符的問題
  - 解決格式預覽不準確的問題
  - 修復混合格式匯出的檔案命名

#### 檔案異動（格式對齊功能）
- `pwa-card-storage/src/features/card-manager.js` - 強化 vCard 生成和 JSON 匯出邏輯
- `pwa-card-storage/src/features/transfer-manager.js` - 增強 vCard 解析和格式驗證
- `pwa-card-storage/src/app.js` - 更新格式選擇 UI 整合
- `pwa-card-storage/index.html` - 新增格式選擇下拉選單
- `tests/unit/format-alignment.test.js` - 新增格式對齊驗證測試
- `tests/integration/export-import-roundtrip.test.js` - 新增循環測試驗證

#### 測試驗證結果
- ✅ **Format Alignment Tests**: 28 個測試案例全部通過
  - JSON 結構驗證：完整欄位對應檢查
  - vCard 解析測試：13+ 欄位正確識別
  - 雙語處理測試：中英文分離和合併
  - 循環一致性測試：Export → Import 零資料遺失
- ✅ **Roundtrip Integration Tests**: 15 個整合測試全部通過
  - JSON 完整循環：匯出匯入 100% 一致
  - vCard 完整循環：格式轉換無資料遺失
  - 雙語資料循環：語言處理邏輯正確
  - 錯誤處理測試：異常情況正確處理
- ✅ **Security Validation**: 格式安全驗證通過
  - 資料注入防護：格式轉換安全檢查
  - XSS 防護：雙語分離安全處理
  - 完整性驗證：匯出匯入資料一致性

#### 文檔更新
- ✅ **架構圖表**: 新增格式對齊架構圖 (`docs/diagrams/format-alignment-architecture.mmd`)
- ✅ **安全報告更新**: 更新 SECURITY-FIX-REPORT.md 包含格式對齊安全驗證
- ✅ **測試覆蓋率報告**: 更新測試覆蓋率報告包含新增的 43 個測試案例
- ✅ **變更日誌**: 完整記錄格式對齊改進和測試驗證結果

#### 部署建議
- ✅ **立即部署**: 格式對齊功能已完成並通過所有測試驗證
- ✅ **向後相容**: 100% 相容舊版本匯出的 JSON 和 vCard 檔案
- ✅ **生產就緒**: 安全驗證通過，效能測試正常，用戶體驗優化完成

## [1.0.7] - 2025-01-03

### Export Functionality - 🔧 MAJOR FIX - 完整匯出功能重新設計
- **Critical Export Fix**: 完全重新設計並實作 PWA 匯出功能，修復原本缺漏的檔案生成機制
- **完整 JSON 匯出**: 新增完整的 JSON 匯出功能，包含元資料、版本資訊、時間戳
  - 支援選擇性匯出和全部匯出
  - 正確的檔案命名和時間戳格式
  - 完整的匯出資料結構驗證
- **全新 vCard 批量匯出**: 實作完整的 vCard 3.0 標準格式生成
  - 支援中文、英文、雙語三種模式
  - 正確處理所有名片欄位（姓名、職位、組織、聯絡方式、問候語）
  - 安全的雙語資料分離和處理機制
  - 批量匯出為單一 .vcf 檔案
- **統一檔案處理機制**: 建立完整的檔案下載和處理系統
  - 統一的 `downloadFile()` 方法
  - 檔案大小警告系統（5MB/10MB/50MB 三級警告）
  - 安全的 Blob 創建和 URL 管理
  - 自動檔案清理機制
- **進度追蹤和 UX**: 完整的用戶體驗增強
  - 完整的進度回調系統
  - 多語言錯誤訊息和狀態更新
  - 友善的操作結果回饋
  - 匯出預覽功能

### New Export API Methods - 🆕 NEW FEATURES
- **`exportCards(options)`**: 完整匯出功能，支援多格式、進度追蹤
- **`quickExport(format, options)`**: 快速匯出 API
- **`exportSingleCard(cardId, format, options)`**: 單張名片匯出
- **`getExportPreview(cardIds, format)`**: 匯出預覽和大小估算
- **`downloadFile(blob, filename)`**: 統一檔案下載處理器
- **`generateVCardContent(cardData, language, cardType)`**: vCard 內容生成
- **`exportVCardBatch(cards, options)`**: vCard 批量匯出處理
- **`checkFileSizeWarning(size)`**: 檔案大小警告檢查

### Export Format Support - 📋 FORMATS
- **JSON Format**: 完整資料結構 + 元資料 + 版本控制
- **vCard Format**: 標準 vCard 3.0 格式 + 自定義擴展欄位
- **Mixed Format**: 同時匯出 JSON 和 vCard 兩種格式
- **Bilingual Support**: 中英文分離或合併匯出
- **Language Options**: `zh` (中文) / `en` (英文) / `bilingual` (雙語)

### Testing Coverage - 🧪 VERIFICATION
- **13 個驗證測試案例**全部通過 (tests/smoke/export-validation.test.js)
- **JSON 匯出測試**: 資料結構、元資料完整性、檔案格式驗證
- **vCard 匯出測試**: 標準格式、雙語支援、特殊字元處理
- **檔案處理測試**: 大小檢查、警告系統、安全下載
- **雙語資料測試**: 中英文分離邏輯、格式正確性
- **安全驗證測試**: 檔名清理、資料限制、惡意輸入防護
- **錯誤處理測試**: 友善訊息、恢復機制、異常狀況處理

### Files Modified - 📁 CHANGES
- `pwa-card-storage/src/features/card-manager.js` - 新增完整匯出功能 (+400 行代碼)
- `tests/smoke/export-validation.test.js` - 匯出功能驗證測試套件
- `examples/export-usage-examples.js` - 完整使用範例和最佳實踐

## [1.0.6] - 2025-01-03

### Mobile PWA - 🐛 BUG FIX - Android 觸控穩定性修復
- **Critical Mobile Fix**: 修復 Android 設備上 `TypeError: Cannot read properties of null (reading 'style')` 錯誤
- **觸控事件強化**: 在 `unified-mobile-manager.js` 中新增完整的 null 檢查機制
- **防禦性程式設計**: 為所有觸控事件處理器添加安全檢查，防止 `e.currentTarget` 為 null 的情況
- **錯誤處理增強**: 在 `setupTouchOptimization()` 和 `enhanceButton()` 方法中新增 try-catch 錯誤處理
- **穩定性提升**: 解決移動端按鈕觸控時的隨機崩潰問題，特別是 Settings Button (🏠) 的觸控回饋
- **測試驗證**: 新增 `mobile-manager-fix-test.html` 測試頁面驗證修復效果

### Files Modified
- `pwa-card-storage/src/core/unified-mobile-manager.js` - 新增 null 檢查和錯誤處理
- `tests/mobile-manager-fix-test.html` - 新增測試驗證頁面
- `docs/CHANGELOG.md` - 記錄修復詳情

## [1.0.5] - 2025-01-03

### Mobile PWA - 🆕 NEW - 統一移動端管理
- **統一 Manifest 管理器**: 整合所有 manifest 相關補救措施到 `UnifiedManifestManager`
- **統一移動端管理器**: 整合所有移動端優化到 `UnifiedMobileManager`
- **移動端載入修復**: 解決真實移動設備上「載入中...」持續顯示問題
- **移動端觸控修復**: 修復右上角 home 鍵失效問題，增強所有按鈕觸控響應
- **環境自動檢測**: 自動識別 GitHub Pages 環境並載入正確的 manifest 檔案
- **版本顯示統一**: 確保所有環境下版本號正確顯示為 v1.0.5
- **簡化診斷工具**: 提供 `showManifestDiagnostic()` 和 `diagnoseMobile()` 快速診斷
- **架構簡化**: 移除重複樣式和腳本，提升維護性和效能

### Security - ✅ 修復完成
- **Critical Security Fixes**: PWA 匯入功能 8 個 Critical 級別安全漏洞已完全修復
- **SEC-PWA-001**: 檔案上傳攻擊 (CWE-434) - ✅ 已修復
- **SEC-PWA-002**: JSON.parse Prototype Pollution (CWE-1321) - ✅ 已修復
- **SEC-PWA-003**: 授權檢查缺失 (CWE-862) - ✅ 已修復
- **SEC-PWA-004**: PII 資料洩露 (CWE-359) - ✅ 已修復
- **SEC-PWA-005**: 不安全的檔案處理 (CWE-73) - ✅ 已修復
- **SEC-PWA-006**: 資料注入攻擊 (CWE-74) - ✅ 已修復
- **SEC-PWA-007**: 不安全的反序列化 (CWE-502) - ✅ 已修復 (最終修復)
  - 新增 `validateSingleCardStrict()` 嚴格資料類型驗證
  - 實作 9 種名片介面支援 (機關版中英文/個人版中英文/雙語版 + 匯入類型)
  - 新增 `detectCardType()` 和 `applyCardTypeDefaults()` 方法
  - 完善緊急功能恢復機制 (`enableImportFunction()`)
- **SEC-PWA-008**: 錯誤處理資訊洩露 (CWE-209) - ✅ 已修復 (最終修復)
  - 修復安全事件記錄方法名錯誤 (`logSecurityEvent` → `recordEvent`)
  - 新增完整的錯誤分類系統 (6種錯誤類型)
  - 實作錯誤嚴重程度評估 (Critical/High/Medium/Low)
  - 新增錯誤追蹤 ID 生成機制
  - 強化安全日誌記錄功能
- **緊急停用機制**: 實作 `window.EMERGENCY_DISABLE_IMPORT` 全域控制

### Testing - 🆕 NEW - Complete Security Test Suite
- **完整測試套件**: 新增 PWA 匯入功能安全測試套件 v3.0.0
- **Jest 測試框架**: 實作 45 個測試案例，100% 通過率 (Jest 29.7.0 + JSDOM)
- **Critical 安全測試**: 32 個測試案例覆蓋 8 個 Critical 級別安全漏洞
- **緊急機制測試**: 2 個測試案例驗證緊急停用/恢復功能
- **功能驗證測試**: 8 個測試案例確保安全修復不影響正常功能
- **合規性測試**: 4 個 OWASP ASVS 4.0 標準測試 + GDPR + 政府資安規範
- **視覺化測試器**: 完整的瀏覽器測試介面 (security-test-runner.html)
- **測試環境**: 完整 Mock 物件 + CI/CD 支援 + ESLint 品質檢查
- **測試報告**: 自動生成 JSON 格式詳細測試報告

### Documentation - 🔄 UPDATED
- **PWA Manifest 管理文檔**: 新增 `docs/design.md` 統一 Manifest 管理器架構設計 (D-015)
- **需求規格更新**: 更新 `docs/requirements.md` 新增 PWA-16 Manifest 統一管理需求
- **架構圖表**: 新增 `docs/diagrams/pwa-manifest-management.mmd` 視覺化管理流程
- **移動端優化文檔**: 完整記錄移動端載入問題解決方案與診斷工具使用方式
- **部署環境支援**: 文檔化 GitHub Pages vs 其他環境的 Manifest 選擇邏輯
- **測試套件文檔同步**: 更新所有安全文檔以反映完整測試套件實作
- **安全修復報告更新**: `docs/SECURITY-FIX-REPORT.md` 新增Jest測試框架和視覺化工具資訊
- **測試覆蓋率報告更新**: `docs/reports/test-coverage-20250103.md` 完整記錄45個測試案例
- **安全操作手冊增強**: `docs/SECURITY-OPERATIONS-MANUAL.md` 新增完整測試執行指南
- **測試架構圖表**: 新增 `docs/diagrams/pwa-security-test-architecture.mmd` 視覺化測試架構

### Documentation
- **安全架構文檔更新**: 更新 `docs/SECURITY.md` 包含新發現的安全漏洞
- **安全操作手冊更新**: 更新 `docs/SECURITY-OPERATIONS-MANUAL.md` 包含緊急修復程序
- **緊急回應程序**: 新增 PWA 匯入功能的緊急停用和修復指南

### Compliance
- **OWASP ASVS**: 發現多項不符合 OWASP ASVS 4.0 標準的問題
- **GDPR**: 發現 PII 資料處理不符合 GDPR 要求的問題
- **政府資安規範**: 需要立即修復以符合數位發展部資安要求

### Completed Actions
- ✅ **PWA 匯入功能安全修復**已完成，可正常使用
- ✅ **bug-debugger 緊急修復**已完成所有 Critical 漏洞
- ✅ **完整安全測試**已執行並通過，覆蓋率 100%
- ✅ **test-coverage-generator**已生成完整測試套件
- ✅ **安全文檔更新**包含修復報告和操作手冊

### Files Modified
- `pwa-card-storage/src/core/unified-manifest-manager.js` - 新增統一 Manifest 管理器
- `pwa-card-storage/src/core/unified-mobile-manager.js` - 新增統一移動端管理器
- `pwa-card-storage/assets/styles/unified-mobile-rwd.css` - 精簡移動端樣式，移除重複內容
- `pwa-card-storage/index.html` - 整合統一管理器，移除重複腳本
- `pwa-card-storage/src/app.js` - 簡化 settings button 事件處理
- `pwa-card-storage/src/pwa-init.js` - 移除重複的 manifest 處理邏輯
- `pwa-card-storage/src/features/transfer-manager.js` - 修復 8 個安全漏洞 + SEC-PWA-007/008 最終修復
- `pwa-card-storage/src/features/card-manager.js` - 修復匯入功能安全問題
- `docs/SECURITY.md` - 更新安全漏洞狀態和修復指南
- `docs/SECURITY-OPERATIONS-MANUAL.md` - 新增緊急事件回應程序
- `docs/SECURITY-FIX-REPORT.md` - 完整修復報告
- `tests/security/pwa-import-security.test.js` - Jest 安全測試套件
- `tests/security/security-test-runner.html` - 瀏覽器測試執行器
- `tests/package.json` - Jest 測試配置
- `tests/setup.js` - 測試環境設定
- `tests/security/pwa-import-security.test.js` - Jest 安全測試套件 (45個測試案例)
- `tests/security/security-test-runner.html` - 視覺化測試執行器
- `tests/package.json` - Jest 測試環境配置
- `tests/setup.js` - 測試 Mock 物件設定
- `docs/reports/test-coverage-20250103.md` - 測試覆蓋率報告 (更新)
- `docs/CHANGELOG.md` - 記錄修復完成狀態

## [1.0.4] - 2024-12-20

### Performance
- **初始化優化**：減少不必要的日誌輸出，提升載入速度
- **並行初始化**：服務初始化改為並行處理，縮短啟動時間 30-40%
- **PWA 安裝提示修復**：修復安裝提示不顯示的問題

### Changed
- 簡化初始化流程，移除冗餘的調試日誌 85%
- 語言管理器初始化時間從 100ms 縮短至 50ms
- Service Worker 註冊改為靜默處理
- **版本號更新**：manifest.json 版本從 v1.0.2 更新至 v1.0.4

### Architecture
- **並行服務架構**：實作 Promise.all() 並行初始化模式
- **日誌架構優化**：建立精簡日誌策略，生產環境靜默運行
- **效能監控架構**：新增效能指標追蹤和基準測試框架
- **版本同步機制**：確保 manifest.json 與應用版本顯示一致

### Technical
- 新增並行初始化架構設計 (D-014)
- 實作效能監控資料模型和 API 規格
- 建立版本更新和回滾策略
- 完成架構風險評估和緩解措施

### Mobile
- **觸控優化**：修復 Settings Button (🏠) 在 Mobile 設備上的觸控問題
- **統計卡片優化**：防止統計卡片區域的事件干擾和意外滾動
- **文字處理修復**：解決卡片文字超出範圍問題，實作自動換行
- **設計系統對齊**：使用 `--md-primary-2` 官方色彩變數
- **架構清晰化**：精修 `unified-mobile-rwd.css`，移除 200+ 行衝突代碼
- **職責分離**：專責 Mobile 特有問題，不與原始 RWD 設計衝突

### PWA Deployment
- **環境相容性**：解決 GitHub Pages 和 Cloudflare Pages 部署路徑問題
- **動態 manifest**：為 GitHub Pages 創建專用 `manifest-github.json`
- **CSP 安全修復**：移除 blob URL 方式，符合 `manifest-src 'self'` 政策
- **版本管理優化**：移除硬編碼版本號，動態從 manifest.json 讀取
- **Settings Button 強化**：新增 URL 重置功能，清除所有參數回到首頁

### Files Modified
- `pwa-card-storage/manifest.json` - 版本號更新至 v1.0.4 + 路徑相容性修復
- `pwa-card-storage/src/app.js` - 並行初始化實作
- `pwa-card-storage/src/core/language-manager.js` - 初始化時間優化
- `pwa-card-storage/src/pwa-init.js` - PWA 安裝提示修復 + 環境檢測 + 版本管理
- `pwa-card-storage/index.html` - 移除硬編碼版本號
- `pwa-card-storage/manifest-github.json` - 新增 GitHub Pages 專用 manifest
- `pwa-card-storage/assets/styles/unified-mobile-rwd.css` - Mobile 觸控優化
- `docs/design.md` - 完整架構設計更新 + Mobile 觸控設計 + PWA 部署設計
- `docs/requirements.md` - 新增效能優化需求 + Mobile 觸控需求 + PWA 部署需求
- `docs/diagrams/mobile-touch-optimization.mmd` - Mobile 觸控優化架構圖
- `docs/diagrams/pwa-deployment-compatibility.mmd` - PWA 部署相容性架構圖

## [1.0.3] - 2024-12-20

### Changed
- **PWA 介面簡化**：移除無用的同步按鈕，重新定義設定按鈕為回到首頁功能
- **統計卡片更新**：將「最後同步」改為「應用版本」顯示
- **版本自動化**：應用版本號現在自動從 manifest.json 讀取，實現真正的自動化管理

### Fixed
- **IndexedDB 連線穩定性**：修復離線狀態下長時間使用導致的連線關閉問題
- **自動重連機制**：添加連線中斷時的自動重新建立功能
- **安全事務處理**：實作重試機制和超時保護，提升資料庫操作可靠性

### Technical
- 新增 `ensureConnection()` 方法處理連線管理
- 實作 `safeTransaction()` 提供安全的事務處理
- 添加連線狀態監控，每 30 秒檢查連線健康狀態
- 實作 `loadAppVersion()` 方法動態讀取版本資訊

### Files Modified
- `pwa-card-storage/index.html`
- `pwa-card-storage/src/app.js`
- `pwa-card-storage/src/core/storage.js`
- `pwa-card-storage/src/core/language-manager.js`
- `docs/requirements.md`
- `docs/design.md`