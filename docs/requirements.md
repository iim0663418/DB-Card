---
version: "v3.2.0-pwa-deployment-compatibility"
rev_id: 4
last_updated: "2025-08-06"
owners: ["prd-writer", "code-reviewer", "technical-architect"]
feature_scope: "pwa-static-hosting-deployment-compatibility"
security_level: "standard"
cognitive_complexity: "medium"
reuse_policy: "reuse-then-extend-then-build"
migration_policy:
  compatibility: "100% 向下相容"
  dual_track_period: "2週雙軌部署驗證"
  rollback_strategy: "即時回滾機制"
  data_migration: "無資料遷移需求"
---

# PWA 靜態托管部署相容性改進需求文檔

## 1. Product Overview

### 1.1 背景與動機
基於 code-reviewer 的深度分析，PWA 名片儲存系統存在多項部署相容性問題，影響在 GitHub Pages 和 Cloudflare Pages 等靜態托管平台的正常運作：

**現有問題分析**：
- ❌ **路徑依賴問題**：大量使用 `../assets/` 相對路徑引用上層目錄資源
- ❌ **安全模組過載**：複雜的安全架構不適合靜態托管環境
- ❌ **Service Worker 複雜度**：動態路徑計算邏輯在不同環境失效
- ❌ **資源分散問題**：關鍵資源分散在多個目錄，增加部署複雜度

**商業影響**：
- 部署失敗率：約 40% 的靜態托管環境無法正常運作
- 維護成本：每次部署需要手動調整路徑和配置
- 使用者體驗：載入失敗和功能異常影響使用者滿意度

### 1.2 產品目標
- **主要目標**：實現 PWA 在所有主流靜態托管平台的 100% 相容性
- **次要目標**：簡化部署流程，降低維護成本
- **長期目標**：建立標準化的靜態托管最佳實踐

### 1.3 目標使用者
- **主要使用者**：DevOps 工程師、前端開發者
- **次要使用者**：系統管理員、技術支援人員
- **使用場景**：多環境部署、CI/CD 整合、災難恢復

### 1.4 商業價值
- **部署成功率**：從 60% 提升至 100%
- **維護成本**：減少 70% 的部署相關工作量
- **開發效率**：統一部署流程，提升團隊協作效率
- **平台覆蓋**：支援 5+ 主流靜態托管平台

### 1.5 關鍵績效指標 (KPI)
- **部署成功率**：≥ 99% (目標：GitHub Pages, Cloudflare Pages, Netlify, Vercel)
- **首次載入時間**：≤ 3 秒 (靜態資源優化後)
- **Service Worker 註冊成功率**：≥ 95%
- **跨平台一致性**：功能差異 ≤ 5%

## 2. Functional Requirements

### 2.1 硬編碼路徑審計與修復
**User Story**: 作為 DevOps 工程師，我需要系統性地識別和修復所有硬編碼路徑，確保目錄結構變動不會破壞功能。

**Acceptance Criteria**:
- **Given** 專案需要重組目錄結構
- **When** 執行硬編碼路徑審計
- **Then** 識別所有使用 `../` 向上引用的檔案
- **And** 識別所有硬編碼 `/assets/` 和 `/src/` 路徑
- **And** 生成完整的路徑依賴清單和影響分析
- **And** 提供自動化修復腳本
- **And** 驗證修復後所有功能正常運作

**已識別的硬編碼路徑問題**:
```
# PWA index.html 中的向上引用 (16+ 處)
../assets/moda-logo.svg
../assets/high-accessibility.css
../assets/bilingual-common.js
../assets/qrcode.min.js
../assets/qr-utils.js
../src/security/*.js (12+ 個安全模組)

# Manifest 檔案中的向上引用
manifest.json: ../assets/moda-logo.svg
manifest-github.json: ../assets/moda-logo.svg

# Service Worker 中的動態路徑
sw.js: BASE_PATH 動態計算邏輯
```

**Priority**: P0 (Critical)
**Dependencies**: 現有資源檔案結構、所有引用這些路徑的檔案

### 2.2 資源路徑標準化
**User Story**: 作為 DevOps 工程師，我需要 PWA 使用標準化的資源路徑，以確保在任何靜態托管平台都能正常部署。

**Acceptance Criteria**:
- **Given** PWA 專案需要部署到靜態托管平台
- **When** 系統載入資源檔案（CSS、JS、圖片、字體）
- **Then** 所有資源使用相對於 PWA 根目錄的路徑
- **And** 不存在 `../` 向上引用的路徑
- **And** 所有必要資源複製到 PWA 目錄內
- **And** 資源路徑在不同托管環境保持一致
- **And** 支援子目錄部署（如 `/DB-Card/pwa-card-storage/`）

**Priority**: P0 (Critical)
**Dependencies**: 硬編碼路徑審計完成、現有資源檔案結構、build 流程

### 2.3 簡化 Service Worker 架構
**User Story**: 作為前端開發者，我需要簡化的 Service Worker 配置，以確保在不同托管環境都能正確註冊和運作。

**Acceptance Criteria**:
- **Given** PWA 在不同靜態托管平台部署
- **When** Service Worker 初始化和註冊
- **Then** 使用固定的路徑配置，不依賴動態計算
- **And** 支援環境檢測：GitHub Pages、Cloudflare Pages、本地開發
- **And** 快取策略簡化為標準 PWA 模式
- **And** 移除複雜的路徑解析邏輯
- **And** 提供環境特定的配置檔案
- **And** Service Worker 註冊成功率 ≥ 95%

**Priority**: P0 (Critical)
**Dependencies**: 現有 Service Worker 實作、快取策略

### 2.4 安全架構輕量化
**User Story**: 作為系統架構師，我需要適合靜態托管的輕量級安全方案，取代現有的複雜安全架構。

**Acceptance Criteria**:
- **Given** PWA 部署在無後端的靜態環境
- **When** 系統初始化安全組件
- **Then** 使用客戶端安全最佳實踐，不依賴伺服器端驗證
- **And** 保留核心安全功能：CSP、XSS 防護、輸入驗證
- **And** 移除複雜的認證和授權邏輯
- **And** 簡化安全監控為基本錯誤記錄
- **And** 安全組件載入時間 ≤ 500ms
- **And** 相容性覆蓋率 ≥ 95% 的現代瀏覽器

**Priority**: P1 (High)
**Dependencies**: 現有安全架構、Web Security APIs

### 2.5 環境配置管理
**User Story**: 作為 DevOps 工程師，我需要統一的環境配置管理，支援多平台部署而無需手動修改。

**Acceptance Criteria**:
- **Given** PWA 需要部署到不同的靜態托管平台
- **When** 執行部署流程
- **Then** 自動檢測目標平台（GitHub Pages、Cloudflare Pages 等）
- **And** 使用對應的 manifest 和配置檔案
- **And** 路徑前綴自動調整（如 `/DB-Card/` 或 `/`）
- **And** 支援環境變數或建置時替換
- **And** 提供部署驗證腳本
- **And** 配置錯誤自動檢測和修復建議

**Priority**: P1 (High)
**Dependencies**: 建置工具、CI/CD 流程

### 2.6 資源整合與優化
**User Story**: 作為效能工程師，我需要整合和優化 PWA 資源，提升載入效能和部署穩定性。

**Acceptance Criteria**:
- **Given** PWA 包含多種類型的資源檔案
- **When** 執行資源整合流程
- **Then** 將分散的資源檔案整合到 PWA 目錄
- **And** 優化圖片和字體檔案大小
- **And** 合併和壓縮 CSS/JS 檔案（可選）
- **And** 生成資源清單和完整性檢查
- **And** 支援 CDN 和本地資源的混合模式
- **And** 首次載入時間改善 ≥ 30%

**Priority**: P2 (Medium)
**Dependencies**: 建置工具、資源優化工具

## 3. Non-Functional Requirements

### 3.1 Secure by Default 檢查清單
- ✅ **CSP 設定**：適合靜態托管的內容安全政策
- ✅ **XSS 防護**：客戶端輸入驗證和輸出編碼
- ✅ **資源完整性**：SRI (Subresource Integrity) 檢查
- ✅ **HTTPS 強制**：所有生產環境強制 HTTPS
- ✅ **安全標頭**：適當的安全 HTTP 標頭設定
- ⚠️ **簡化認證**：移除複雜的伺服器端認證依賴

### 3.2 Cognitive Load-Friendly 檢查清單
- ✅ **統一配置**：單一配置檔案管理所有環境
- ✅ **自動檢測**：環境自動檢測，減少手動配置
- ✅ **清楚錯誤**：部署錯誤提供明確的修復建議
- ✅ **文檔完整**：詳細的部署指南和故障排除
- ✅ **工具支援**：提供部署驗證和診斷工具

### 3.3 效能需求
- **Service Worker 註冊時間**：≤ 1 秒
- **首次內容繪製 (FCP)**：≤ 2 秒
- **最大內容繪製 (LCP)**：≤ 3 秒
- **累積版面偏移 (CLS)**：≤ 0.1
- **首次輸入延遲 (FID)**：≤ 100ms

### 3.4 相容性需求
- **靜態托管平台**：GitHub Pages, Cloudflare Pages, Netlify, Vercel, Firebase Hosting
- **瀏覽器支援**：Chrome 80+, Firefox 75+, Safari 12+, Edge 80+
- **行動裝置**：iOS 12+, Android 8+
- **PWA 功能**：離線支援、安裝提示、推送通知（可選）

## 4. Technical Constraints & Assumptions

### 4.1 技術限制
- **靜態托管限制**：無伺服器端處理能力，純客戶端運作
- **路徑限制**：不能使用絕對路徑或向上引用
- **安全限制**：無法實作伺服器端安全驗證
- **儲存限制**：依賴瀏覽器本地儲存 (IndexedDB, localStorage)

### 4.2 現有依賴與整合點
- **核心 PWA 功能**：保持現有的名片管理、版本控制、重複檢測功能
- **UI 組件**：保持現有的使用者介面和互動邏輯
- **資料結構**：保持 IndexedDB 資料庫結構不變
- **API 相容性**：保持現有 JavaScript API 的向下相容

### 4.3 假設條件
- 使用者使用現代瀏覽器，支援 PWA 相關技術
- 靜態托管平台支援 HTTPS 和自訂標頭
- 不需要即時的伺服器端資料同步
- 使用者接受純客戶端的安全模型

## 5. Architecture Reuse Plan

### 5.1 Reuse Mapping
| 新需求功能 | 現有模組/API | 複用方式 | 擴展需求 |
|-----------|-------------|----------|----------|
| 資源路徑管理 | 現有資源載入邏輯 | 擴展複用 | 新增路徑標準化函數 |
| Service Worker 簡化 | `sw.js` | 重構複用 | 移除複雜邏輯，保留核心功能 |
| 安全架構輕量化 | 現有安全組件 | 選擇性複用 | 保留客戶端安全，移除伺服器端依賴 |
| 環境配置 | `manifest.json` | 擴展複用 | 新增多環境配置支援 |
| 資源整合 | 現有建置流程 | 擴展複用 | 新增資源複製和優化步驟 |

### 5.2 Extension Plan

**硬編碼路徑修復策略**：
```bash
# 第一階段：資源複製
cp ../assets/moda-logo.svg assets/images/
cp ../assets/high-accessibility.css assets/styles/
cp ../assets/bilingual-common.js assets/scripts/
cp ../assets/qrcode.min.js assets/scripts/
cp ../assets/qr-utils.js assets/scripts/

# 第二階段：安全模組整合（選擇性）
cp ../src/security/SecurityInputHandler.js src/security/
cp ../src/security/SecurityDataHandler.js src/security/
cp ../src/security/SecurityAuthHandler.js src/security/
# 其他 9 個安全模組根據輕量化需求選擇性複製

# 第三階段：路徑更新
# index.html: ../assets/ → ./assets/
# manifest.json: ../assets/ → ./assets/
# sw.js: 簡化 BASE_PATH 邏輯
```

**目錄結構重組**：
```
pwa-card-storage/
├── assets/                    # 新增：整合所有資源
│   ├── icons/                # 從上層複製
│   ├── fonts/                # 從上層複製  
│   ├── images/               # 從上層複製（含 moda-logo.svg）
│   ├── scripts/              # 從上層複製必要腳本
│   │   ├── bilingual-common.js
│   │   ├── qrcode.min.js
│   │   └── qr-utils.js
│   └── styles/               # 現有樣式檔案 + 新增
│       └── high-accessibility.css  # 從上層複製
├── src/
│   ├── core/                 # 保持現有結構
│   ├── security/             # 新增：輕量級安全組件（3-5個核心模組）
│   └── config/               # 新增：環境配置管理
├── config/                   # 新增：多環境配置
│   ├── github-pages.json
│   ├── cloudflare-pages.json
│   └── default.json
├── manifest.json             # 預設配置（路徑已修復）
├── manifest-github.json      # GitHub Pages 配置（路徑已修復）
├── sw.js                     # 簡化版 Service Worker
└── deploy/                   # 新增：部署工具
    ├── validate.js           # 部署驗證
    ├── setup.js              # 環境設定
    └── path-audit.js         # 硬編碼路徑審計工具
```

**簡化 Service Worker 架構**：
```javascript
// 簡化版 Service Worker
const CACHE_NAME = 'pwa-card-storage-v3.2.0';
const BASE_PATH = getBasePath(); // 簡化的路徑檢測

// 環境檢測函數
function getBasePath() {
  if (location.hostname.includes('.github.io')) {
    return '/DB-Card';
  }
  if (location.hostname.includes('.pages.dev')) {
    return '';
  }
  return '';
}

// 標準快取策略
const CACHE_STRATEGIES = {
  static: 'cache-first',
  dynamic: 'network-first',
  images: 'cache-first'
};
```

### 5.3 Build vs. Buy vs. Reuse 分析
| 功能模組 | 決策 | 理由 | 成本評估 |
|---------|------|------|----------|
| 硬編碼路徑審計 | Build | 專案特定問題，需要客製化掃描 | 低：約 150 行腳本 |
| 路徑標準化 | Build + Manual | 需要手動複製資源 + 自動化路徑替換 | 中：約 200 行程式碼 + 手動作業 |
| Service Worker 簡化 | Reuse + Refactor | 基於現有實作，移除複雜邏輯 | 中：約 500 行程式碼重構 |
| 安全組件輕量化 | Reuse + Simplify | 從 12 個模組減少到 3-5 個核心模組 | 高：約 800 行程式碼簡化 |
| 環境配置管理 | Build | 新需求，需要新的配置系統 | 低：約 200 行程式碼 |
| 部署工具 | Build | 專案特定的部署需求 | 低：約 150 行腳本 |

### 5.4 Migration & Deprecation

**階段式遷移策略**：
1. **Phase 1 (Week 1)**：硬編碼路徑審計和資源整合
   - 執行全專案硬編碼路徑掃描
   - 複製必要資源到 PWA 目錄（16+ 個檔案）
   - 更新所有資源引用路徑（HTML、JSON、JS）
   - 建立路徑驗證工具

2. **Phase 2 (Week 2)**：Service Worker 和安全架構簡化
   - 重構 Service Worker，移除複雜的 BASE_PATH 邏輯
   - 簡化安全組件，從 12 個模組減少到 3-5 個核心模組
   - 實作環境自動檢測
   - 更新所有安全模組的路徑引用

3. **Phase 3 (Week 3)**：測試和優化
   - 多平台部署測試（驗證路徑修復效果）
   - 執行回歸測試確保功能完整性
   - 效能優化和調整
   - 文檔更新和工具完善

**向下相容性保證**：
- 現有 PWA 功能 100% 保持不變
- API 介面保持一致
- 資料結構無需遷移
- 使用者體驗無感知升級

## 6. Security & Privacy Requirements

### 6.1 威脅模型概覽
| 威脅類型 | 風險等級 | 緩解措施 |
|---------|---------|----------|
| XSS 攻擊 | High | 客戶端輸入驗證、CSP 設定、輸出編碼 |
| 資源劫持 | Medium | SRI 檢查、HTTPS 強制、資源完整性驗證 |
| 中間人攻擊 | Medium | HTTPS 強制、HSTS 設定 |
| 客戶端資料洩露 | Low | 本地加密、敏感資料最小化 |

### 6.2 靜態托管安全最佳實踐
- **Content Security Policy**：嚴格的 CSP 設定，適合靜態環境
- **Subresource Integrity**：所有外部資源使用 SRI 檢查
- **HTTPS Everywhere**：強制 HTTPS，設定 HSTS 標頭
- **客戶端驗證**：所有輸入在客戶端進行驗證和清理
- **最小權限原則**：只請求必要的瀏覽器權限

### 6.3 隱私保護
- **本地優先**：所有資料儲存在使用者裝置
- **無追蹤**：不使用任何分析或追蹤服務
- **透明度**：清楚說明資料處理和儲存方式
- **使用者控制**：提供資料匯出和刪除功能

## 7. Measurement & Validation Plan

### 7.1 部署相容性測試
**測試矩陣**：
| 托管平台 | 部署測試 | 功能測試 | 效能測試 | 安全測試 |
|---------|---------|---------|---------|---------|
| GitHub Pages | ✅ 自動部署 | ✅ 完整功能 | ✅ 效能指標 | ✅ 安全掃描 |
| Cloudflare Pages | ✅ 自動部署 | ✅ 完整功能 | ✅ 效能指標 | ✅ 安全掃描 |
| Netlify | ✅ 自動部署 | ✅ 完整功能 | ✅ 效能指標 | ✅ 安全掃描 |
| Vercel | ✅ 自動部署 | ✅ 完整功能 | ✅ 效能指標 | ✅ 安全掃描 |
| Firebase Hosting | ✅ 自動部署 | ✅ 完整功能 | ✅ 效能指標 | ✅ 安全掃描 |

### 7.2 自動化測試流程
```yaml
# CI/CD 測試流程
deploy_test:
  strategy:
    matrix:
      platform: [github-pages, cloudflare-pages, netlify, vercel]
  steps:
    - name: Deploy to platform
    - name: Validate deployment
    - name: Run functional tests
    - name: Check performance metrics
    - name: Security scan
    - name: Generate report
```

### 7.3 效能監控
- **Core Web Vitals**：LCP, FID, CLS 持續監控
- **PWA Score**：Lighthouse PWA 評分 ≥ 90
- **載入時間**：首次載入和後續載入時間追蹤
- **錯誤率**：JavaScript 錯誤和網路錯誤監控

### 7.4 使用者驗收測試
- **部署成功率**：5 個平台部署成功率 ≥ 99%
- **功能一致性**：跨平台功能差異 ≤ 5%
- **使用者體驗**：載入時間和互動回應時間滿足要求
- **安全性**：通過基本安全掃描，無高風險漏洞

## 8. Appendix

### 8.1 部署平台特性對比
| 平台 | 路徑前綴 | 自訂標頭 | SPA 支援 | 建置整合 | 備註 |
|------|---------|---------|---------|---------|------|
| GitHub Pages | `/repo-name/` | 有限 | 需配置 | GitHub Actions | 免費，但功能有限 |
| Cloudflare Pages | `/` | 完整 | 原生 | Git 整合 | 效能優秀，功能完整 |
| Netlify | `/` | 完整 | 原生 | 多種整合 | 功能豐富，易用性高 |
| Vercel | `/` | 完整 | 原生 | Git 整合 | 效能導向，開發者友善 |
| Firebase Hosting | `/` | 完整 | 原生 | CLI 工具 | Google 生態系整合 |

### 8.2 硬編碼路徑審計工具規格
```javascript
// deploy/path-audit.js - 硬編碼路徑審計工具
class HardcodedPathAuditor {
  constructor() {
    this.patterns = {
      upwardReference: /\.\.\/[^\s"']+/g,
      assetPath: /\/assets\/[^\s"']+/g,
      srcPath: /\/src\/[^\s"']+/g,
      manifestIcon: /"src":\s*"[^"]*\.\.\/[^"]*"/g
    };
  }
  
  async scanProject() {
    const results = {
      totalFiles: 0,
      affectedFiles: [],
      pathIssues: [],
      fixSuggestions: []
    };
    
    // 掃描 HTML 檔案
    await this.scanFileType('**/*.html', results);
    // 掃描 JSON 檔案 (manifest)
    await this.scanFileType('**/*.json', results);
    // 掃描 JS 檔案
    await this.scanFileType('**/*.js', results);
    
    return results;
  }
  
  generateFixScript(results) {
    return `#!/bin/bash
# 自動生成的路徑修復腳本

# 複製資源檔案
${this.generateCopyCommands(results)}

# 更新路徑引用
${this.generateReplaceCommands(results)}

# 驗證修復結果
node deploy/validate.js
`;
  }
}
```

### 8.3 硬編碼路徑審計報告
```
📊 硬編碼路徑審計報告
==================================================
掃描檔案總數: 20
受影響檔案: 2
問題總數: 21

🔍 受影響的檔案:
  📄 pwa-card-storage/index.html (20 個問題)
    ⚠️  Line 15: ../assets/moda-logo.svg
    ⚠️  Line 32: ../assets/high-accessibility.css
    ⚠️  Line 258: ../src/security/SecurityInputHandler.js
    ⚠️  Line 259: ../src/security/SecurityDataHandler.js
    ⚠️  Line 260: ../src/security/SecurityAuthHandler.js
    ⚠️  Line 263: ../src/security/StaticHostingSecurityToggle.js
    ⚠️  Line 264: ../src/security/StaticHostingCompatibilityLayer.js
    ⚠️  Line 265: ../src/security/ClientSideSecurityHealthMonitor.js
    ⚠️  Line 267: ../src/security/ClientSideGracefulDegradation.js
    ⚠️  Line 268: ../src/security/ClientSideSecurityErrorRecovery.js
    ⚠️  Line 270: ../src/security/ClientSideSecurityRollback.js
    ⚠️  Line 271: ../src/security/ClientSideUserImpactMonitor.js
    ⚠️  Line 272: ../src/security/ClientSideSecurityDashboard.js
    ⚠️  Line 275: ../src/security/ClientSideUserCommunication.js
    ⚠️  Line 276: ../src/security/ClientSideSecurityOnboarding.js
    ⚠️  Line 277: ../src/security/ClientSideSecuritySettings.js
    ⚠️  Line 284: ../assets/bilingual-common.js
    ⚠️  Line 285: ../assets/qrcode.min.js
    ⚠️  Line 286: ../assets/qr-utils.js
    ... 還有 1 個問題

  📄 pwa-card-storage/manifest.json (1 個問題)
    ⚠️  Line 32: ../assets/moda-logo.svg

🛠️  修復建議:
1. 複製資源檔案到 PWA 目錄
   cp ../assets/moda-logo.svg assets/images/moda-logo.svg
   cp ../assets/high-accessibility.css assets/styles/high-accessibility.css
   cp ../assets/bilingual-common.js assets/scripts/bilingual-common.js
   cp ../assets/qrcode.min.js assets/scripts/qrcode.min.js
   cp ../assets/qr-utils.js assets/scripts/qr-utils.js

2. 選擇性複製安全模組（根據輕量化需求）
   cp ../src/security/SecurityInputHandler.js src/security/
   cp ../src/security/SecurityDataHandler.js src/security/
   cp ../src/security/SecurityAuthHandler.js src/security/
   # 其他 9 個安全模組根據需求選擇性複製

💡 執行審計工具:
   cd pwa-card-storage && node ../deploy/path-audit.js
   
🔧 生成修復腳本:
   node ../deploy/path-audit.js --fix
   bash fix-hardcoded-paths.sh
```

### 8.4 資源整合清單
```bash
# 基於審計報告的資源整合策略

# 第一階段：核心資源檔案（5個）
cp ../assets/moda-logo.svg assets/images/
cp ../assets/high-accessibility.css assets/styles/
cp ../assets/bilingual-common.js assets/scripts/
cp ../assets/qrcode.min.js assets/scripts/
cp ../assets/qr-utils.js assets/scripts/

# 第二階段：核心安全模組（3個必要）
cp ../src/security/SecurityInputHandler.js src/security/
cp ../src/security/SecurityDataHandler.js src/security/
cp ../src/security/SecurityAuthHandler.js src/security/

# 第三階段：可選安全模組（根據輕量化需求）
# StaticHostingSecurityToggle.js
# StaticHostingCompatibilityLayer.js
# ClientSideSecurityHealthMonitor.js
# ... 其他 6 個模組

# 第四階段：路徑更新
sed -i 's|../assets/|./assets/|g' index.html
sed -i 's|../assets/|./assets/|g' manifest.json
sed -i 's|../assets/|./assets/|g' manifest-github.json
sed -i 's|../src/security/|./src/security/|g' index.html
```

### 8.5 環境配置範例
```json
// config/github-pages.json
{
  "basePath": "/DB-Card",
  "manifestPath": "./manifest-github.json",
  "serviceWorkerPath": "./sw.js",
  "assetPrefix": "/DB-Card/pwa-card-storage",
  "features": {
    "pushNotifications": false,
    "backgroundSync": true
  }
}

// config/cloudflare-pages.json
{
  "basePath": "",
  "manifestPath": "./manifest.json",
  "serviceWorkerPath": "./sw.js",
  "assetPrefix": "",
  "features": {
    "pushNotifications": true,
    "backgroundSync": true
  }
}
```

### 8.6 部署驗證腳本
```javascript
// deploy/validate.js
async function validateDeployment() {
  const tests = [
    checkResourcePaths,
    validateServiceWorker,
    testPWAFeatures,
    checkSecurityHeaders,
    measurePerformance
  ];
  
  const results = await Promise.all(
    tests.map(test => test().catch(err => ({ error: err.message })))
  );
  
  return {
    success: results.every(r => !r.error),
    results,
    timestamp: new Date().toISOString()
  };
}
```

### 8.7 故障排除指南
| 問題 | 症狀 | 解決方案 |
|------|------|----------|
| 資源載入失敗 | 404 錯誤 | 檢查資源路徑，確保使用相對路徑 |
| Service Worker 註冊失敗 | PWA 功能異常 | 檢查 SW 路徑和 scope 設定 |
| Manifest 錯誤 | 安裝提示不出現 | 驗證 manifest.json 格式和路徑 |
| CSP 違規 | 控制台安全錯誤 | 調整 CSP 設定，允許必要資源 |
| 效能問題 | 載入緩慢 | 檢查資源大小，啟用壓縮和快取 |

### 8.8 技術名詞表
- **靜態托管 (Static Hosting)**：只提供靜態檔案服務，無伺服器端處理的托管方式
- **SRI (Subresource Integrity)**：確保外部資源完整性的安全機制
- **CSP (Content Security Policy)**：防止 XSS 攻擊的安全標頭
- **PWA (Progressive Web App)**：具備原生應用特性的網頁應用程式
- **Service Worker**：在背景執行的腳本，提供離線功能和快取管理

### 8.9 參考文件
- [PWA 最佳實踐指南](https://web.dev/progressive-web-apps/)
- [靜態托管安全指南](https://owasp.org/www-project-web-security-testing-guide/)
- [GitHub Pages 文檔](https://docs.github.com/en/pages)
- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [硬編碼路徑審計工具](../deploy/path-audit.js) - 本專案審計工具
- [審計報告範例](#83-硬編碼路徑審計報告) - 實際執行結果

---

## Spec↔Design↔Tasks 映射表

| 需求編號 | 功能需求 | 現有基礎 | 實作任務 | 測試案例 |
|---------|---------|---------|---------|---------| 
| REQ-001 | 硬編碼路徑審計與修復 | 現有 16+ 處硬編碼路徑 | 建立審計工具和修復腳本 | 路徑審計和修復驗證測試 |
| REQ-002 | 資源路徑標準化 | 現有資源載入邏輯 | 資源複製和路徑重寫 | 跨平台資源載入測試 |
| REQ-003 | Service Worker 簡化 | 現有 `sw.js` 複雜 BASE_PATH 邏輯 | 重構和簡化邏輯 | SW 註冊和快取測試 |
| REQ-004 | 安全架構輕量化 | 現有 12 個安全模組 | 減少到 3-5 個核心模組 | 客戶端安全功能測試 |
| REQ-005 | 環境配置管理 | 現有 manifest 系統 | 多環境配置實作 | 環境檢測和配置測試 |
| REQ-006 | 資源整合與優化 | 現有建置流程 | 資源整合和優化 | 效能和載入時間測試 |