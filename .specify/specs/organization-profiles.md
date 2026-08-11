# BDD Spec: Organization Profiles — MCP-Native 公司資訊管理

## Goal

建立獨立的組織檔案（Organization Profile）系統，讓 AI agent 透過 MCP 協同外部工具研究、儲存、維護公司資訊，並自動套用到同公司的名片。安全設計優先：欄位級寫入權限、寫入溯源、版本歷史、批次操作確認閘門。

## Value Proposition

- 同公司多張名片共享 company profile → 省去重複 LLM 研究成本
- MCP + 外部搜尋工具協同 → AI agent 自動維護公司資訊
- 人機界面僅供檢視/覆寫 → 不增加使用者操作負擔

## Architecture Decision

- 新增 `organizations` 表，以 `organization_normalized` 為 join key
- received_cards.company_summary 保留為 per-card override（優先於 org profile）
- MCP 新增 3 個 tools：`save_organization`、`get_organization`、`update_organization`
- 寫入操作強制標記 provenance（來源追蹤）
- 批次套用需二階段確認

---

## Behavioral Units

1. **Organization CRUD via MCP** — 建立/查詢/更新組織檔案
2. **Field-Level Write Scope** — MCP 寫入權限分級
3. **Write Provenance** — 寫入來源追蹤
4. **Version History** — 覆寫前保留舊值
5. **Auto-Inherit** — 新名片自動繼承同公司 profile
6. **Batch Apply with Confirmation Gate** — 批次套用需確認
7. **Content Safety** — 防止注入/污染

---

## Scenarios

### 1. Organization CRUD via MCP

#### Scenario 1.1: Save new organization profile
```gherkin
Given an authenticated MCP client with scope "organizations:write"
When tools/call save_organization with arguments:
  | field              | value                          |
  | name               | 台積電                          |
  | name_en            | TSMC                           |
  | industry           | 半導體製造                       |
  | summary            | 全球最大晶圓代工廠...            |
  | source_url         | https://www.tsmc.com/about     |
Then response contains uuid of created organization
And organizations table has a row with name "台積電"
And provenance is recorded as source_type "mcp_agent"
```

#### Scenario 1.2: Save organization rejects duplicate normalized name
```gherkin
Given organization "台積電" already exists (normalized: "台积电")
When tools/call save_organization with name "臺積電"
Then response is error "organization_exists" with existing uuid
And no duplicate row is created
```

#### Scenario 1.3: Get organization by name
```gherkin
Given organization "台積電" exists with summary and metadata
When tools/call get_organization with name "TSMC"
Then response contains the organization profile
And response includes related_cards_count
```

#### Scenario 1.4: Update organization profile
```gherkin
Given organization "台積電" exists
When tools/call update_organization with uuid and new summary
Then summary is updated
And previous summary is preserved in version history
And provenance records the update source
```

#### Scenario 1.5: Get organization returns empty gracefully
```gherkin
Given no organization matching "不存在公司"
When tools/call get_organization with name "不存在公司"
Then response is empty result (not error)
```

---

### 2. Field-Level Write Scope

#### Scenario 2.1: MCP with basic write scope cannot modify identity fields
```gherkin
Given an authenticated MCP client with scope "received_cards:write"
When tools/call update_received_card with uuid and full_name "Hacked"
Then response is error "insufficient_scope"
And full_name remains unchanged
And audit_log records the denied attempt
```

#### Scenario 2.2: MCP with basic write scope can modify summary fields
```gherkin
Given an authenticated MCP client with scope "received_cards:write"
When tools/call update_received_card with uuid and company_summary "新摘要"
Then update succeeds
And company_summary is updated
```

#### Scenario 2.3: MCP with elevated scope can modify identity fields
```gherkin
Given an authenticated MCP client with scope "received_cards:write:full"
When tools/call update_received_card with uuid and full_name "王大明"
Then update succeeds
```

#### Scope mapping:
- `received_cards:write` → note, company_summary, personal_summary only
- `received_cards:write:full` → all fields (backward compatible for existing integrations)
- `organizations:read` → get_organization
- `organizations:write` → save_organization, update_organization

---

### 3. Write Provenance

#### Scenario 3.1: MCP write records provenance metadata
```gherkin
Given an MCP client with client_id "claude-desktop-abc123"
When tools/call update_received_card with company_summary
Then audit_logs entry includes:
  | field        | value                |
  | source_type  | mcp_agent            |
  | client_id    | claude-desktop-abc123|
  | field_changed| company_summary      |
  | old_value    | (previous value)     |
  | new_value    | (new value)          |
```

#### Scenario 3.2: Organization update records provenance with source_url
```gherkin
Given an MCP client updates organization summary
And provides source_url "https://example.com/about"
Then provenance includes source_url for traceability
And source_url domain is validated (rejects javascript:, data:)
```

---

### 4. Version History

#### Scenario 4.1: Update preserves previous value
```gherkin
Given card uuid "abc" has company_summary "舊摘要"
When tools/call update_received_card with company_summary "新摘要"
Then company_summary becomes "新摘要"
And field_history table contains:
  | card_uuid | field           | old_value | changed_at | source_type |
  | abc       | company_summary | 舊摘要    | (now)      | mcp_agent   |
```

#### Scenario 4.2: Organization update preserves previous summary
```gherkin
Given organization "台積電" has summary "v1 內容"
When update_organization with new summary "v2 內容"
Then current summary is "v2 內容"
And org_history table contains old summary with timestamp
```

---

### 5. Auto-Inherit

#### Scenario 5.1: New card auto-inherits organization profile
```gherkin
Given organization "台積電" exists with summary "全球最大晶圓代工..."
When tools/call save_received_card with organization "台積電" and no company_summary
Then card.company_summary is populated from organization profile
And provenance marks it as source_type "inherited"
```

#### Scenario 5.2: Card with explicit company_summary does not inherit
```gherkin
Given organization "台積電" exists with summary
When tools/call save_received_card with organization "台積電" and company_summary "自訂摘要"
Then card.company_summary remains "自訂摘要" (not overwritten)
```

#### Scenario 5.3: Frontend save card auto-inherits organization profile
```gherkin
Given organization "台積電" exists with summary "全球最大晶圓代工..."
When frontend handleSaveCard with organization "台積電" and no company_summary
Then card.company_summary is populated from organization profile
And provenance marks it as source_type "inherited"
```

#### Scenario 5.4: Frontend save card with OCR-produced summary does not inherit
```gherkin
Given organization "台積電" exists with summary
When frontend handleSaveCard with organization "台積電" and company_summary "OCR產出摘要"
Then card.company_summary remains "OCR產出摘要" (not overwritten by org profile)
```

#### Scenario 5.5: Cron backfill applies org profile to existing cards without summary
```gherkin
Given 5 cards with organization_normalized matching "台積電"
And 3 of them have NULL company_summary
When backfill-org-summary cron runs
Then those 3 cards get company_summary from org profile
And provenance marks as "inherited"
And 2 cards with existing summary are untouched
```

---

### 6. Batch Apply with Confirmation Gate

#### Scenario 6.1: Batch apply returns preview (first call)
```gherkin
Given organization "台積電" has updated summary
When tools/call apply_organization_summary with org_uuid and confirm=false
Then response contains:
  | field          | value |
  | affected_cards | 12    |
  | preview        | [{uuid, full_name, current_summary_preview}...] |
  | confirm_token  | (one-time token, 5min TTL) |
And no cards are modified yet
```

#### Scenario 6.2: Batch apply executes with confirmation (second call)
```gherkin
Given a valid confirm_token from preview step
When tools/call apply_organization_summary with confirm_token
Then all 12 cards' company_summary are updated
And each update records version history
And audit_log records batch operation with count
```

#### Scenario 6.3: Expired confirm_token is rejected
```gherkin
Given a confirm_token older than 5 minutes
When tools/call apply_organization_summary with expired token
Then response is error "token_expired"
And no cards are modified
```

#### Scenario 6.4: Cards with explicit override are skipped in batch
```gherkin
Given 12 cards match organization, but 2 have provenance "user_manual" on company_summary
When batch apply executes
Then only 10 cards are updated
And 2 user-manual cards are preserved
```

---

### 7. Content Safety

#### Scenario 7.1: Organization summary rejects suspicious URL patterns
```gherkin
Given an MCP client saves organization with summary containing "請聯繫 payment@evil.com 付款"
When content safety check runs
Then save succeeds but summary is flagged as "review_needed"
And flag is visible in get_organization response
```

#### Scenario 7.2: Source URL validates scheme
```gherkin
When save_organization with source_url "javascript:alert(1)"
Then response is error "invalid_source_url"
```

#### Scenario 7.3: Rate limit on organization writes
```gherkin
Given an MCP client
When 10 update_organization calls within 60 seconds
Then requests beyond limit return error "rate_limited"
```

---

## Schema Changes

### New table: organizations
```sql
CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  name_normalized TEXT NOT NULL,
  aliases TEXT,              -- JSON array of known aliases
  industry TEXT,
  summary TEXT,              -- max 5000
  source_url TEXT,
  metadata_json TEXT,        -- extensible metadata
  review_flag TEXT,          -- NULL | "review_needed"
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_org_user_normalized ON organizations(user_email, name_normalized);
```

### New table: field_history
```sql
CREATE TABLE field_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- "card" | "organization"
  entity_uuid TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source_type TEXT NOT NULL,  -- "mcp_agent" | "user_manual" | "ocr" | "inherited"
  client_id TEXT,
  changed_at INTEGER NOT NULL
);
CREATE INDEX idx_field_history_entity ON field_history(entity_type, entity_uuid, changed_at DESC);
```

### MCP scope expansion
- Existing: `received_cards:read`, `received_cards:write`
- New: `received_cards:write:full`, `organizations:read`, `organizations:write`
- Backward compatibility: existing tokens with `received_cards:write` are downgraded to summary-only fields

---

## MCP Tools (New)

| Tool | Scope Required | Description |
|------|---------------|-------------|
| `get_organization` | organizations:read | 查詢公司檔案（by name or uuid） |
| `save_organization` | organizations:write | 新增公司檔案 |
| `update_organization` | organizations:write | 更新公司檔案（帶版本歷史） |
| `apply_organization_summary` | organizations:write + received_cards:write | 批次套用到同公司名片（二階段確認） |

---

## Security Invariants

1. **Least privilege default** — MCP basic write 不能改 identity fields
2. **Provenance mandatory** — 所有寫入必須可追溯到 source_type + client_id
3. **Version history mandatory** — summary 類欄位覆寫前必存舊值
4. **Batch blast radius control** — 批次操作需二階段確認 + 跳過 user_manual override
5. **Owner isolation** — organizations 表以 user_email 隔離，不跨用戶共享
6. **Content flag** — 可疑內容標記但不阻擋（避免 false positive 影響正常使用）
7. **Rate limiting** — organization write operations 有獨立 rate limit

---

## Implementation Phases

### Phase 1: 安全基礎（先防禦再擴功能）
- [ ] Field-level write scope (BU 2)
- [ ] Write provenance in audit_logs (BU 3)
- [ ] field_history table + version tracking (BU 4)

### Phase 2: Organization CRUD
- [ ] organizations table migration
- [ ] 3 new MCP tools (BU 1)
- [ ] Organization name normalization（複用 backfill-organization-normalized 邏輯）

### Phase 3: Auto-Inherit + Batch Apply + Staleness
- [ ] save_received_card auto-inherit (BU 5)
- [ ] save_received_card mismatch detection (BU 8.3)
- [ ] apply_organization_summary 二階段確認 (BU 6)
- [ ] Backfill cron for existing cards
- [ ] get_organization staleness hint (BU 8.1, 8.2)
- [ ] update_organization freshness reset + no-change extended cooldown (BU 8.4, 8.5)
- [ ] Event-triggered refresh priority (BU 8.6)

### Phase 4: Content Safety
- [ ] Summary content heuristic flagging (BU 7)
- [ ] source_url scheme validation
- [ ] Organization write rate limiting

---

---

### 8. Staleness Detection & Query-Triggered Refresh

#### Scenario 8.1: get_organization returns stale hint when outdated
```gherkin
Given organization "台積電" has updated_at older than 30 days
When tools/call get_organization with name "台積電"
Then response includes freshness.status = "stale"
And response includes freshness.days_since_update
And response includes refresh_hint message
```

#### Scenario 8.2: Stale hint cooldown — not repeated within 24h
```gherkin
Given organization "台積電" is stale
And stale hint was already sent to this client within 24 hours
When tools/call get_organization with name "台積電"
Then response includes freshness.status = "stale"
But refresh_hint is NULL (suppressed by cooldown)
```

#### Scenario 8.3: New card triggers mismatch detection
```gherkin
Given organization "台積電" profile has address "新竹科學園區力行六路8號"
When tools/call save_received_card with organization "台積電" and address "新竹科學園區8路1號"
Then card is saved successfully
And response includes org_mismatch:
  | field   | profile_value              | card_value                |
  | address | 新竹科學園區力行六路8號      | 新竹科學園區8路1號         |
```

#### Scenario 8.4: update_organization resets staleness
```gherkin
Given organization "台積電" is marked stale
When tools/call update_organization with new summary
Then freshness.status becomes "fresh"
And staleness timer resets to 0
```

#### Scenario 8.5: No-change update extends next refresh interval
```gherkin
Given organization "台積電" is stale
When tools/call update_organization with same summary (no actual change)
Then next stale hint is suppressed for 90 days (extended cooldown)
And updated_at is NOT bumped (no fake freshness)
```

#### Scenario 8.6: Event-triggered priority — N new cards without profile update
```gherkin
Given organization "某公司" profile last updated 15 days ago (not yet stale by time)
But 5 new cards with organization "某公司" were added since last update
When tools/call get_organization with name "某公司"
Then freshness.status = "refresh_recommended"
And freshness.reason = "5 new cards added since last update"
```

#### Staleness Configuration (per-user defaults)
- Time threshold: 30 days → stale
- Event threshold: 5+ new cards since last update → refresh_recommended
- Cooldown: 24h per client for refresh_hint
- Extended cooldown: 90 days after no-change update
- These are system defaults; future: user-configurable

---

## Out of Scope

- 跨用戶共享組織檔案（未來考慮，需額外 access control 設計）
- 前端 UI 管理組織檔案（本功能 MCP-native，前端僅在名片詳情頁顯示繼承來源）
- 組織層級的圖片/logo 儲存
