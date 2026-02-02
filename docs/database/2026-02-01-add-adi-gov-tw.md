# Email Allowlist 更新記錄

## 日期
2026-02-01 09:39 UTC+8

## 操作
添加 `adi.gov.tw` 到域名白名單

## 執行環境
- Staging (d31b5e42-d8bf-4044-9744-4aff5669de4b)

## SQL 命令
```sql
INSERT INTO email_allowlist (type, domain, added_at, added_by) 
VALUES ('domain', 'adi.gov.tw', 1769909955, 'admin');
```

## 當前白名單
| Domain | Type | Added At | Added By |
|--------|------|----------|----------|
| moda.gov.tw | domain | 1768755667 | system |
| adi.gov.tw | domain | 1769909955 | admin |

## 影響
- `@adi.gov.tw` 郵箱現在可以通過 OAuth 登入
- 與 `@moda.gov.tw` 享有相同權限

## 備註
- Production 環境尚未建立
- 未來部署 Production 時需要同步此白名單
