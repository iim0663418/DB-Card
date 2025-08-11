# DB-Card PWA 用戶可控加密金鑰系統需求文件

---
version: "v3.2.2-user-controlled-encryption"
rev_id: "REQ-UCE-001"
last_updated: "2025-08-09"
owners: ["prd-writer", "security-engineer", "technical-architect"]
reuse_policy: "reuse-then-extend-then-build"
migration_policy: 
  compatibility_level: "compatible"
  dual_run: false
  rollback: true
  data_migration: true
  cutover_window: "immediate"
---

## 1. Product Overview

### 背景
目前 PWA 系統使用固定的 `'default-password'` 進行 PBKDF2 金鑰衍生，導致使用者無法控制加密金鑰，當資料被加密後無法解密。此問題嚴重影響資料可用性和使用者體驗。

### 目標使用者
- **主要使用者**: PWA 數位名片系統的所有使用者
- **次要使用者**: 系統管理員和開發維護人員

### 價值主張
- **資料主控權**: 使用者完全控制自己的加密金鑰
- **資料可恢復性**: 透過記憶的密碼短語隨時恢復資料存取
- **跨設備一致性**: 相同密碼短語在任何設備上都能解密資料
- **使用者友善**: 三短語組合易於記憶且安全性足夠

### 商業目標與 KPI
- **金鑰恢復成功率**: ≥95% (目標值)
- **加密初始化時間**: <2 秒 (從密碼短語輸入到系統就緒)
- **使用者滿意度**: ≥4.5/5.0 (加密系統易用性評分)
- **資料遺失率**: <0.1% (因金鑰問題導致的資料無法存取)

## 2. Functional Requirements

### R-1: 用戶可控密碼短語設定 (P0)
**User Story**: As a PWA user I want to set my own passphrase so that I can control my encryption keys and recover my data

**Acceptance Criteria**:
- **Given** 使用者首次開啟 PWA **When** 系統檢測到無密碼短語設定 **Then** 顯示三短語設定對話框
- **Given** 使用者輸入三個短語 **When** 短語通過驗證 **Then** 生成確定性加密金鑰
- **Given** 使用者重新開啟 PWA **When** 系統處於鎖定狀態 **Then** 顯示三短語解鎖對話框
- **Given** 使用者設定密碼短語 **When** 短語組合熵值不足 **Then** 提示增強安全性建議

### R-2: 金鑰可恢復性機制 (P0)
**User Story**: As a PWA user I want my encryption keys to be recoverable so that I don't lose access to my encrypted data

**Acceptance Criteria**:
- **Given** 使用者在新設備上 **When** 輸入相同三短語組合 **Then** 能解密所有既有資料
- **Given** 加密金鑰損壞 **When** 使用者提供正確密碼短語 **Then** 系統重新生成相同金鑰
- **Given** 金鑰衍生失敗 **When** 觸發備用機制 **Then** 提示使用者透過密碼短語恢復
- **Given** 系統偵測到金鑰不一致 **When** 自動驗證機制啟動 **Then** 引導使用者進行金鑰恢復

### R-3: 金鑰失效檢測與恢復 (P1)
**User Story**: As a PWA user I want to detect when my keys are invalid so that I can restore them before losing data access

**Acceptance Criteria**:
- **Given** 存在加密資料 **When** 解密操作失敗 **Then** 顯示金鑰恢復提示
- **Given** 金鑰驗證檢查 **When** 發現金鑰損壞 **Then** 觸發自動恢復流程
- **Given** 系統健康檢查 **When** 偵測到加密不一致 **Then** 警告使用者並提供恢復選項
- **Given** 批量資料操作 **When** 部分資料解密失敗 **Then** 記錄失敗項目並提供批量恢復

## 3. Non-Functional Requirements

### 安全性需求 (Secure by Default)
- **確定性金鑰生成**: 加密金鑰必須從使用者密碼短語確定性生成，確保相同密碼短語始終產生相同金鑰
- **密碼短語熵值**: 三短語組合必須提供最少 60 位元熵值，抵禦暴力破解攻擊
- **金鑰不可匯出**: 所有衍生金鑰設為不可匯出，防止金鑰洩露
- **安全儲存**: 僅儲存密碼短語驗證雜湊，不儲存明文密碼短語
- **時間攻擊防護**: PBKDF2 迭代次數固定，防止時間分析攻擊

### 認知負荷友善 (Cognitive Load-Friendly)
- **三短語引導**: 使用形容詞+名詞+動詞的結構化引導
- **即時預覽**: 顯示密碼短語組合預覽，增強使用者信心
- **建議詞庫**: 提供內建詞庫和一鍵重新生成功能
- **錯誤提示**: 清晰的錯誤訊息和恢復指引
- **進度指示**: 金鑰生成和驗證過程的視覺化進度
- **統一雙語管理**: 整合 UnifiedLanguageManager 提供一致的多語言體驗
- **moda 設計系統**: 遵循數位發展部設計系統，確保視覺一致性
- **高齡友善設計**: 使用高齡友善字體系統和適當的色彩對比

### 效能需求
- **初始化時間**: 從密碼短語輸入到加密系統就緒 <2 秒
- **金鑰衍生效能**: PBKDF2 運算不阻塞 UI 超過 500ms
- **記憶體使用**: 金鑰管理額外記憶體開銷 <5MB
- **批量處理**: 支援批量資料重新加密，每批次 ≤50 筆

### 相容性需求
- **向下相容**: 支援現有 `'default-password'` 加密資料的解密
- **漸進遷移**: 支援資料逐步從舊系統遷移到新系統
- **瀏覽器支援**: 支援所有具備 Web Crypto API 的現代瀏覽器
- **離線運作**: 完全離線環境下的金鑰生成和驗證

## 4. Technical Constraints & Assumptions

### 平台限制
- **Web Crypto API**: 依賴瀏覽器原生 Web Crypto API 進行 PBKDF2 和 AES-GCM 運算
- **IndexedDB**: 使用 IndexedDB 作為本地儲存，受瀏覽器儲存配額限制
- **記憶體限制**: 瀏覽器環境記憶體限制，需要優化金鑰快取策略

### 安全假設
- **使用者設備安全**: 假設使用者設備未被惡意軟體感染
- **瀏覽器安全**: 假設瀏覽器 Web Crypto API 實作安全可靠
- **密碼短語保密**: 假設使用者能妥善保管密碼短語不被洩露

### 外部依賴
- **現有 PWA 架構**: 依賴現有的 PWACardStorage 類別和相關模組
- **安全模組**: 整合現有的 SecureLogger 和 XSSProtection 模組
- **UI 框架**: 使用現有的 DOM 操作和事件處理機制
- **統一語言管理器**: 依賴 lib/unified-language-manager 進行多語言支援
- **moda 設計系統**: 依賴 pwa-card-storage/assets/styles/moda-design-system.css
- **高齡友善字體**: 依賴 Noto Sans TC 和 Noto Sans 字體系統

## 5. Architecture Reuse Plan

### 現有資產盤點與複用策略

#### 高度複用資產
| 資產名稱 | 位置 | 複用方式 | 擴充點 |
|---------|------|----------|--------|
| **PBKDF2 金鑰衍生** | `storage.js:deriveKeyFromPBKDF2` | 直接擴充 | 將固定密碼改為使用者密碼短語參數 |
| **加密初始化流程** | `storage.js:initializeEncryption` | 重構擴充 | 新增使用者密碼短語檢查和設定流程 |
| **安全日誌系統** | `storage.js:safeLog` | 直接複用 | 新增金鑰管理相關事件記錄 |
| **統一語言管理器** | `lib/unified-language-manager/index.js` | 直接複用 | 整合多語言支援到加密介面 |
| **moda 設計系統** | `assets/styles/moda-design-system.css` | 直接複用 | 套用官方設計系統樣式 |

#### 中度複用資產
| 資產名稱 | 位置 | 複用方式 | 修改需求 |
|---------|------|----------|----------|
| **欄位級加密** | `storage.js:generateFieldEncryptionKeys` | 修改複用 | 移除時間戳依賴，改為確定性生成 |
| **資料加解密** | `storage.js:encryptCardData/decryptCardData` | 部分複用 | 整合新的金鑰管理機制 |
| **健康檢查** | `storage.js:performHealthCheck` | 擴充複用 | 新增金鑰一致性檢查 |

#### 新建模組
| 模組名稱 | 理由 | 預估工作量 |
|---------|------|-----------|
| **UserKeyManager** | 現有系統無使用者金鑰管理 | 2-3 小時 |
| **BilingualEncryptionSetupUI** | 需要支援雙語的三短語設定介面 | 2-3 小時 |
| **KeyRecoveryManager** | 金鑰失效檢測和恢復邏輯 | 1-2 小時 |
| **EncryptionLanguageIntegration** | 整合語言管理器到加密系統 | 1 小時 |

### 擴充點設計
```javascript
// 現有方法擴充
async deriveKeyFromPBKDF2(userPassphrase, salt) // 新增 userPassphrase 參數
async initializeEncryption() // 整合 UserKeyManager
async generateFieldEncryptionKeys() // 移除時間戳，使用確定性種子

// 新增方法
async setUserPassphrase(passphrase)
async verifyUserPassphrase(passphrase) 
async detectKeyFailure()
async recoverFromPassphrase(passphrase)
```

### Migration & Deprecation 策略

#### 相容性等級: Compatible
- **現有功能**: 100% 保持現有功能正常運作
- **資料格式**: 向下相容現有加密資料格式
- **API 介面**: 不破壞現有 API 呼叫方式

#### 遷移階段
1. **Phase 1**: 新增使用者金鑰管理，與現有系統並存
2. **Phase 2**: 引導使用者設定密碼短語，逐步遷移資料
3. **Phase 3**: 完全切換到使用者控制金鑰，保留舊系統相容性

#### 回滾策略
- **即時回滾**: 可立即回到 `'default-password'` 系統
- **資料保護**: 回滾過程中不會遺失任何資料
- **使用者通知**: 回滾時明確告知使用者影響範圍

## 6. Security & Privacy Requirements

### 威脅模型
- **T1**: 密碼短語暴力破解 → 60位元熵值 + PBKDF2 100,000次迭代防護
- **T2**: 金鑰洩露攻擊 → 金鑰不可匯出 + 記憶體清理
- **T3**: 時間分析攻擊 → 固定迭代次數 + 常數時間比較
- **T4**: 本地儲存攻擊 → 僅儲存驗證雜湊，不儲存明文

### 資料分類與保護
- **高敏感**: 使用者密碼短語 → 僅記憶體暫存，不持久化
- **中敏感**: 加密金鑰 → 不可匯出，會話結束後清理
- **低敏感**: 驗證雜湊 → 可持久化，用於密碼短語驗證

### 審計需求
- **金鑰生成事件**: 記錄金鑰生成時間和成功狀態
- **解密失敗事件**: 記錄解密失敗次數和模式
- **恢復操作事件**: 記錄金鑰恢復操作和結果
- **安全異常事件**: 記錄所有安全相關異常和處理結果

## 7. Measurement & Validation Plan

### KPI 量測方法
| KPI | 量測方式 | 資料來源 | 驗收標準 |
|-----|----------|----------|----------|
| **金鑰恢復成功率** | 成功恢復次數/總恢復次數 | PWA 本地統計 | ≥95% |
| **加密初始化時間** | Performance.now() 計時 | 瀏覽器效能 API | <2秒 |
| **使用者滿意度** | 使用者回饋評分 | 應用內評分系統 | ≥4.5/5.0 |
| **資料遺失率** | 無法解密資料/總資料量 | 錯誤日誌統計 | <0.1% |

### 驗收測試對應表
| 需求 ID | 測試場景 | 預期結果 | 驗證方法 |
|---------|----------|----------|----------|
| R-1 | 首次設定三短語 | 成功生成金鑰並加密資料 | 自動化測試 |
| R-1 | 重新開啟應用解鎖 | 正確密碼短語解鎖成功 | 自動化測試 |
| R-2 | 跨設備資料恢復 | 相同密碼短語解密成功 | 手動測試 |
| R-2 | 金鑰損壞恢復 | 密碼短語重新生成相同金鑰 | 自動化測試 |
| R-3 | 解密失敗檢測 | 自動顯示恢復提示 | 自動化測試 |
| R-3 | 批量資料恢復 | 成功恢復所有可恢復資料 | 整合測試 |

### 效能基準測試
- **金鑰生成效能**: 在不同設備上測試 PBKDF2 運算時間
- **記憶體使用監控**: 監控金鑰管理模組的記憶體佔用
- **並發處理能力**: 測試同時處理多個加解密操作的效能
- **大量資料處理**: 測試批量重新加密的效能表現

## 8. Implementation Roadmap

### Phase 1: 核心金鑰管理 (1-2 天)
- 實作 `UserKeyManager` 類別
- 修改 `deriveKeyFromPBKDF2` 支援使用者密碼短語
- 整合到現有 `initializeEncryption` 流程

### Phase 2: 雙語使用者介面 (1-2 天)
- 實作 `BilingualEncryptionSetupUI` 支援中英文的三短語設定介面
- 整合 UnifiedLanguageManager 提供動態語言切換
- 套用 moda 設計系統樣式和高齡友善設計
- 實作解鎖對話框和錯誤處理的雙語版本
- 整合到主應用程式初始化流程

### Phase 3: 金鑰恢復機制 (1 天)
- 實作金鑰失效檢測邏輯
- 實作自動恢復和手動恢復流程
- 整合到健康檢查系統

### Phase 4: 測試與優化 (1 天)
- 單元測試和整合測試
- 效能優化和記憶體管理
- 使用者體驗優化

## 9. Risk Assessment & Mitigation

### 高風險項目
| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| **使用者忘記密碼短語** | 高 | 中 | 提供密碼短語提示功能，建議記錄在安全地方 |
| **金鑰生成效能問題** | 中 | 低 | 使用 Web Worker 避免阻塞 UI，提供進度指示 |
| **瀏覽器相容性問題** | 中 | 低 | 全面測試主流瀏覽器，提供降級方案 |

### 中風險項目
| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| **資料遷移失敗** | 中 | 中 | 實作完整的回滾機制，分批遷移降低風險 |
| **使用者體驗複雜化** | 中 | 中 | 簡化設定流程，提供清晰的引導和說明 |

## 10. Appendix

### 名詞表
- **PBKDF2**: Password-Based Key Derivation Function 2，基於密碼的金鑰衍生函數
- **確定性生成**: 相同輸入始終產生相同輸出的特性
- **熵值**: 密碼強度的量化指標，以位元為單位
- **三短語**: 由三個詞語組成的密碼短語，結構為形容詞+名詞+動詞
- **UnifiedLanguageManager**: 統一語言管理器，提供多語言支援和動態切換
- **moda 設計系統**: 數位發展部官方設計系統，定義色彩、字體、間距等視覺規範
- **高齡友善設計**: 針對高齡使用者優化的介面設計，包含大字體、高對比等特性

### 技術決策記錄 (ADR)
- **ADR-001**: 選擇三短語而非傳統密碼 → 平衡安全性與易用性
- **ADR-002**: 使用 PBKDF2 而非 Argon2 → 瀏覽器原生支援，無需額外函式庫
- **ADR-003**: 確定性金鑰生成 → 確保跨設備資料恢復能力
- **ADR-004**: 即時遷移而非排程遷移 → 簡化部署，降低維護複雜度
- **ADR-005**: 整合 UnifiedLanguageManager → 確保多語言體驗一致性
- **ADR-006**: 採用 moda 設計系統 → 符合政府數位服務設計標準
- **ADR-007**: 實作高齡友善設計 → 提升無障礙使用體驗

### 參考資料
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST SP 800-132: PBKDF2 Guidelines](https://csrc.nist.gov/publications/detail/sp/800-132/final)