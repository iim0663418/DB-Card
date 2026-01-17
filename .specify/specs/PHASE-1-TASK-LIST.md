# Phase 1 Task List - Infrastructure Setup

**Phase**: Week 1  
**Start Date**: 2026-01-18  
**Owner**: Commander + Claude (Builder)  
**Goal**: 建立 Cloudflare Workers + D1 基礎設施

---

## Task 1.1: 建立 Cloudflare Workers 專案

### BDD Specification


### Commands
```bash
cd /Users/shengfanwu/GitHub/DB-Card
mkdir -p workers
cd workers
wrangler init --yes
```

### Expected Output
```
workers/
├── wrangler.toml
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## Task 1.2: 配置 wrangler.toml

### BDD Specification


### Configuration
```toml
name = db-card-api
main = src/index.ts
compatibility_date = 2024-01-01

[env.production]
name = db-card-api-prod
vars = { ENVIRONMENT = production }

[env.staging]
name = db-card-api-staging
vars = { ENVIRONMENT = staging }

[[env.production.d1_databases]]
binding = DB
database_name = db-card-prod
database_id = TBD

[[env.staging.d1_databases]]
binding = DB
database_name = db-card-staging
database_id = TBD

[[kv_namespaces]]
binding = KV
id = TBD
```

---

## Task 1.3: 初始化 D1 Database

### BDD Specification


### Commands
```bash
# 創建 Production Database
wrangler d1 create db-card-prod

# 創建 Staging Database
wrangler d1 create db-card-staging

# 創建 KV Namespace
wrangler kv:namespace create RATE_LIMIT
```

---

## Task 1.4: 創建 D1 Schema Migration

### BDD Specification


### Migration File
```sql
-- migrations/0001_initial_schema.sql

-- 1. KEK 版本管理表
CREATE TABLE kek_versions (
  version INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  rotated_at INTEGER,
  status TEXT DEFAULT 'active'
);

-- 2. 名片主表
CREATE TABLE cards (
  uuid TEXT PRIMARY KEY,
  card_type TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner_email TEXT,
  FOREIGN KEY (key_version) REFERENCES kek_versions(version)
);

CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_key_version ON cards(key_version);
CREATE INDEX idx_cards_status ON cards(status);

-- 3. ReadSession 授權表
CREATE TABLE read_sessions (
  session_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_reads INTEGER NOT NULL,
  reads_used INTEGER DEFAULT 0,
  revoked_at INTEGER,
  revoked_reason TEXT,
  policy_version TEXT,
  token_version INTEGER DEFAULT 1,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_card_uuid ON read_sessions(card_uuid);
CREATE INDEX idx_sessions_expires_at ON read_sessions(expires_at);
CREATE INDEX idx_sessions_token_version ON read_sessions(token_version);

-- 4. 操作審計日誌
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  card_uuid TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timestamp INTEGER NOT NULL,
  details TEXT
);

CREATE INDEX idx_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_logs_session_id ON audit_logs(session_id);

-- 5. 管理員帳號
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_active INTEGER DEFAULT 1
);

-- 初始化 KEK version 1
INSERT INTO kek_versions (version, created_at, status) 
VALUES (1, strftime('%s', 'now') * 1000, 'active');
```

### Execute Migration
```bash
# 創建 migrations 目錄
mkdir -p workers/migrations

# 執行 migration (Staging)
wrangler d1 execute db-card-staging --file=migrations/0001_initial_schema.sql

# 執行 migration (Production)
wrangler d1 execute db-card-prod --file=migrations/0001_initial_schema.sql
```

---

## Task 1.5: 配置 Secrets

### BDD Specification


### Commands
```bash
# 生成 KEK (256-bit)
openssl rand -base64 32 > kek.key

# 上傳 KEK (Staging)
cat kek.key | wrangler secret put KEK --env staging

# 上傳 KEK (Production)
cat kek.key | wrangler secret put KEK --env production

# 生成 SETUP_TOKEN
openssl rand -hex 32 > setup_token.txt

# 上傳 SETUP_TOKEN
cat setup_token.txt | wrangler secret put SETUP_TOKEN --env production

# 安全刪除本地檔案
shred -u kek.key setup_token.txt
```

---

## Task 1.6: 實作基礎 TypeScript 結構

### BDD Specification


### Directory Structure
```
workers/
├── src/
│   ├── index.ts              # 主入口
│   ├── router.ts             # API 路由
│   ├── types.ts              # TypeScript 類型定義
│   ├── crypto/
│   │   ├── envelope.ts       # Envelope Encryption
│   │   └── utils.ts          # 加密工具
│   ├── handlers/
│   │   ├── tap.ts            # POST /api/nfc/tap
│   │   ├── read.ts           # GET /api/read
│   │   └── admin.ts          # Admin APIs
│   ├── middleware/
│   │   ├── cors.ts           # CORS 處理
│   │   ├── ratelimit.ts      # Rate Limiting
│   │   └── auth.ts           # 驗證中介層
│   └── utils/
│       ├── response.ts       # 統一回應格式
│       └── logger.ts         # 日誌工具
├── migrations/
│   └── 0001_initial_schema.sql
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## Task 1.7: 設定 GitHub Actions CI/CD

### BDD Specification


### Workflow File
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd workers
          npm install
      
      - name: Run tests
        run: |
          cd workers
          npm test
      
      - name: Deploy to Staging
        if: github.ref == 'refs/heads/develop'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: workers
          environment: staging
      
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: workers
          environment: production
```

---

## Task 1.8: 驗證基礎設施

### BDD Specification


### Health Check Endpoint
```typescript
// src/handlers/health.ts
export async function handleHealth(env: Env): Promise<Response> {
  try {
    // 測試 D1 連接
    const result = await env.DB.prepare('SELECT 1').first();
    
    return new Response(JSON.stringify({
      status: 'ok',
      database: 'connected',
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      database: 'disconnected',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## Acceptance Criteria

- [ ] wrangler.toml 配置完成
- [ ] D1 Database 創建成功 (Staging + Production)
- [ ] Schema Migration 執行成功 (5 tables)
- [ ] KEK + SETUP_TOKEN 上傳成功
- [ ] TypeScript 專案結構建立
- [ ] GitHub Actions 配置完成
- [ ] /health 端點回傳 200
- [ ] D1 連接測試通過

---

**[END OF PHASE 1 TASK LIST]**
