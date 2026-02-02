# BDD Spec: Asset Cleanup Cron Job

## Feature: 軟刪除資產清理

作為系統  
我需要定期清理超過 30 天的軟刪除資產  
以便釋放 R2 儲存空間並維護資料庫整潔

---

## Scenario 1: 清理超過 30 天的軟刪除版本

**Given** 資料庫有以下 `asset_versions` 記錄：
```
| asset_id | version | soft_deleted_at      | r2_key                          |
|----------|---------|----------------------|---------------------------------|
| asset-1  | 1       | 2025-12-20 00:00:00  | assets/.../v1/1200.webp        |
| asset-1  | 2       | NULL                 | assets/.../v2/1200.webp        |
| asset-2  | 1       | 2026-01-27 00:00:00  | assets/.../v1/1200.webp        |
```
**And** 當前時間為 `2026-01-28 02:00:00`  
**When** Cron job 執行  
**Then** 應刪除 `asset-1` 的 v1（超過 30 天）  
**And** 應保留 `asset-1` 的 v2（當前版本）  
**And** 應保留 `asset-2` 的 v1（未超過 30 天）  
**And** 應從 R2 刪除 `assets/.../v1/1200.webp` 和 `assets/.../v1/256.webp`  
**And** 應從資料庫刪除對應的 `asset_versions` 記錄

---

## Scenario 2: 清理孤立的 assets 記錄

**Given** 資料庫有以下 `assets` 記錄：
```
| asset_id | card_uuid | current_version | status |
|----------|-----------|-----------------|--------|
| asset-1  | abc-123   | 2               | ready  |
| asset-2  | xyz-789   | 1               | ready  |
```
**And** `asset-2` 的所有版本都已被軟刪除並清理  
**When** Cron job 執行  
**Then** 應刪除 `asset-2` 的 `assets` 記錄（無有效版本）  
**And** 應保留 `asset-1` 的 `assets` 記錄（有有效版本）

---

## Scenario 3: 批次處理避免超時

**Given** 資料庫有 1000 筆超過 30 天的軟刪除記錄  
**When** Cron job 執行  
**Then** 應分批處理（每批 100 筆）  
**And** 每批之間應有短暫延遲（避免 R2 rate limit）  
**And** 應記錄處理進度到日誌

---

## Scenario 4: 錯誤處理與重試

**Given** R2 刪除操作失敗（網路錯誤）  
**When** Cron job 執行  
**Then** 應記錄錯誤到 `audit_logs`  
**And** 應繼續處理下一筆記錄（不中斷整個流程）  
**And** 失敗的記錄應保留 `soft_deleted_at`（下次重試）

---

## Scenario 5: Dry-run 模式（測試用）

**Given** 環境變數 `CLEANUP_DRY_RUN=true`  
**When** Cron job 執行  
**Then** 應列出將被刪除的記錄  
**And** 不應實際刪除任何資料  
**And** 應記錄 dry-run 結果到日誌

---

## Implementation Notes

### Cron Schedule
```toml
[triggers]
crons = ["0 3 * * *"]  # 每天 03:00 UTC 執行
```

### 清理邏輯
```typescript
async function cleanupSoftDeletedAssets(env: Env) {
  const RETENTION_DAYS = 30;
  const BATCH_SIZE = 100;
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  
  // 1. 查詢超過 30 天的軟刪除版本
  const versions = await env.DB.prepare(`
    SELECT asset_id, version, r2_key_prefix
    FROM asset_versions
    WHERE soft_deleted_at < ?
    ORDER BY soft_deleted_at ASC
    LIMIT ?
  `).bind(cutoffDate.toISOString(), BATCH_SIZE).all();
  
  // 2. 刪除 R2 檔案
  for (const v of versions.results) {
    await deleteR2Variants(env, v.r2_key_prefix, v.version);
  }
  
  // 3. 刪除資料庫記錄
  await env.DB.prepare(`
    DELETE FROM asset_versions
    WHERE soft_deleted_at < ?
  `).bind(cutoffDate.toISOString()).run();
  
  // 4. 清理孤立的 assets 記錄
  await env.DB.prepare(`
    DELETE FROM assets
    WHERE asset_id NOT IN (
      SELECT DISTINCT asset_id FROM asset_versions
    )
  `).run();
}
```

### R2 刪除
```typescript
async function deleteR2Variants(env: Env, keyPrefix: string, version: number) {
  const variants = ['1200.webp', '256.webp'];
  for (const variant of variants) {
    const key = `${keyPrefix}/v${version}/${variant}`;
    try {
      await env.PHYSICAL_CARDS.delete(key);
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error);
      // 記錄但不中斷
    }
  }
}
```

### 審計日誌
```typescript
await env.DB.prepare(`
  INSERT INTO audit_logs (event_type, actor_type, actor_id, details, ip_address)
  VALUES (?, ?, ?, ?, ?)
`).bind(
  'asset_cleanup',
  'system',
  'cron',
  JSON.stringify({ deleted_count: count, cutoff_date: cutoffDate }),
  '127.0.0.1'
).run();
```
