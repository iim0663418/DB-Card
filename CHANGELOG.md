# Changelog

All notable changes to DB-Card project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-01-20

### Added
- **Session Budget (總量限制)**: Industry best practice based total quantity limits
  - Total limit (max_total_sessions): personal 1000, event_booth 5000, sensitive 100
  - Daily limit (max_sessions_per_day): personal 10, event_booth 50, sensitive 3
  - Monthly limit (max_sessions_per_month): personal 100, event_booth 500, sensitive 30
  - Soft warning mechanism: 90% threshold (personal/event), 80% threshold (sensitive)
- **Database Migration 0010**: Added `total_sessions` column and index
- **KV-based Tracking**: Daily/monthly counters (TTL: 24h/31d)
- **Step 2.5 Budget Check**: Integrated into Tap API execution order
- **Error Codes**: `session_budget_exceeded` (403), `daily_budget_exceeded` (429), `monthly_budget_exceeded` (429)
- **Warning Response**: Returns warning message when approaching limit
- New utility file: `workers/src/utils/session-budget.ts`

### Changed
- **Tap API Execution Order**: Added Step 2.5 (Budget Check) between Rate Limit and Card Validation
- **CardPolicy Interface**: Added 4 new properties (max_total_sessions, max_sessions_per_day, max_sessions_per_month, warning_threshold)
- **Session Creation**: Parallel budget counter updates in Step 5

### Technical
- Updated `workers/src/types.ts` - Added SessionBudgetResult interface
- Updated `workers/src/handlers/tap.ts` - Integrated Budget Check logic
- Local testing: 6/6 passed (100%)
- Based on external research: Dropbox, PayPal, K-Factor theory

## [4.1.0] - 2026-01-20

### Added
- **Multi-Layer Defense for NFC Tap API**
  - Layer 1: 60-second deduplication mechanism (prevents duplicate requests)
  - Layer 2: Dual-dimension rate limiting (Card UUID + IP)
  - Layer 3: Concurrent read limit (preserved existing mechanism)
- **Smart Deduplication**: Returns same session within 60s, reduces resource consumption
- **Rate Limiting**: 10 requests/minute, 50 requests/hour per dimension
- **IP Extraction Priority**: CF-Connecting-IP > X-Forwarded-For > 'unknown'
- New utility files:
  - `workers/src/utils/rate-limit.ts` - Sliding Window Counter implementation
  - `workers/src/utils/ip.ts` - Client IP extraction
- Complete BDD specification with 11 scenarios
- Test script: `test-tap-api.sh`

### Changed
- **Refactored `handlers/tap.ts`**: Implemented 5-step execution order
  - Step 0: Basic validation
  - Step 1: Dedup check (NEW)
  - Step 2: Rate limit check (NEW)
  - Step 3: Validate card
  - Step 4: Retap revocation
  - Step 5: Create session + store dedup + increment counters
- Updated `types.ts`: Added 5 new rate limit type definitions
- Updated API documentation: `docs/api/nfc-tap.md`

### Security
- **Anti-Crawler Protection**: Prevents single crawler from creating massive sessions
- **Resource Abuse Prevention**: Limits view count for sensitive cards
- **No Bypass Mechanism**: Admin portal also subject to dedup (prevents misuse)
- **Precise Error Messages**: 429 errors include retry_after and limit details

### Technical
- Sliding Window Counter algorithm for accurate time windows
- KV-based deduplication and counting (60s/120s/7200s TTL)
- Parallel checks and operations (improved performance)
- Complete TypeScript type definitions
- TypeScript compilation passed ✅

### Documentation
- Updated README.md with v4.1.0 features
- Updated API documentation with multi-layer defense details
- Created implementation summary: `.specify/specs/tap-dedup-ratelimit-implementation-summary.md`
- Updated knowledge graph and progress tracking

## [4.0.1] - 2026-01-19

### Added
- **Landing Page Product Introduction**: Added "How to Use" 3-step guide
- **Core Features Optimization**: Updated to user-perspective 4 differentiators
- **LLM-Friendly Documentation**: Created `llm.txt` for AI system understanding
- **Permanent Delete Function**: Admins can permanently delete revoked cards (helps reset)

### Performance
- **Frontend Optimization**: Blocking resources drastically reduced (4→1, 3→1, 6→1)
- **API Optimization**: Tap API performance improved 72-79% (7.2s → 1.5-2s)
- **Cache Mechanism**: Read API hot read improved 44% (0.9s → 0.5s)

### Technical
- Added CDN preconnect to optimize load speed
- Delayed Three.js initialization (100ms)
- Implemented full response caching (60s TTL)
- Asynchronous audit logging

## [4.0.0] - 2026-01-18

### Added
- **Envelope Encryption Architecture**: Each card has independent DEK, KEK rotation
- **Authorization Session Mechanism (ReadSession)**: 24h TTL, revocable, concurrent read limit
- **Instant Revocation**: Re-tap NFC card to revoke previous session
- **Audit Logging**: Complete access behavior logging, IP anonymization
- **Complete Bilingual Support**: 11 i18n keys
- **Security Monitoring Dashboard**: 7 APIs
- **Form Validation and Cleanup**
- **KEK Migration Infrastructure**
- **Admin Dashboard Complete CRUD**
- **HttpOnly Cookies Security Enhancement**

### Changed
- Migrated from pure frontend (v3.X) to backend API architecture
- Data encrypted and stored in D1 Database (NFC card only contains UUID)
- Cloudflare Workers global edge computing

### Security
- Envelope encryption with per-card DEK
- KEK rotation mechanism
- Timing-safe token verification
- IP anonymization in audit logs
- CORS whitelist
- CSP headers

## [3.2.1] - 2025-08-09

### Added
- PWA offline storage
- Bilingual translation system
- Security architecture modules

### Archived
- Archived to `archive/v3-pwa/`

---

## Version Naming Convention

- **Major (X.0.0)**: Breaking changes, architecture redesign
- **Minor (x.Y.0)**: New features, backward compatible
- **Patch (x.y.Z)**: Bug fixes, performance improvements

## Links

- [GitHub Repository](https://github.com/iim0663418/DB-Card)
- [Documentation](docs/)
- [BDD Specifications](.specify/specs/)
