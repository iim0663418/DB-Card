---
version: "1.6.0"
rev_id: "R-004"
last_updated: "2024-12-20"
owners: ["PWA Team", "DB-Card Project"]
status: "🎨 Design System Alignment Required"
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

### R-005: 離線 QR 碼生成與分享
**需求描述**：完全離線生成 QR 碼並提供多種分享方式
**Acceptance Criteria**：
- Given 使用者檢視已儲存名片
- When 選擇分享功能
- Then 使用與原生成器相同的編碼邏輯生成 QR 碼
- And 支援 QR 碼下載（PNG/SVG 格式）
- And 提供 Web Share API 原生分享
- And 支援複製連結、社群媒體分享
- And 確保與兩種生成器 100% 相容

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

## 6. Implementation Status - ✅ 全面完成

### 當前狀態 (v1.5.0) - ✅ 功能完整，僅需移除 QR 掃描
- **完成度**: ✅ 核心功能已完整實現 (僅需移除 QR 掃描)
- **狀態**: ✅ 功能完整，僅需簡單清理
- **兩大生成器整合**: ✅ 完整實現
- **9 種名片類型支援**: ✅ 完整實現
- **DB 儲存調用統一**: ✅ 完整實現
- **離線 QR 碼生成**: ✅ 完整實現
- **vCard 匯出功能**: ✅ 完整實現
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
| R-005 | 離線QR碼生成 | D-005 | PWA-09 | ✅ 完成 |
| R-006 | 跨設備資料傳輸 | D-006 | PWA-11,PWA-12 | ✅ 完成 |
| R-007 | 資料完整性保障 | D-007 | PWA-07 | ✅ 完成 |
| R-008 | 雙語支援整合 | D-008 | PWA-04 | ✅ 完成 |
| R-009 | 數位發展部設計系統對齊 | D-009 | PWA-20 | 🔄 設計中 |