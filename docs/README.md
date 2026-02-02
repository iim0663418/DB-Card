# DB-Card 文檔索引

本目錄包含 DB-Card v4.6.0 的正式文檔。

## 目錄結構

### security/ - 安全與合規
ISO/IEC 18974 合規文件與安全政策

- `iso-18974-self-certification.md` - ISO 18974 自我認證檢查表
- `iso-18974-compliance-assessment.md` - 合規評估報告
- `open-source-security-policy.md` - 開源安全政策
- `security-roles.md` - 安全角色與職責
- `awareness-program.md` - 安全意識培訓
- `program-scope.md` - 安全保證計畫範圍
- `vulnerability-communication.md` - 漏洞溝通程序
- `third-party-reporting.md` - 第三方漏洞回報
- `resource-allocation.md` - 資源分配
- `scan-reports/` - 安全掃描報告（OSV-Scanner, npm audit, OWASP ZAP）

### adr/ - 架構決策記錄
重要技術決策的記錄與理由

- `001-privacy-first.md` - 隱私優先設計原則
- `002-security-architecture.md` - 安全架構設計
- `003-remove-client-cache.md` - 移除客戶端快取
- `004-session-cache-strategy.md` - 會話快取策略

### api/ - API 文檔
後端 API 端點說明

- `admin-apis.md` - 管理 API 完整文檔
- `nfc-tap.md` - NFC 觸碰 API
- `read.md` - 名片讀取 API
- `kek-migration.md` - KEK 輪換 API

### deployment/ - 部署記錄
生產與測試環境部署記錄

- `staging-consent-complete-2026-02-02.md` - 個資同意系統部署
- `staging-migration-record-2026-02-02.md` - 資料庫遷移記錄
- `staging-2026-02-02.md` - Staging 環境部署

### review/ - 審查報告
功能審查與驗收報告

- `consent-*` - 個資同意系統審查（9 個文件）
- `ip-anonymization-compliance-check.md` - IP 匿名化合規檢查

### bugfix/ - 問題修復
重要 Bug 修復記錄

- `consent-issues-fix-2026-02-02.md` - 個資同意系統問題修復

### implementation/ - 實作計畫
功能實作設計文件

- `consent-management-plan.md` - 個資同意管理實作計畫

### delivery/ - 交付報告
功能完整交付文件

- `consent-management-delivery-report.md` - 個資同意系統交付報告

### database/ - 資料庫變更
資料庫 Schema 變更記錄

- `2026-02-01-add-adi-gov-tw.md` - Email allowlist 更新

### ux/ - 使用者體驗
UI/UX 設計與審查

- `USER-PORTAL-TEXT-AUDIT.md` - 使用者入口文字審查
- `USER-PORTAL-TYPOGRAPHY-AUDIT.md` - 排版審查

### testing/ - 測試報告
測試驗證文件

- `phase2-verification-report.md` - Phase 2 驗證報告

### hotfix/ - 緊急修復
生產環境緊急修復記錄

- `durable-object-rpc-fix.md` - Durable Objects RPC 修復
- `error-log-clarification.md` - 錯誤日誌優化

### analysis/ - 技術分析
效能與技術評估

- `kv-optimization-*.md` - KV 優化分析
- `TAILWIND-*.md` - Tailwind CSS 評估

---

## 其他重要文檔

### 根目錄
- `README.md` - 專案說明與快速開始
- `SECURITY.md` - 安全漏洞回報政策
- `CHANGELOG.md` - 版本變更記錄
- `THIRD_PARTY_LICENSES.md` - 第三方授權清單

### 開發過程歸檔
- `.specify/archive/v4.0-v4.5/` - 開發過程文件（200+ 個規格與報告）

---

## 快速導航

### 新手入門
1. 閱讀 `README.md` - 專案概覽
2. 查看 `api/admin-apis.md` - API 使用
3. 參考 `adr/` - 了解架構決策

### 安全合規
1. `security/iso-18974-self-certification.md` - ISO 18974 認證
2. `SECURITY.md` - 漏洞回報
3. `security/scan-reports/` - 最新掃描結果

### 部署維運
1. `deployment/` - 部署記錄
2. `database/` - 資料庫變更
3. `hotfix/` - 緊急修復

---

**最後更新**: 2026-02-02  
**當前版本**: v4.6.0
