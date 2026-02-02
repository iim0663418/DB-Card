# Staging 資料庫遷移記錄

**日期**: 2026-02-02  
**時間**: 20:08 CST  
**環境**: Staging  
**資料庫**: db-card-staging (d31b5e42-d8bf-4044-9744-4aff5669de4b)

---

## 📊 遷移狀態

### 已執行的遷移

| Migration | 檔案 | 狀態 | 執行日期 |
|-----------|------|------|---------|
| 0001 | initial_schema.sql | ✅ 已執行 | 2026-01-24 |
| 0002 | read_sessions.sql | ✅ 已執行 | 2026-01-24 |
| 0003 | add_card_type.sql | ✅ 已執行 | 2026-01-24 |
| 0004 | add_uuid_bindings.sql | ✅ 已執行 | 2026-01-24 |
| 0005 | add_audit_logs.sql | ✅ 已執行 | 2026-01-24 |
| 0006 | add_kek_rotation.sql | ✅ 已執行 | 2026-01-24 |
| 0007 | add_security_events.sql | ✅ 已執行 | 2026-01-24 |
| 0008 | add_physical_card_assets.sql | ✅ 已執行 | 2026-01-24 |
| 0009 | add_card_display_name.sql | ✅ 已執行 | 2026-01-24 |
| 0010 | add_passkey_credentials.sql | ✅ 已執行 | 2026-01-24 |
| 0011 | add_admin_sessions.sql | ✅ 已執行 | 2026-01-24 |
| 0012 | add_admin_email.sql | ✅ 已執行 | 2026-01-24 |
| 0013 | add_oauth_state.sql | ✅ 已執行 | 2026-01-24 |
| 0014 | add_oauth_nonce.sql | ✅ 已執行 | 2026-01-24 |
| 0015 | fix_assets_foreign_key.sql | ✅ 已執行 | 2026-01-31 |
| 0016 | add_actor_to_audit_logs.sql | ✅ 已執行 | 2026-01-31 |
| 0017 | email_allowlist_individual.sql | ✅ 已執行 | 2026-01-31 |
| **0018** | **consent_management.sql** | ✅ **已執行** | **2026-02-02** |
| **0019** | **update_privacy_policy_controller.sql** | ✅ **已執行** | **2026-02-02** |

---

## ✅ Migration 0018: Consent Management

**檔案**: `migrations/0018_consent_management.sql`  
**大小**: 9,098 bytes  
**執行日期**: 2026-02-02

### 建立的表格

#### 1. consent_records
```sql
CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consent_category TEXT NOT NULL,
  consent_status TEXT NOT NULL,
  consented_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  privacy_policy_url TEXT NOT NULL,
  withdrawn_at INTEGER,
  deletion_scheduled_at INTEGER,
  restored_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**索引**:
- `idx_consent_user_email` - 查詢使用者同意記錄
- `idx_consent_status` - 查詢同意狀態
- `idx_consent_version` - 查詢版本
- `idx_consent_deletion` - 查詢待刪除記錄

#### 2. privacy_policy_versions
```sql
CREATE TABLE privacy_policy_versions (
  version TEXT PRIMARY KEY,
  effective_date INTEGER NOT NULL,
  content_zh TEXT NOT NULL,
  content_en TEXT NOT NULL,
  summary_zh TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  purposes TEXT NOT NULL,
  changes_summary_zh TEXT,
  changes_summary_en TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
```

### 初始資料

**隱私政策 v1.0.0**:
- ✅ 中文完整內容（content_zh）
- ✅ 英文完整內容（content_en）
- ✅ 中文摘要（summary_zh）
- ✅ 英文摘要（summary_en）
- ✅ 蒐集目的：["069", "090", "135", "157"]
- ✅ 資料蒐集者：DB-Card 數位名片系統

---

## ✅ Migration 0019: Update Privacy Policy Controller

**檔案**: `migrations/0019_update_privacy_policy_controller.sql`  
**大小**: 5,431 bytes  
**執行日期**: 2026-02-02

### 變更內容

**更新隱私政策 v1.0.0**:
- 變更前：數位發展部（Ministry of Digital Affairs, MODA）
- 變更後：DB-Card 數位名片系統（DB-Card Digital Business Card System）

**原因**: 符合系統本身為資料蒐集者的設計

---

## 🔍 驗證結果

### 表格存在性
```bash
$ wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('consent_records', 'privacy_policy_versions')"

✅ consent_records - 存在
✅ privacy_policy_versions - 存在
```

### 隱私政策版本
```bash
$ wrangler d1 execute DB --remote --command "SELECT version, is_active FROM privacy_policy_versions"

✅ v1.0.0 - is_active: 1
```

### 資料庫大小
```
Before: 1,245,184 bytes
After:  1,282,048 bytes
Change: +36,864 bytes (+3%)
```

---

## 📋 遷移執行命令

### Migration 0018
```bash
cd /Users/shengfanwu/GitHub/DB-Card/workers
wrangler d1 execute DB --remote --file=./migrations/0018_consent_management.sql
```

**結果**:
- ✅ 2 tables created
- ✅ 4 indexes created
- ✅ 1 row inserted (privacy policy v1.0.0)
- ⏱️ Duration: 8.8ms

### Migration 0019
```bash
wrangler d1 execute DB --remote --file=./migrations/0019_update_privacy_policy_controller.sql
```

**結果**:
- ✅ 1 row updated
- ⏱️ Duration: < 10ms

---

## 🎯 功能驗證

### API 端點測試

#### 1. 取得隱私政策
```bash
curl https://db-card-staging.csw30454.workers.dev/api/privacy-policy/current
```

**結果**: ✅ 返回 v1.0.0 完整政策（中英文）

#### 2. 檢查同意狀態
```bash
curl https://db-card-staging.csw30454.workers.dev/api/consent/check
```

**結果**: ✅ 返回 401 (OAuth 保護正常)

---

## 📊 資料庫統計

### 表格數量
```
Total tables: 17
New tables: 2 (consent_records, privacy_policy_versions)
```

### 索引數量
```
New indexes: 4
- idx_consent_user_email
- idx_consent_status
- idx_consent_version
- idx_consent_deletion
```

### 資料行數
```
privacy_policy_versions: 1 row (v1.0.0)
consent_records: 0 rows (待使用者同意)
```

---

## 🔒 安全考量

### 資料保護
- ✅ IP 位址匿名化（僅保留前 3 段）
- ✅ Email 僅作為內部 ID
- ✅ 審計日誌完整記錄

### 資料保存
- ✅ 帳號存續期間 + 刪除後 90 天
- ✅ 撤回後 30 天緩衝期
- ✅ 審計日誌 90 天自動刪除

---

## 📚 相關文檔

- ✅ `migrations/0018_consent_management.sql` - 同意管理 schema
- ✅ `migrations/0019_update_privacy_policy_controller.sql` - 政策更新
- ✅ `docs/implementation/consent-management-plan.md` - 實作計畫
- ✅ `.specify/specs/consent-management.md` - BDD 規格

---

## 🎯 結論

### 完成項目
1. ✅ Migration 0018 執行成功
2. ✅ Migration 0019 執行成功
3. ✅ 表格建立完成
4. ✅ 索引建立完成
5. ✅ 初始資料插入完成
6. ✅ API 端點驗證通過

### 資料庫狀態
- ✅ 健康：正常
- ✅ 大小：1,282,048 bytes
- ✅ 表格：17 個
- ✅ 版本：最新

### 下一步
- 📝 Production 環境執行相同遷移
- 📝 監控同意記錄增長
- 📝 定期檢查待刪除記錄

---

**遷移狀態**: ✅ 完成  
**資料庫狀態**: ✅ 健康  
**功能驗證**: ✅ 通過  
**可使用**: ✅ 是
