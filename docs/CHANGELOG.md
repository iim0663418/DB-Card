# Changelog

All notable changes to the DB-Card project will be documented in this file.

## [v3.1.0] - 2025-08-04 - PWA版本管理與重複識別功能

### Added
- **ContentFingerprintGenerator**: SHA-256指紋生成與雙語標準化處理
  - 支援 `name + email` 組合生成唯一指紋
  - 自動處理雙語格式標準化 (`"蔡孟諭~Tsai Meng-Yu"` 和 `{zh: "蔡孟諭", en: "Tsai Meng-Yu"}`)
  - 備用指紋生成算法確保系統穩定性
- **DuplicateDetector**: 智慧重複檢測與處理邏輯
  - 基於指紋的精確重複檢測
  - 支援跳過、覆蓋、建立新版本三種處理模式
  - 批量重複檢測功能
- **VersionManager**: 完整版本歷史管理功能
  - 語義化版本號系統 (1.0 → 1.1 → 1.2)
  - 版本比較和差異分析
  - 版本還原和匯出功能
  - 自動清理舊版本 (保留最新10個版本)
- **PWACardStorage擴展**: 資料庫架構升級至v3
  - 新增 `fingerprint` 欄位和索引
  - 擴展版本快照功能
  - 指紋查詢API (`findCardsByFingerprint`)

### Security
- 整合 SecurityAuthHandler 授權檢查機制
- 使用 Web Crypto API SHA-256 加密算法
- 安全的錯誤處理和日誌記錄 (不洩露PII資訊)
- 輸入驗證和清理機制

### Performance
- 指紋索引優化查詢效能 (≤ 200ms per card)
- 批量處理支援 (≥ 50 cards/second)
- 版本歷史載入優化 (≤ 500ms for 10 versions)
- 記憶體使用優化和自動清理機制

### Technical
- 100% 向下相容性保證
- 自動資料結構升級機制
- 完全離線運作能力
- 事務性資料庫操作確保ACID特性

### Files Changed
- `pwa-card-storage/src/core/content-fingerprint-generator.js` (新增)
- `pwa-card-storage/src/core/duplicate-detector.js` (新增)
- `pwa-card-storage/src/core/version-manager.js` (新增)
- `pwa-card-storage/src/core/storage.js` (擴展)
- `docs/api/pwa-version-management.md` (新增)
- `docs/requirements.md` (更新)
- `docs/design.md` (更新)
- `docs/tasks.md` (更新)

### Impact
**Risk Level**: Medium
- 資料庫結構升級需要自動遷移
- 新功能需要使用者學習成本
- 效能影響需要持續監控

### Notes
- 基於實際使用資料分析 (`cards-export-2025-08-04T21-27-49.json`) 發現的重複名片問題
- 解決同一人(蔡孟諭)的3張名片被當作不同名片儲存的問題
- 版本號從固定"1.0"改為動態遞增機制
- 建立基於內容指紋的唯一識別機制

### Follow-ups
- 監控指紋生成效能和準確率
- 收集使用者對版本管理功能的回饋
- 評估是否需要UI改進以降低認知負荷

---

## [v3.0.4] - 2025-08 - 統合版本發布 (PWA v1.1.0)

### Added
- 🔄 離線 QR 碼生成：離線環境下自動生成包含完整聯絡資訊的 vCard QR 碼
- 🔧 PWA 技術統一：名片頁面與 PWA 系統使用相同的高解析度 QR 碼生成技術
- ⚡ 智慧備用機制：PWA 工具優先，原始方法備用，確保 100% 可靠性
- 🌐 功能統一：所有 9 個名片版面（機關版、個人版、雙語版、英文版）功能完全一致

### Impact
**Risk Level**: Low

---

## [v3.0.0] - 2025-08 - PWA 離線儲存完整旅程版

### Added
- 💾 IndexedDB 儲存，版本管理更智慧，自動備份重要名片變更
- 📤 離線 QR 碼生成，無需網路連線即可分享
- 🌟 PWA 介面與官網設計完全一致
- 📱 響應式設計優化，手機平板都有完美體驗
- 👥 高齡友善字體系統，長輩使用更輕鬆

### Impact
**Risk Level**: Medium

---

## [v2.1.1] - 2025-08 - PWA 功能統一版

### Added
- ✅ PWA 儲存功能統一：為所有 9 個名片介面補齊 PWA 離線儲存功能
- ✅ 功能一致性達成：確保機關版、個人版、雙語版、英文版具備相同功能

### Security
- ✅ 安全性增強：修復 Reverse Tabnabbing 漏洞，強化外部連結安全

### Impact
**Risk Level**: Low

---

## [v2.1.0] - 2025-07 - 手機號碼與 QR 碼本地化版

### Added
- ✅ 新增手機號碼欄位支援，完整支援雙電話聯絡方式
- ✅ QR 碼本地化：導入 qrcode.js 本地生成，取代外部 api.qrserver.com 依賴
- ✅ QR 碼下載功能：支援高解析度 QR 碼圖片下載，智慧檔名生成

### Security
- ✅ 安全性增強：移除 innerHTML 安全風險，使用安全 DOM 操作

### Impact
**Risk Level**: Low

---

## [v2.0.0] - 2025-07 - 國際雙語版

### Added
- ✅ 新增雙語版數位名片（中英文動態切換）
- ✅ 實作打字機效果問候語動畫
- ✅ 優化編碼格式，提升 40% 容量效率
- ✅ 新增雙語 vCard 生成功能
- ✅ 完善高齡友善設計，符合無障礙標準

### Impact
**Risk Level**: Medium

---

## [v1.0.0] - 2025-06 - 基礎版本

### Added
- ✅ 純前端 NFC 數位名片系統
- ✅ 隱私優先設計理念
- ✅ 支援機關版和個人版
- ✅ vCard 聯絡人檔案生成
- ✅ QR 碼分享功能

### Impact
**Risk Level**: Low

---

**Legend:**
- **Risk Level**: Low (無破壞性變更) | Medium (需要使用者適應) | High (重大架構變更)
- **Impact**: 對現有功能和使用者體驗的影響程度