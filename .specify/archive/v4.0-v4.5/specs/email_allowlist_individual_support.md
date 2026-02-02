# BDD Spec: 支援個別 Email 白名單

## 設計方案：單表雙模式

### 資料庫結構
```sql
-- 擴展現有 email_allowlist 表
ALTER TABLE email_allowlist ADD COLUMN type TEXT DEFAULT 'domain' CHECK (type IN ('domain', 'email'));

-- 範例資料
-- type='domain': 'moda.gov.tw' (匹配 *@moda.gov.tw)
-- type='email': 'chingw@acs.gov.tw' (精確匹配)
```

### 驗證邏輯
```typescript
async function checkEmailAllowed(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  
  // 查詢：域名匹配 OR 精確 email 匹配
  const result = await db.prepare(`
    SELECT 1 FROM email_allowlist 
    WHERE (type = 'domain' AND domain = ?) 
       OR (type = 'email' AND domain = ?)
    LIMIT 1
  `).bind(domain, email).first();
  
  return result !== null;
}
```

## Scenario 1: 域名白名單驗證
- Given: email_allowlist 包含 ('moda.gov.tw', 'domain')
- When: 用戶 email 為 'user@moda.gov.tw'
- Then: 驗證通過

## Scenario 2: 個別 Email 白名單驗證
- Given: email_allowlist 包含 ('chingw@acs.gov.tw', 'email')
- When: 用戶 email 為 'chingw@acs.gov.tw'
- Then: 驗證通過

## Scenario 3: 不在白名單
- Given: email_allowlist 不包含 'example.com' 或 'user@example.com'
- When: 用戶 email 為 'user@example.com'
- Then: 驗證失敗，回傳 403

## Migration 步驟
1. 創建 migration 文件 (0005_email_allowlist_individual.sql)
2. 增加 type 欄位 (預設 'domain')
3. 插入個別 email: 'chingw@acs.gov.tw'
4. 更新 checkEmailDomain → checkEmailAllowed
5. 更新 oauth.ts 使用統一驗證函數
6. 移除硬編碼的 allowedDomains 和 allowedEmails

## 優點
- ✅ 單一資料表，簡化管理
- ✅ 支援兩種驗證模式
- ✅ 向後相容（現有 domain 記錄自動標記為 'domain'）
- ✅ 單一 SQL 查詢完成驗證
