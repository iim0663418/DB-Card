# BDD Spec: 實體名片孿生 - Migration 0013

## Feature: 資料庫 Schema 擴充支援實體孿生

作為系統管理員  
我需要擴充資料庫 Schema  
以便儲存實體名片資產與孿生狀態

---

## Scenario 1: 創建資產主表 (assets)

**Given** 資料庫已執行 Migration 0012  
**When** 執行 Migration 0013  
**Then** 應創建 `assets` 表，包含以下欄位：
- `asset_id` TEXT PRIMARY KEY
- `card_uuid` TEXT NOT NULL (外鍵至 cards)
- `asset_type` TEXT NOT NULL (限制: twin_front, twin_back, avatar)
- `current_version` INTEGER NOT NULL DEFAULT 1
- `r2_key_prefix` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT 'ready' (限制: ready, stale, error)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**And** 應創建索引 `idx_assets_card_uuid` ON assets(card_uuid)  
**And** 應創建索引 `idx_assets_status` ON assets(status)

---

## Scenario 2: 創建資產版本表 (asset_versions)

**Given** `assets` 表已創建  
**When** 執行 Migration 0013  
**Then** 應創建 `asset_versions` 表，包含以下欄位：
- `asset_id` TEXT NOT NULL (外鍵至 assets)
- `version` INTEGER NOT NULL
- `size_original` INTEGER
- `size_detail` INTEGER
- `size_thumb` INTEGER
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `soft_deleted_at` TIMESTAMP
- PRIMARY KEY (asset_id, version)

**And** 應創建索引 `idx_asset_versions_soft_deleted` ON asset_versions(soft_deleted_at) WHERE soft_deleted_at IS NOT NULL

---

## Scenario 3: 創建孿生狀態表 (twin_status)

**Given** `assets` 表已創建  
**When** 執行 Migration 0013  
**Then** 應創建 `twin_status` 表，包含以下欄位：
- `card_uuid` TEXT PRIMARY KEY (外鍵至 cards)
- `enabled` BOOLEAN DEFAULT FALSE
- `status` TEXT NOT NULL DEFAULT 'disabled' (限制: disabled, ready, stale, error)
- `last_rebuild_at` TIMESTAMP
- `error_message` TEXT

**And** 應創建索引 `idx_twin_status_enabled` ON twin_status(enabled) WHERE enabled = TRUE

---

## Scenario 4: 外鍵約束驗證

**Given** Migration 0013 已執行  
**When** 刪除 cards 表中的一筆記錄  
**Then** 應自動刪除 assets 表中對應的記錄 (CASCADE)  
**And** 應自動刪除 asset_versions 表中對應的記錄 (CASCADE)  
**And** 應自動刪除 twin_status 表中對應的記錄 (CASCADE)

---

## Scenario 5: CHECK 約束驗證

**Given** Migration 0013 已執行  
**When** 嘗試插入 asset_type = 'invalid_type'  
**Then** 應拋出 CHECK constraint 錯誤

**When** 嘗試插入 status = 'invalid_status' 至 assets 表  
**Then** 應拋出 CHECK constraint 錯誤

**When** 嘗試插入 status = 'invalid_status' 至 twin_status 表  
**Then** 應拋出 CHECK constraint 錯誤

---

## Scenario 6: 冪等性驗證

**Given** Migration 0013 已執行一次  
**When** 再次執行 Migration 0013  
**Then** 應成功執行（不拋出錯誤）  
**And** 表結構應保持不變  
**And** 現有資料應保持不變

---

## Acceptance Criteria

### 表結構
- [x] `assets` 表包含 8 個欄位
- [x] `asset_versions` 表包含 6 個欄位
- [x] `twin_status` 表包含 5 個欄位

### 索引
- [x] 3 個索引在 `assets` 表（主鍵 + 2 個索引）
- [x] 2 個索引在 `asset_versions` 表（主鍵 + 1 個索引）
- [x] 2 個索引在 `twin_status` 表（主鍵 + 1 個索引）

### 約束
- [x] 3 個外鍵約束（CASCADE DELETE）
- [x] 2 個 CHECK 約束（asset_type, status）
- [x] 1 個 CHECK 約束（twin_status.status）

### 冪等性
- [x] 可重複執行不報錯
- [x] IF NOT EXISTS 保護所有 CREATE 語句

---

## Technical Notes

### R2 Key 格式
```
assets/{card_uuid}/{asset_type}/{asset_id}/v{version}/{variant}.webp
```

### 狀態機
```
disabled → ready → stale → error
```

### 版本控制
- 新上傳 → `current_version++`
- 舊版本 → 標記 `soft_deleted_at`
- Cron 清理 → 刪除超過 30 天的舊版本
