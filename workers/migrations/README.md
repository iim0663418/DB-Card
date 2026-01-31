# Database Migration 清單

## 完整 Migration 列表

| 編號 | 文件名 | 用途 | 日期 |
|------|--------|------|------|
| 0001 | initial_schema.sql | 初始資料庫架構（cards, audit_logs, read_sessions） | 2026-01-18 |
| 0002 | security_events.sql | 安全事件記錄表 | 2026-01-18 |
| 0003 | blocked_ips.sql | IP 封鎖管理表 | 2026-01-18 |
| 0004 | uuid_bindings_v2.sql | UUID 綁定表（支援 revoke/restore） | 2026-01-19 |
| 0005 | update_type_constraint.sql | 更新 card type 約束 | 2026-01-19 |
| 0006 | sync_card_types.sql | 同步 card types | 2026-01-19 |
| 0007 | remove_redundant_columns.sql | 移除冗餘欄位 | 2026-01-19 |
| 0008 | deleted_cards_audit.sql | 刪除名片審計表 | 2026-01-19 |
| 0009 | revocation_rate_limits.sql | 撤銷速率限制表 | 2026-01-20 |
| 0010 | session_budget.sql | Session 預算管理 | 2026-01-20 |
| 0011 | optimize_cleanup_query.sql | 優化清理查詢索引 | 2026-01-20 |
| 0012 | log_rotation_indexes.sql | 日誌輪替索引 | 2026-01-20 |
| 0013 | admin_passkey_support.sql | 管理員 Passkey 支援 | 2026-01-22 |
| 0014 | physical_card_twin.sql | 實體名片孿生（assets, asset_versions, twin_status） | 2026-01-28 |
| 0015 | fix_assets_foreign_key.sql | 修正 assets 外鍵引用（cards → uuid_bindings） | 2026-01-28 |
| 0016 | add_actor_to_audit_logs.sql | 添加 actor_type 和 actor_id 到 audit_logs | 2026-01-28 |

## Migration 0014: Physical Card Twin Support

### 新增表格

#### 1. assets
存儲實體名片圖片元數據

```sql
CREATE TABLE assets (
  asset_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('twin_front', 'twin_back', 'avatar')),
  current_version INTEGER NOT NULL DEFAULT 1,
  r2_key_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'stale', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);
```

**索引**:
- `idx_assets_card_uuid` - 按名片查詢
- `idx_assets_status` - 按狀態查詢

#### 2. asset_versions
追蹤圖片版本歷史

```sql
CREATE TABLE asset_versions (
  asset_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  size_original INTEGER,
  size_detail INTEGER,
  size_thumb INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  soft_deleted_at TIMESTAMP,
  PRIMARY KEY (asset_id, version),
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);
```

**索引**:
- `idx_asset_versions_soft_deleted` - 軟刪除清理

#### 3. twin_status
管理實體孿生功能狀態

```sql
CREATE TABLE twin_status (
  card_uuid TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'ready', 'stale', 'error')),
  last_rebuild_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);
```

**索引**:
- `idx_twin_status_enabled` - 已啟用的孿生

## Migration 0015: Fix Assets Foreign Key

### 問題
Migration 0014 中 `assets` 和 `twin_status` 的外鍵引用了 `cards(uuid)`，但實際上 UUID 存儲在 `uuid_bindings` 表中，導致插入時出現 foreign key mismatch 錯誤。

### 修正
重建表格，將外鍵改為引用 `uuid_bindings(uuid)`：

```sql
-- assets 表
FOREIGN KEY (card_uuid) REFERENCES uuid_bindings(uuid) ON DELETE CASCADE

-- twin_status 表
FOREIGN KEY (card_uuid) REFERENCES uuid_bindings(uuid) ON DELETE CASCADE
```

### 執行結果
- ✅ 11 queries executed
- ✅ 939 rows read, 52 rows written
- ✅ Database size: 0.79 MB
- ✅ 已在 Staging 環境執行

## 部署狀態

### Staging
- ✅ 所有 migrations (0001-0015) 已執行
- ✅ Database ID: d31b5e42-d8bf-4044-9744-4aff5669de4b
- ✅ 最後更新: 2026-01-28 14:30

### Production
- ⏳ 待部署 (0014-0015)

## 注意事項

1. **Migration 0014 錯誤**: 原始版本有外鍵錯誤，已由 0015 修正
2. **執行順序**: 必須按照編號順序執行
3. **Production 部署**: 部署前請先在 Staging 測試
4. **備份**: 執行 migration 前建議備份資料庫

## 執行命令

```bash
# Staging
npx wrangler d1 execute DB --remote --file=./migrations/0014_physical_card_twin.sql
npx wrangler d1 execute DB --remote --file=./migrations/0015_fix_assets_foreign_key.sql

# Production
npx wrangler d1 execute DB --remote --env production --file=./migrations/0014_physical_card_twin.sql
npx wrangler d1 execute DB --remote --env production --file=./migrations/0015_fix_assets_foreign_key.sql
```

---

**最後更新**: 2026-01-28 14:31  
**維護者**: System Architect
