---
version: "1.3.2"
rev_id: "R-001"
last_updated: "2024-12-19"
owners: ["PWA Team", "DB-Card Project"]
status: "Production Ready"
---

# PWA 名片離線儲存服務產品需求文件 (PRD)

## 1. Product Overview

### 背景與目標
基於現有 NFC 數位名片系統，開發 PWA 離線儲存服務。整合 DB 儲存調用方式，參考兩大生成器（nfc-generator.html、nfc-generator-bilingual.html）與 9 個名片介面設計 parser 進行讀取顯示。

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
> 提供與兩大生成器完全相容的離線名片儲存容器，統一 DB 調用方式，支援 9 種名片介面 parser

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

### R-004: QR 碼掃描與自動匯入
**需求描述**：掃描 DB-Card QR 碼並自動儲存到本地
**技術實作**：html5-qrcode 整合
**Acceptance Criteria**：
- Given 使用者開啟 QR 碼掃描功能
- When 掃描 DB-Card 格式的 QR 碼
- Then 自動解析並驗證資料格式
- And 支援相機掃描和檔案上傳
- And 掃描成功後自動匯入到 IndexedDB
- And 提供即時使用者回饋

### R-005: 離線 QR 碼生成
**需求描述**：完全離線生成與兩大生成器相容的 QR 碼
**Acceptance Criteria**：
- Given 使用者檢視已儲存名片
- When 選擇生成 QR 碼
- Then 使用與原生成器相同的編碼邏輯
- And 生成高品質 QR 碼（完全離線）
- And 確保與兩種生成器 100% 相容

### R-006: 跨設備資料傳輸
**需求描述**：透過加密檔案實現設備間資料同步
**Acceptance Criteria**：
- Given 使用者需要傳輸名片資料
- When 選擇匯出功能
- Then 建立 AES-256 加密傳輸檔案
- And 生成 QR 碼分享下載連結
- And 支援批次選擇和衝突解決

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

### 效能需求
- 載入時間：< 3 秒（離線狀態）
- QR 碼掃描：< 2 秒 識別時間
- 資料查詢：< 500ms（本地 IndexedDB）
- 儲存容量：支援 > 1000 張名片

## 4. Technical Constraints & Assumptions

### DB 整合約束
- 必須與現有 bilingual-common.js 完全相容
- 支援兩大生成器的所有資料格式
- 保持 9 種名片類型的完整功能
- 純前端架構，無後端依賴

### 技術假設
- 現代瀏覽器支援 PWA 和 IndexedDB
- 使用者設備支援相機權限（QR 掃描）
- 網路環境允許初始 PWA 安裝

## 5. Implementation Status - ✅ 已完成

### 當前狀態 (v1.3.2)
- **完成度**: 98% (19/20 項任務完成)
- **狀態**: ✅ 生產就緒
- **兩大生成器整合**: ✅ 完成
- **9 種名片類型支援**: ✅ 完成
- **DB 儲存調用統一**: ✅ 完成
- **QR 掃描實質效果**: ✅ 修復完成

### 核心組件狀態
- ✅ **bilingual-bridge.js**: 完整實作，提供雙語橋接
- ✅ **storage.js**: IndexedDB 統一儲存管理
- ✅ **card-manager.js**: 9 種類型識別和管理
- ✅ **qr-scanner.js**: html5-qrcode 整合，掃描後自動儲存
- ✅ **transfer-manager.js**: 跨設備加密傳輸
- ✅ **version-manager.js**: 10 版本限制的版本控制

## 6. Spec↔Design↔Tasks 映射表

| ReqID | Requirement | DesignID | TaskID | Status |
|-------|-------------|----------|---------|---------|
| R-001 | 兩大生成器整合 | D-001 | PWA-09A | ✅ 完成 |
| R-002 | 9種名片類型Parser | D-002 | PWA-03 | ✅ 完成 |
| R-003 | 統一DB儲存調用 | D-003 | PWA-02,PWA-05 | ✅ 完成 |
| R-004 | QR碼掃描自動匯入 | D-004 | PWA-19 | ✅ 完成 |
| R-005 | 離線QR碼生成 | D-005 | PWA-09 | ✅ 完成 |
| R-006 | 跨設備資料傳輸 | D-006 | PWA-11,PWA-12 | ✅ 完成 |
| R-007 | 資料完整性保障 | D-007 | PWA-07 | ✅ 完成 |
| R-008 | 雙語支援整合 | D-008 | PWA-04 | ✅ 完成 |