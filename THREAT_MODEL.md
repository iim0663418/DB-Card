# Threat Model — DB-Card

## 1. System Context

**系統描述**: DB-Card 是一套安全預設 NFC 數位名片系統，支援 NFC 觸碰發卡、收到的名片管理（多模態 AI 辨識）、MCP AI Agent 介面，並遵循 GDPR 合規要求。

**技術棧**:
- Runtime: Cloudflare Workers (TypeScript)
- Database: D1 (SQLite 分散式)
- Storage: R2 Bucket (名片圖片)
- Cache/Session: KV Namespace
- Rate Limiting: Durable Objects
- Vector Search: Vectorize (card embeddings)
- AI: Google Gemini (OCR, 標籤, 搜尋)
- Authentication: Google OIDC (使用者), Passkey/SETUP_TOKEN (管理員), OAuth 2.1 + PKCE (MCP)
- Encryption: AES-256-GCM 信封加密 (DEK/KEK)

**部署環境**:
- Cloudflare 全球邊緣網路
- 自訂網域: `db-card.sfan-tech.com`
- Worker URL: `db-card-staging.csw30454.workers.dev`
- WAF + CDN 由 Cloudflare 提供
- Secrets 儲存於 Cloudflare Workers Secrets (`JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `KEK`, `SETUP_TOKEN`)

---

## 2. Assets

| 優先級 | 資產 | 類型 | 說明 |
|--------|------|------|------|
| P0 | KEK (Key Encryption Key) | 金鑰 | 解密所有名片 DEK 的主金鑰，洩漏 = 所有加密資料曝光 |
| P0 | JWT_SECRET | 金鑰 | 簽發所有 OAuth/MCP JWT 的密鑰 |
| P0 | 加密名片資料 (encrypted_payload + wrapped_dek) | 資料 | 使用者 PII：姓名、電話、email、組織、職稱 |
| P1 | Google OAuth Credentials | 金鑰 | `GOOGLE_CLIENT_SECRET`，可用於假冒 IdP 流程 |
| P1 | Session Tokens (KV) | 資料 | `oauth_session:*`, `passkey_session:*`, MCP refresh tokens |
| P1 | R2 名片圖片 | 資料 | 含 PII 的原始/縮圖影像 |
| P2 | D1 Database (明文欄位) | 資料 | email_allowlist、audit_logs、risc_events、users table |
| P2 | SETUP_TOKEN | 金鑰 | 管理員存取的備用驗證 |
| P3 | Vectorize Embeddings | 資料 | 名片向量表示，可逆向推測內容 |
| P3 | Audit Logs | 資料 | 操作紀錄含匿名化 IP、時間戳 |

---

## 3. Entry Points & Trust Boundaries

| Entry Point | Method | Auth | Trust Boundary |
|---|---|---|---|
| `POST /api/nfc/tap` | Public | None (card_uuid) | Internet → Worker；任何人可呼叫，靠 rate limit + budget 防禦 |
| `GET /api/read` | Public | Session token (query) | Internet → Worker；需合法 session 才回傳解密資料 |
| `POST /api/oauth/init` | Public | None | Internet → Worker → Google OIDC |
| `GET /oauth/callback` | Public | Google auth code + state | Google → Worker；需驗證 state + PKCE |
| `POST /api/admin/login` | Public | SETUP_TOKEN | Internet → Worker；暴力破解風險 |
| `POST /api/admin/passkey/*` | Public | WebAuthn challenge | Internet → Worker；密碼學保護 |
| `POST /mcp` | Bearer JWT | MCP access token | AI Client → Worker；scope-based 授權 |
| `POST /mcp/token` | Public | auth code + PKCE verifier | AI Client → Worker；一次性 code |
| `GET /mcp/authorize` | Public | Google OIDC (delegated) | Browser → Worker → Google |
| `POST /mcp/register` | Public | None (Dynamic Client Reg) | AI Client → Worker |
| `POST /api/risc/events` | Public | Google SET JWT (JWKS) | Google RISC → Worker；需 JWKS 驗證 |
| `POST /api/user/*` | Cookie/Bearer | OAuth session JWT | Browser → Worker；需 CSRF + OAuth |
| `POST /api/admin/*` | Cookie | admin_token (Passkey/SETUP_TOKEN session) | Browser → Worker；需 CSRF |
| `GET /api/user/received-cards/:uuid/image` | Cookie/Bearer | OAuth session | Browser → Worker → R2 |
| `POST /api/user/received-cards/unified-extract` | Cookie/Bearer | OAuth session | Browser → Worker → Gemini API |
| Cron Trigger (`0 18 * * *`) | Internal | Cloudflare scheduler | Cloudflare → Worker；無外部入口 |

---

## 4. Threats

| ID | Threat | Actor | Surface | Asset | Impact | Likelihood | Status | Controls |
|---|---|---|---|---|---|---|---|---|
| T01 | NFC UUID 列舉攻擊 | 外部攻擊者 | `POST /api/nfc/tap` | 名片資料 | 探測有效 card UUID，發起未授權讀取 session | Medium | Mitigated | IP rate limit (30/60s) + card budget + UUID v4 entropy (122-bit) |
| T02 | KEK 洩漏導致全量解密 | 內部人員/供應鏈攻擊 | Cloudflare Secrets | KEK, 所有加密名片 | 所有名片 PII 曝光 | Low | Accepted | KEK 存於 Cloudflare Secrets (不可讀)、支援 KEK rotation、單人存取 |
| T03 | JWT_SECRET 洩漏導致任意身份偽造 | 內部人員/供應鏈攻擊 | Cloudflare Secrets | 所有 session | 可偽造任何使用者/MCP token | Low | Accepted | Secret 不進版控、HS256 對稱簽章 |
| T04 | MCP Refresh Token 竊取 | 惡意 AI Client | `POST /mcp/token` | MCP session | 長期存取使用者名片（30天） | Medium | Mitigated | Refresh token rotation (one-time use)、KV TTL、scope 限制 |
| T05 | Google 帳號接管後存取 DB-Card | 外部攻擊者 | OAuth callback | 使用者名片資料 | 完整存取受害者資料 | Medium | Mitigated | RISC integration (即時停用)、session 自動撤銷、1h JWT expiry |
| T06 | CSRF 攻擊管理員/使用者 API | 外部攻擊者 | Admin/User mutating APIs | 名片 CRUD | 代替使用者刪除/修改資料 | Low | Mitigated | CSRF token (KV-backed)、SameSite=Lax cookie、Origin 驗證 |
| T07 | Admin SETUP_TOKEN 暴力破解 | 外部攻擊者 | `POST /api/admin/login` | 管理後台 | 完整管理權限 | Medium | Partially Mitigated | Timing-safe compare；缺少明確的 login rate limit DO |
| T08 | MCP Dynamic Client Registration 濫用 | 外部攻擊者 | `POST /mcp/register` | 系統資源 | 大量註冊 client 消耗 KV、為 phishing 取得合法 client_id | Medium | Open | 無 client 數量限制可見 |
| T09 | Gemini API Prompt Injection | 惡意名片設計者 | unified-extract, OCR, enrich | AI 輸出品質 | 提取錯誤資料、繞過 provenance 標記 | Medium | Accepted | 結構化 prompt、provenance 機制（可見/翻譯/推測） |
| T10 | R2 圖片直接存取（bucket misconfiguration） | 外部攻擊者 | R2 public URL | 名片圖片 (PII) | 未授權存取名片照片 | Low | Mitigated | R2 binding (non-public)、透過 Worker auth 才能存取 |
| T11 | Session fixation / hijacking | 外部攻擊者 (network) | Cookie auth_token | 使用者 session | 假冒使用者 | Low | Mitigated | HttpOnly + Secure + SameSite=Lax、KV-backed session、1h expiry |
| T12 | 供應鏈攻擊 (npm dependencies) | 供應鏈 | Build pipeline | 所有 assets | 植入後門 | Low | Mitigated | npm audit (0 vulns)、OSV-Scanner、241 packages 定期掃描 |
| T13 | Vectorize embedding 逆向工程 | 內部/進階攻擊者 | Vectorize binding | 名片內容 | 從向量推測 PII | Low | Accepted | Embedding 為降維表示、需內部存取、低精度逆向 |
| T14 | Audit log injection / tampering | 內部人員 | D1 audit_logs | 稽核紀錄完整性 | 抹除攻擊痕跡 | Low | Accepted | D1 無 append-only 保證；IP 已匿名化 |
| T15 | NFC ReadSession token 預測 / 重放 | 外部攻擊者 | `GET /api/read` | 名片資料 | 未授權讀取已過期/撤銷的卡片 | Low | Mitigated | Session 24h TTL、retap revocation、crypto.randomUUID() |
| T16 | 名片分享功能越權存取 | 已認證使用者 | `POST /api/user/received-cards/:uuid/share` | 他人名片資料 | 存取非自有名片 | Medium | Mitigated | Owner check (email match on card)、OAuth 驗證 |
| T17 | RISC endpoint 偽造 | 外部攻擊者 | `POST /api/risc/events` | 使用者帳號 | 惡意停用帳號 (DoS) | Low | Mitigated | Google JWKS 驗證、audience 檢查、issuer allowlist |
| T18 | 管理員 cron trigger API 濫用 | 已入侵管理員 | `POST /api/admin/trigger-cron` | 系統穩定性 | 重複執行批次任務、消耗配額 | Low | Mitigated | Admin auth required、單一 cron 設計 |

---

## 5. Deprioritized

| Threat | 理由 |
|--------|------|
| DDoS (L7 volumetric) | Cloudflare WAF/CDN 預設保護，非應用層威脅 |
| Physical NFC cloning | SECURITY.md 明確標示 physical access 為 out of scope |
| Social engineering | SECURITY.md 明確標示為 out of scope |
| D1 SQL injection | 所有查詢使用 parameterized binding (`.bind()`)，程式碼中無字串拼接 SQL |
| XSS (stored/reflected) | CSP with nonce、X-Content-Type-Options、input 未直接渲染至 HTML |

---

## 6. Open Questions

1. **KEK rotation 頻率？** 程式碼支援 rotation 機制 (`wrapDek`/`unwrapDek`)，但無法從 source 確認實際排程或 SOP。
2. **email_allowlist 管理流程？** 允許清單是否有審核機制？新增 domain 是否需要多人審批？
3. **MCP client registration 上限？** `POST /mcp/register` 無可見的 per-IP 或全域數量限制。
4. **KV 資料跨區一致性？** Session 操作（write-then-read）是否受 eventual consistency 影響？
5. **Gemini API key 輪換？** 未見 `GEMINI_API_KEY` 的 rotation 機制或 usage alert。
6. **Backup 與 disaster recovery？** D1/R2 的備份策略與 RTO/RPO 未從程式碼可見。
7. **Admin passkey 綁定流程？** 首次 passkey 註冊是否需要既有 admin session？（可能的 bootstrap 問題）
8. **Prod vs Staging secrets 隔離？** `wrangler.toml` 為 staging 配置，prod 的 secret 管理是否獨立？

---

## 7. Review History

| Who | When | Outcome |
|---|---|---|
| Kiro (AI threat-model-bootstrap) | 2026-06-16 | Initial threat model created from source code review |

---

## 8. Recommended Mitigations

### High Priority

1. **T07 — Admin login rate limiting**
   - 為 `POST /api/admin/login` 新增 Durable Object rate limit（例：5 attempts / 15 min per IP）。
   - 失敗嘗試後增加 exponential backoff。

2. **T08 — MCP client registration abuse**
   - 對 `POST /mcp/register` 新增 per-IP rate limit（例：5 registrations / hour）。
   - 考慮 client 總數上限或 TTL 自動清理不活躍 client。

### Medium Priority

3. **T04 — MCP refresh token binding**
   - 考慮 refresh token 綁定 client fingerprint (User-Agent + IP prefix) 以降低竊取後可用性。

4. **T02/T03 — Secret rotation 自動化**
   - 建立 JWT_SECRET rotation runbook（dual-key 過渡期）。
   - KEK rotation 的 cron / 手動觸發 SOP 文件化。

5. **T09 — Gemini output validation**
   - 對 AI 提取結果加強 schema validation（例：email/phone format、field length cap）。
   - 標記可疑長字串或結構化注入嘗試。

### Low Priority

6. **T14 — Audit log integrity**
   - 考慮將高敏感 audit events (admin login, RISC, KEK 操作) 同步至外部 immutable store (e.g., Cloudflare Logpush)。

7. **T13 — Embedding access control**
   - 確認 Vectorize namespace 無法透過 Worker 以外途徑存取（Cloudflare 預設隔離，但應確認無 public API）。

8. **T01 — NFC tap response timing uniformization**
   - 確保 invalid UUID 與 valid UUID 的回應時間一致，避免 timing oracle 洩漏 UUID 存在性。
