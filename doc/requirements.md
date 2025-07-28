# PWA 名片收藏服務需求規格書

## 1. Product Overview

### 背景與目標
基於現有 NFC 數位名片系統，擴展 PWA 收藏功能，讓使用者能夠收藏、管理和搜尋他人的數位名片，維持「隱私優先」與「Cognitive Load-Friendly」設計原則。

### 目標使用者
- **主要使用者**: 經常參與商務交流的專業人士
- **次要使用者**: 需要管理大量聯絡人的業務開發人員
- **使用情境**: 會議、研討會、商務聚會等名片交換場合

### 核心價值主張
- **隱私保護**: 所有資料本地儲存，無雲端追蹤
- **離線可用**: PWA 技術支援離線瀏覽與管理
- **快速收藏**: QR 掃描一鍵收藏名片
- **智慧管理**: 標籤分類與全文搜尋功能

### 成功指標 (KPIs)
- PWA 安裝率 > 30%
- 平均收藏名片數 > 10 張
- 搜尋功能使用率 > 60%
- 離線可用率 > 95%
- **NFC 收藏轉換率 > 50%** (新增)
- **格式解析成功率 > 95%** (新增)
- **PWA 部署成功率 > 98%** (新增)

## 2. Functional Requirements

### **FR-007: NFC 一鍵收藏 (新增)**
**User Story**: As a 已安裝 PWA 的使用者, I want 透過 NFC 讀取名片後立即收藏, so that 無需額外步驟即可管理名片

**Acceptance Criteria**:
- Given 使用者透過 NFC 開啟名片頁面
- When 點擊「收藏此名片」按鈕
- Then 系統自動檢測是否已收藏
- And 若未收藏則加入收藏並顯示成功訊息
- And 若已收藏則提供更新/覆蓋選項
- And 提供查看收藏或繼續掃描的後續操作

**Priority**: P1 (核心體驗)
**Dependencies**: PWA Storage, Collection Manager

### **FR-008: 多格式名片支援 (新增)**
**User Story**: As a 使用者, I want 系統支援各種名片格式, so that 無論來源都能正確解析

**Acceptance Criteria**:
- Given 使用者掃描或輸入名片資料
- When 資料為 vCard 3.0/4.0 格式
- Then 系統能正確解析並轉換為內部格式
- And 支援舊版 JSON 格式向下相容
- And 提供格式解析錯誤的友善提示
- And 支援部分欄位缺失的容錯處理

**Priority**: P2 (相容性)
**Dependencies**: Format Parser, Security Validator

### **FR-009: PWA 部署修復 (新增)**
**User Story**: As a GitHub Pages 部署者, I want PWA 在子路徑部署時正常運作, so that 使用者能正常安裝和使用

**Acceptance Criteria**:
- Given PWA 部署在 GitHub Pages 子路徑
- When 使用者訪問應用程式
- Then manifest.json 路徑配置正確
- And Service Worker 快取策略有效
- And PWA 安裝流程順暢運作
- And 離線功能完全可用

**Priority**: P0 (阻斷問題)
**Dependencies**: PWA Config, Service Worker

### FR-001: 名片收藏功能
**User Story**: As a 商務人士, I want 掃描他人名片 QR 碼, so that 快速收藏到我的名片簿中

**Acceptance Criteria**:
- Given 使用者開啟收藏頁面
- When 點擊掃描按鈕並掃描有效的名片 QR 碼
- Then 系統自動解析名片資料並加入收藏
- And 顯示收藏成功訊息
- And 更新收藏統計數據

**Priority**: P0 (核心功能)
**Dependencies**: QR 掃描模組、資料解析邏輯

### FR-002: 收藏列表管理
**User Story**: As a 使用者, I want 瀏覽我的名片收藏, so that 快速找到需要的聯絡人

**Acceptance Criteria**:
- Given 使用者有收藏的名片
- When 開啟收藏頁面
- Then 顯示所有收藏名片的列表
- And 每張名片顯示姓名、職稱、公司、收藏時間
- And 支援點擊查看完整名片資訊

**Priority**: P0
**Dependencies**: IndexedDB 儲存、UI 渲染邏輯

### FR-003: 搜尋與篩選
**User Story**: As a 使用者, I want 搜尋特定名片, so that 在大量收藏中快速定位

**Acceptance Criteria**:
- Given 使用者在收藏頁面
- When 在搜尋框輸入關鍵字
- Then 即時篩選顯示匹配的名片
- And 支援按姓名、公司、職稱、標籤搜尋
- And 支援按來源 (QR/NFC/手動) 篩選
- And 支援按時間排序 (最新/最舊/最常瀏覽)

**Priority**: P1
**Dependencies**: 搜尋演算法、索引設計

### FR-004: 標籤分類系統
**User Story**: As a 使用者, I want 為名片添加標籤, so that 更好地組織和分類聯絡人

**Acceptance Criteria**:
- Given 使用者查看名片詳情
- When 點擊編輯標籤功能
- Then 可以添加、修改、刪除標籤
- And 支援標籤自動完成建議
- And 支援按標籤篩選名片列表

**Priority**: P1
**Dependencies**: 標籤管理 UI、資料結構設計

### FR-005: 離線 PWA 功能
**User Story**: As a 使用者, I want 在無網路環境下使用收藏功能, so that 不受網路限制

**Acceptance Criteria**:
- Given 使用者已安裝 PWA 應用
- When 在離線環境下開啟應用
- Then 可以正常瀏覽已收藏的名片
- And 可以搜尋和篩選本地名片
- And 顯示離線狀態指示

**Priority**: P1
**Dependencies**: Service Worker、快取策略

## 3. Non-Functional Requirements

### Secure by Default 清單
- **資料加密**: 敏感資料本地加密儲存
- **輸入驗證**: 所有 QR 碼資料格式驗證
- **XSS 防護**: DOM 操作安全處理
- **權限最小化**: 僅請求必要的相機權限
- **資料隔離**: IndexedDB 同源政策保護

### Cognitive Load-Friendly 清單
- **資訊分組**: 名片按類別和標籤組織
- **預設值**: 合理的排序和篩選預設
- **錯誤預防**: 重複收藏提醒與確認
- **一致性**: 與現有名片系統 UI 風格統一
- **回饋機制**: 操作結果即時反饋

### 效能需求
- **載入時間**: 首次載入 < 3 秒
- **操作回應**: 搜尋結果 < 500ms
- **儲存容量**: 支援 1000+ 名片收藏
- **記憶體使用**: 瀏覽器記憶體 < 50MB

### 相容性需求
- **瀏覽器**: Chrome 80+, Safari 13+, Firefox 75+
- **行動裝置**: iOS 13+, Android 8+
- **PWA 支援**: 支援安裝到桌面
- **離線功能**: Service Worker 支援

## 4. Technical Solution (High-level)

### 架構概述與安全考量
- **純前端架構**: 無後端依賴，資料完全本地化
- **PWA 技術棧**: Service Worker + Web App Manifest
- **儲存方案**: IndexedDB 主儲存 + LocalStorage 備援
- **安全設計**: 同源政策 + 輸入驗證 + XSS 防護

### 技術選型與取捨
- **QR 掃描**: QuaggaJS (輕量級，相容性佳)
- **資料庫**: IndexedDB (支援複雜查詢)
- **UI 框架**: 純 JavaScript (維持現有架構)
- **快取策略**: 網路優先 + 快取備援

### API 設計概要
```javascript
// 核心 API 介面
PWAStorage: init, addCard, getAllCards, searchCards, getStats
CollectionManager: loadCards, addCardFromQR, filterCards, renderCards
QRScanner: startScan, stopScan, parseResult
```

## 5. User Experience Design

### 使用者旅程圖
1. **發現階段**: 從現有名片頁面發現收藏功能
2. **安裝階段**: PWA 安裝提示與引導
3. **首次使用**: 掃描第一張名片並收藏
4. **日常使用**: 瀏覽、搜尋、管理收藏
5. **進階使用**: 標籤分類、批次操作

### 關鍵互動流程
- **掃描收藏**: 一鍵掃描 → 自動解析 → 確認收藏
- **快速搜尋**: 輸入關鍵字 → 即時篩選 → 查看結果
- **標籤管理**: 選擇名片 → 編輯標籤 → 儲存分類

### UI 原則
- **高齡友善**: 大字體、高對比、清晰間距
- **一致性**: 與現有名片系統風格統一
- **回饋性**: 操作狀態與結果即時顯示
- **容錯性**: 錯誤預防與友善錯誤訊息

## 6. Implementation Plan

### 階段里程碑與預估時程
- **Phase A**: 立即修復 (1-2 小時) - PWA 圖示、基本功能測試
- **Phase B**: 核心功能 (2-3 小時) - 手動新增、列表顯示、搜尋
- **Phase C**: QR 整合 (1-2 小時) - 掃描功能、相機權限
- **Phase D**: 優化完善 (1 小時) - UI 改善、效能優化

### 測試策略與驗收流程
- **單元測試**: 核心函數邏輯驗證
- **整合測試**: 模組間協作測試
- **使用者測試**: 實際場景操作驗證
- **效能測試**: 載入時間與回應速度

### 風險清單與緩解策略
- **技術風險**: IndexedDB 相容性 → LocalStorage 備援
- **使用者風險**: 學習成本 → 引導教學
- **效能風險**: 大量資料載入 → 虛擬滾動
- **安全風險**: XSS 攻擊 → 輸入驗證與淨化

### 資源估算
- **開發時間**: 5-8 小時
- **測試時間**: 2-3 小時
- **文件撰寫**: 1-2 小時
- **部署配置**: 0.5 小時

---

**對應文件**:
- design.md: 技術設計規格
- tasks.md: 開發任務分解