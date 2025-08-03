---
version: "2.0.0"
rev_id: "R-018"
last_updated: "2024-12-20"
owners: ["PWA Team", "DB-Card Project", "Performance Team"]
status: "✅ Phase 1 Complete, Phase 2-4 Planned"
---

# PWA 名片離線收納與分享中心產品需求文件 (PRD)

## 1. Product Overview

### 背景與目標
基於現有 NFC 數位名片系統，開發 PWA 離線收納與分享中心。聚焦於手動收納、精選管理和便捷分享，整合 DB 儲存調用方式，參考兩大生成器與 9 個名片介面設計 parser 進行讀取顯示。

**核心整合需求**：
- **兩大生成器整合**：完全相容 nfc-generator.html 和 nfc-generator-bilingual.html 的業務邏輯
- **9 種名片類型支援**：機關版延平/新光、個人版、雙語版、英文版等完整類型識別
- **DB 儲存調用統一**：IndexedDB + bilingual-common.js 橋接，確保資料格式一致性

### 目標使用者
**主要使用者**：數位發展部員工
- 使用場景：離線瀏覽和儲存名片
- 設備：智慧手機（iOS/Android）、平板
- 名片類型：支援所有 9 種 DB-Card 格式

### 核心價值主張
> 提供隱私優先的離線名片收納與分享中心，支援手動精選管理，統一 DB 調用方式，完全相容 9 種名片介面格式

## 2. Functional Requirements

### R-001: 兩大生成器整合
**需求描述**：完全整合現有兩大生成器的業務邏輯
**Acceptance Criteria**：
- Given 使用者從任一生成器產生的名片
- When PWA 接收名片資料
- Then 正確解析並儲存，保持 100% 相容性
- And 支援兩種生成器的 QR 碼格式

### R-002: 9 種名片類型 Parser
**需求描述**：自動識別並正確顯示 9 種名片類型
**支援類型**：
- gov-yp (機關版-延平大樓)
- gov-sg (機關版-新光大樓)  
- personal (個人版)
- bilingual (雙語版)
- personal-bilingual (個人雙語版)
- en (英文版)
- personal-en (個人英文版)
- gov-yp-en (機關版延平英文)
- gov-sg-en (機關版新光英文)

**Acceptance Criteria**：
- Given 任一類型的名片資料
- When 系統進行類型識別
- Then 自動套用對應的樣式和佈局
- And 正確處理各類型的特殊欄位

### R-003: 統一 DB 儲存調用
**需求描述**：建立統一的資料庫儲存和調用機制
**技術架構**：
- **主儲存**：IndexedDB (cards, versions, settings, backups)
- **橋接層**：bilingual-bridge.js 整合現有 bilingual-common.js
- **加密層**：AES-256 本地加密
- **完整性**：SHA-256 校驗和驗證

**Acceptance Criteria**：
- Given 名片資料需要儲存
- When 呼叫統一儲存 API
- Then 資料加密儲存到 IndexedDB
- And 建立版本快照（限制 10 個版本）
- And 更新完整性校驗和

### R-004: 現有使用者旅程優化
**需求描述**：保持並優化現有的名片介面使用者旅程
**技術實作**：優化現有的路由和資料處理流程
**Acceptance Criteria**：
- Given 使用者透過名片介面進入 PWA
- When 系統接收名片資料
- Then 自動識別名片類型並解析資料
- And 提供流暢的儲存和管理體驗
- And 保持與兩大生成器的完全相容性
- And 支援所有 9 種名片類型的完整功能

### R-005: 離線 QR 碼生成與分享 ✅ 完成
**需求描述**：完全離線生成 QR 碼並提供多種分享方式
**最新狀態**：✅ vCard 生成機制已修復，解決 [object Object] 問題
**Acceptance Criteria**：
- ✅ Given 使用者檢視已儲存名片
- ✅ When 選擇分享功能  
- ✅ Then 使用與原生成器相同的編碼邏輯生成 QR 碼
- ✅ And 支援 QR 碼下載（PNG/SVG 格式）
- ✅ And 提供 Web Share API 原生分享
- ✅ And 支援複製連結、社群媒體分享
- ✅ And 確保與兩種生成器 100% 相容
- ✅ **NEW**: vCard 匯出正確處理所有名片類型，無格式錯誤

### R-006: 跨設備資料傳輸與備份
**需求描述**：透過加密檔案和多種方式實現設備間資料同步
**Acceptance Criteria**：
- Given 使用者需要傳輸或備份名片資料
- When 選擇匯出功能
- Then 建立 AES-256 加密傳輸檔案
- And 支援檔案分享、雲端儲存上傳
- And 提供匯入時的衝突解決機制
- And 支援選擇性匯出和批次操作

### R-007: 資料完整性保障
**需求描述**：自動檢測和修復資料損壞
**Acceptance Criteria**：
- Given PWA 啟動或關鍵操作
- When 執行健康檢查
- Then 驗證所有名片資料完整性
- And 自動修復可修復的損壞
- And 記錄無法修復的問題

### R-008: 雙語支援整合
**需求描述**：完整支援中英文雙語切換
**技術實作**：bilingual-bridge.js 橋接現有系統
**Acceptance Criteria**：
- Given 雙語名片資料
- When 使用者切換語言
- Then 正確顯示對應語言內容
- And 保持所有功能正常運作

### R-009: 數位發展部設計系統對齊 ⭐ NEW
**需求描述**：PWA介面完全對齊數位發展部全球資訊網設計系統，確保視覺一致性
**優先級**：High
**技術實作**：
- 導入完整 `--md-*` CSS變數系統
- 實作 `.dark` 類別深色模式切換
- 整合 Bootstrap 5 + 數位發展部自訂變數
- 統一字體系統：PingFang TC, Noto Sans TC

**Acceptance Criteria**：
- Given PWA載入時
- When 系統初始化設計系統
- Then 所有介面元素使用數位發展部官方色彩變數
- And 字體系統與官網完全一致
- And 支援深色模式自動切換
- And 響應式佈局符合官網標準
- And 視覺一致性達到100%

**設計系統規格**：
- **主色系**：`--md-primary-1: #6868ac`
- **次要色系**：`--md-secondary-1: #565e62`
- **中性色系**：`--md-neutral-*` 完整色階
- **基礎色**：`--md-white-1`, `--md-black-1`
- **字體**：`'PingFang TC', 'Noto Sans TC', sans-serif`
- **字重**：300 (輕量)
- **基準字體大小**：0.875rem
- **佈局**：flexbox + Bootstrap 5 類別

## 3. Non-Functional Requirements

### Secure by Default 清單
- ✅ **本地加密儲存**：AES-256 加密所有敏感資料
- ✅ **CSP 安全政策**：嚴格的 Content Security Policy
- ✅ **輸入驗證**：所有資料輸入嚴格驗證和清理
- ✅ **最小權限**：僅請求必要的系統權限
- ✅ **完整性驗證**：SHA-256 校驗和檢查

### Cognitive Load-Friendly 清單
- ✅ **直觀操作**：操作步驟不超過 3 步
- ✅ **即時回饋**：所有操作提供視覺確認
- ✅ **錯誤預防**：重要操作提供確認機制
- ✅ **無障礙設計**：符合 WCAG 2.1 AA 標準
- 🔄 **視覺一致性**：與數位發展部官網100%一致
- 🔄 **設計系統統一**：使用官方設計變數和元件

### 效能需求
- 載入時間：< 3 秒（離線狀態）
- 資料處理速度：< 500ms
- QR 碼生成：< 2 秒
- 資料查詢：< 500ms（本地 IndexedDB）
- 儲存容量：支援 > 1000 張名片
- **設計系統效能**：CSS變數切換 < 100ms，深色模式切換 < 200ms

## 4. Technical Constraints & Assumptions

### DB 整合約束
- 必須與現有 bilingual-common.js 完全相容
- 支援兩大生成器的所有資料格式
- 保持 9 種名片類型的完整功能
- 純前端架構，無後端依賴

### 設計系統約束 ⭐ NEW
- 必須使用數位發展部官方CSS變數系統
- 保持與官網字體系統一致（PingFang TC, Noto Sans TC）
- 支援深色模式自動切換機制
- 使用Bootstrap 5佈局系統並整合自訂變數
- 維持現有PWA功能完整性，僅更新視覺層

### 技術假設
- 現代瀏覽器支援 PWA 和 IndexedDB
- 使用者設備支援 Web Share API（分享功能）
- 網路環境允許初始 PWA 安裝和更新
- 瀏覽器支援CSS自訂屬性（CSS Variables）
- 使用者設備支援現代字體渲染（PingFang TC, Noto Sans TC）

## 5. UX Principles & Design System ⭐ NEW

### 數位發展部設計系統核心原則
- **視覺一致性**：與官網保持100%視覺一致
- **色彩系統**：使用官方色彩變數，支援深色模式
- **字體系統**：統一使用PingFang TC和Noto Sans TC
- **佈局系統**：Bootstrap 5 flexbox + 自訂變數
- **響應式設計**：支援多設備尺寸自適應

### 關鍵使用者旅程設計原則
1. **視覺一致性保障**：使用者從官網進入PWA時無縫體驗
2. **設計系統統一**：所有介面元素使用相同設計變數
3. **深色模式支援**：自動識別使用者偏好並切換
4. **無障礙設計**：符合WCAG 2.1 AA標準的色彩對比和字體大小

### 設計令牌（Design Tokens）
```css
/* 主色系 */
--md-primary-1: #6868ac;
--md-primary-2: rgba(104, 104, 172, 0.89);
--md-primary-3: #4e4e81;
--md-primary-4: #a4a4cd;
--md-primary-5: #dbdbeb;

/* 次要色系 */
--md-secondary-1: #565e62;
--md-secondary-2: #6E777C;
--md-secondary-3: #7b868c;

/* 中性色系 */
--md-neutral-1: #1a1a1a;
--md-neutral-2: #3e4346;
--md-neutral-9: #f3f5f6;
--md-neutral-10: #f4f6f7;

/* 基礎色 */
--md-white-1: #fff;
--md-black-1: #000;

/* 字體系統 */
--bs-body-font-family: 'PingFang TC', 'Noto Sans TC', sans-serif;
--bs-body-font-weight: 300;
--bs-body-font-size: 0.875rem;
```

## 6. Implementation Status - ✅ Phase 1 Complete, Phase 2-4 Roadmap

### 當前狀態 (v1.0.4) - ✅ 效能優化完成
- **Phase 1 (v1.0.4)**: ✅ 並行初始化 + 效能優化完成
- **Phase 2 (v1.1.0)**: 🔄 模組懶載入 + 效能監控計劃中
- **Phase 3 (v1.2.0)**: 🔄 智慧快取策略計劃中
- **Phase 4 (v2.0.0)**: 🔄 微前端架構計劃中
- **兩大生成器整合**: ✅ 完整實現
- **9 種名片類型支援**: ✅ 完整實現
- **DB 儲存調用統一**: ✅ 完整實現
- **離線 QR 碼生成**: ✅ 完整實現
- **vCard 匯出功能**: ✅ 完整實現，[object Object] 問題已修復
- **跨設備傳輸**: ✅ 完整實現
- **雙語支援**: ✅ 完整實現

### 核心組件狀態
- ✅ **bilingual-bridge.js**: 完整實作，提供雙語橋接
- ✅ **storage.js**: IndexedDB 統一儲存管理
- ✅ **card-manager.js**: 9 種類型識別和管理
- ✅ **offline-tools.js**: QR 碼生成、vCard 匯出、分享功能
- ✅ **transfer-manager.js**: 跨設備加密傳輸
- ✅ **version-manager.js**: 10 版本限制的版本控制
- ❌ **qr-scanner.js**: 將被移除的 QR 掃描功能

## 6. Spec↔Design↔Tasks 映射表

| ReqID | Requirement | DesignID | TaskID | Status |
|-------|-------------|----------|---------|---------|
| R-001 | 兩大生成器整合 | D-001 | PWA-09A | ✅ 完成 |
| R-002 | 9種名片類型Parser | D-002 | PWA-03 | ✅ 完成 |
| R-003 | 統一DB儲存調用 | D-003 | PWA-02,PWA-05 | ✅ 完成 |
| R-004 | QR掃描功能移除 | D-004 | PWA-19 | 🔄 清理中 |
| R-005 | 離線QR碼生成 | D-005 | PWA-09 | ✅ 完成 + vCard修復 |
| R-006 | 跨設備資料傳輸 | D-006 | PWA-11,PWA-12 | ✅ 完成 |
| R-007 | 資料完整性保障 | D-007 | PWA-07 | ✅ 完成 |
| R-008 | 雙語支援整合 | D-008 | PWA-04 | ✅ 完成 |
| R-009 | 數位發展部設計系統對齊 | D-009 | PWA-20 | ✅ 完成 |
| R-010 | 版本自動化管理 | D-010 | PWA-21 | ✅ 完成 |
| R-011 | IndexedDB連線穩定性 | D-011 | PWA-22 | ✅ 完成 |
| R-012 | PWA初始化效能優化 | D-012 | PWA-23 | ✅ 完成 |
| R-013 | PWA安裝提示修復 | D-013 | PWA-24 | ✅ 完成 |
| R-014 | 模組懶載入架構 | D-014 | PWA-25 | 🔄 計劃中 |
| R-015 | 智慧快取策略 | D-015 | PWA-26 | 🔄 計劃中 |
| R-016 | 微前端架構準備 | D-016 | PWA-27 | 🔄 計劃中 |
| R-017 | 效能監控與分析 | D-017 | PWA-28 | 🔄 計劃中 |
| R-018 | 漸進式載入優化 | D-018 | PWA-29 | 🔄 計劃中 |

### R-010: 版本自動化管理 🆕 NEW
**需求描述**：應用版本號與 manifest.json 自動同步，避免手動維護多處版本資訊
**優先級**：Medium
**技術實作**：
- PWA 啟動時動態讀取 `manifest.json` 的 `version` 欄位
- 統計卡片顯示格式：`v{version}`
- 網路錯誤時使用備用版本號

**Acceptance Criteria**：
- ✅ Given 開發者更新 manifest.json 版本
- ✅ When PWA 重新載入
- ✅ Then 自動顯示新版本號
- ✅ And 無需手動更新其他檔案

### R-011: IndexedDB連線穩定性 🆕 NEW
**需求描述**：解決 PWA 離線狀態下長時間使用導致的 IndexedDB 連線關閉問題
**優先級**：Critical
**技術實作**：
- 自動重連機制：`ensureConnection()` 方法
- 安全事務處理：`safeTransaction()` 含重試機制
- 連線狀態監控：每 30 秒檢查連線健康狀態

**Acceptance Criteria**：
- ✅ Given PWA 離線狀態下長時間運行
- ✅ When IndexedDB 連線中斷
- ✅ Then 自動重新建立連線
- ✅ And 所有資料庫操作正常運作
- ✅ And 使用者無感知連線問題
### R-012: PWA 初始化效能優化 🆕 NEW
**需求描述**：優化 PWA 應用啟動速度和初始化流程，提升用戶體驗
**優先級**：High
**技術實作**：
- 移除冗餘調試日誌，減少控制台輸出 85%
- 實作並行服務初始化，縮短啟動時間 30-40%
- 語言管理器初始化時間從 100ms 優化至 50ms
- Service Worker 靜默註冊，避免不必要的錯誤提示

**Acceptance Criteria**：
- ✅ Given PWA 應用啟動
- ✅ When 執行初始化流程
- ✅ Then 載入時間減少 30-40%
- ✅ And 控制台日誌輸出減少 85%
- ✅ And 用戶體驗更加流暢

### R-013: PWA 安裝提示修復 🆕 NEW
**需求描述**：修復 PWA 安裝提示不顯示的問題，改善安裝體驗
**優先級**：Medium
**技術實作**：
- 添加 DOM 元素存在性檢查
- 修復 CSS 顯示/隱藏邏輯
- 實作已安裝狀態檢測機制
- 添加淡入動畫效果

**Acceptance Criteria**：
- ✅ Given 用戶首次訪問且支援 PWA
- ✅ When 觸發安裝提示事件
- ✅ Then 正確顯示安裝提示
- ✅ And 已安裝時自動隱藏提示
- ✅ And 提供流暢的動畫效果
### R-014: 模組懶載入架構 🆕 NEW (v1.1.0)
**需求描述**：實作按需載入模組機制，進一步優化初始載入時間和記憶體使用
**優先級**：Medium
**技術實作**：
- 非核心模組延遲載入（QR 生成器、vCard 匯出器、傳輸管理器）
- 實作動態 import() 機制
- 建立模組載入狀態管理
- 用戶操作觸發時才載入對應模組

**Acceptance Criteria**：
- Given 用戶首次載入 PWA
- When 應用初始化完成
- Then 僅載入核心模組，初始載入時間再減少 20%
- And 非核心功能首次使用時動態載入
- And 載入狀態提供視覺回饋

### R-015: 智慧快取策略 🆕 NEW (v1.2.0)
**需求描述**：實作智慧快取機制，優化資料存取效能和離線體驗
**優先級**：Medium
**技術實作**：
- 實作多層快取架構（記憶體快取 + IndexedDB + Service Worker）
- 智慧快取失效策略（LRU + TTL）
- 預測性快取（基於使用模式）
- 快取壓縮和優化

**Acceptance Criteria**：
- Given 用戶頻繁使用特定名片
- When 系統分析使用模式
- Then 自動預載入相關資料到快取
- And 快取命中率達到 85% 以上
- And 離線狀態下資料存取時間 < 100ms

### R-016: 微前端架構準備 🆕 NEW (v2.0.0)
**需求描述**：為未來微前端架構奠定基礎，實現模組化和可擴展性
**優先級**：Low
**技術實作**：
- 模組邊界清晰化，實作模組間通訊機制
- 建立統一的狀態管理和事件系統
- 實作模組熱更新機制
- 準備模組獨立部署能力

**Acceptance Criteria**：
- Given 系統需要新增功能模組
- When 開發新功能
- Then 可以獨立開發和部署模組
- And 模組間通訊穩定可靠
- And 支援模組熱更新不影響其他功能

### R-017: 效能監控與分析 🆕 NEW (v1.1.0)
**需求描述**：建立完整的效能監控體系，持續優化用戶體驗
**優先級**：High
**技術實作**：
- 實作 Real User Monitoring (RUM)
- 建立效能指標儀表板
- 自動效能回歸檢測
- 用戶體驗指標追蹤（Core Web Vitals）

**Acceptance Criteria**：
- Given PWA 在生產環境運行
- When 收集用戶使用數據
- Then 提供詳細的效能分析報告
- And 自動檢測效能回歸並告警
- And 支援 A/B 測試效能對比

### R-018: 漸進式載入優化 🆕 NEW (v1.1.0)
**需求描述**：實作漸進式載入策略，優化首屏渲染和用戶感知效能
**優先級**：High
**技術實作**：
- 關鍵渲染路徑優化
- 資源優先級管理
- 骨架屏和載入狀態優化
- 圖片和資源懶載入

**Acceptance Criteria**：
- Given 用戶訪問 PWA
- When 頁面開始載入
- Then 首屏內容在 1.5 秒內可見
- And 關鍵功能在 2 秒內可交互
- And 載入過程提供流暢的視覺回饋
## 7. 後續優化階段路線圖

### Phase 2 (v1.1.0) - 模組化與監控
**目標發布時間**：2025 Q1
**核心功能**：
- R-014: 模組懶載入架構
- R-017: 效能監控與分析  
- R-018: 漸進式載入優化

**預期效益**：
- 初始載入時間再減少 20%
- 首屏渲染時間 < 1.5 秒
- 建立完整效能監控體系

### Phase 3 (v1.2.0) - 智慧化優化
**目標發布時間**：2025 Q2
**核心功能**：
- R-015: 智慧快取策略
- 用戶行為分析與預測
- 自適應效能調整

**預期效益**：
- 快取命中率 > 85%
- 離線資料存取 < 100ms
- 智慧預載入機制

### Phase 4 (v2.0.0) - 架構現代化
**目標發布時間**：2025 Q3
**核心功能**：
- R-016: 微前端架構準備
- 模組獨立部署能力
- 熱更新機制

**預期效益**：
- 模組化開發和部署
- 支援功能熱更新
- 為未來擴展奠定基礎

### 效能目標對比

| 指標 | v1.0.4 | v1.1.0 目標 | v1.2.0 目標 | v2.0.0 目標 |
|------|--------|-------------|-------------|-------------|
| 初始載入時間 | 480ms | 380ms | 300ms | 250ms |
| 首屏渲染 | 2.0s | 1.5s | 1.2s | 1.0s |
| 快取命中率 | 60% | 75% | 85% | 90% |
| 記憶體使用 | 基準 | -10% | -15% | -20% |
| 模組化程度 | 低 | 中 | 高 | 完全 |