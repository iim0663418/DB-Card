# Changelog

All notable changes to DB-Card project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.6.0] - 2026-02-08

### Performance
- **Icon Bundle Optimization**: Migrated from Lucide UMD bundle to Vite-bundled ES modules
  - Bundle size: 379 KB → 12.33 KB (96.8% reduction, gzip: 3.98 KB)
  - Tree-shaking: 65 icons used (vs 1,400+ in full bundle)
  - Build tool: Vite with esbuild minifier
  - Module format: ES Module with `window.initIcons()` global function
  - Files updated: 5 HTML files, 3 JS files (38 replacements total)
  - Expected FCP improvement: 50%+ on 3G networks
  - Expected LCP improvement: 40%+
  - Lighthouse score: +10-15 points (estimated)

### Added
- **Vite Build System**: New `vite.config.js` for icon bundling
  - Output: `public/dist/icons.[hash].js`
  - Minifier: esbuild (faster than terser)
- **Icon Bundle**: `src/icons.js` with 65 tree-shaken icons
  - Exports `initIcons()` function for dynamic icon replacement
  - Uses Lucide's `createElement()` API
  - Supports all icon attributes (width, height, stroke-width, class)

### Changed
- **Icon Loading**: Replaced `lucide.createIcons()` with `window.initIcons()`
  - 22 replacements in JS files (main.js, page-init.js, user-portal-init.js)
  - 16 replacements in HTML inline scripts
- **Script Loading**: Changed to `type="module"` for icon bundle and config.js
- **Dynamic Icons**: Added `window.initIcons()` calls after dynamic HTML insertion
  - Social media icons (renderSocialLinks, parseSocialLinks)

### Fixed
- **Missing Icons**: Added `megaphone` icon to bundle
- **ES Module Loading**: Fixed `config.js` syntax error by adding `type="module"`
- **Social Icons**: Fixed dynamic icon initialization in card display

### Build
- New npm scripts:
  - `npm run build:icons` - Build icon bundle
  - `npm run dev:icons` - Watch mode for development

### Deployment
- Version: `20349584-8d93-417e-a8fa-a530a000d126`
- Bundle: `icons.-k7gZ0Em.js` (12.33 KB)
- Status: ✅ All pages tested and working

## [4.6.0] - 2026-02-06

### Security
- **CRITICAL FIX**: Removed response cache to fix rate limiting bypass vulnerability (CVE-2024-21662 pattern)
  - Response cache (60s TTL) was bypassing `reads_used` counter updates
  - `max_reads` limit was not enforced when cache hit
  - Fixed by removing response cache and adding `Cache-Control: no-store` headers
- **Concurrent Control**: Implemented atomic `UPDATE...RETURNING` with optimistic locking
  - Prevents race conditions in `reads_used` counter
  - Ensures accurate rate limiting enforcement
- **Cache Consistency**: Unified cache invalidation across 4 layers
  - Card data cache, card type cache, session response cache, last session cache
  - Prevents stale data after card updates

### Added
- **HTTP Cache-Control Headers**: Added `no-store, no-cache, must-revalidate, private` to `/api/read` endpoint
- **Unified Cache Invalidation**: New utility `workers/src/utils/cache.ts`
  - `invalidateCardCaches()` function for atomic cache clearing
  - Integrated into admin and user card update/delete operations

### Changed
- **Read Handler**: Removed response cache logic (Line 183-198, 300-304)
- **Session Validation**: Now executes on every request (no cache bypass)
- **Counter Updates**: Changed from `ctx.waitUntil()` to synchronous `await` for critical operations

### Performance
- Overall performance impact: ~5% (acceptable trade-off for security)
- Card data cache (300s TTL) still provides primary optimization
- D1 UPDATE latency: < 10ms

### Testing
- ✅ All Staging tests passed
- ✅ max_reads enforcement: 100% accurate (20/20 reads, 21st blocked)
- ✅ reads_used counter: matches actual requests

### Documentation
- Updated README.md with security fix details
- Created detailed security fix report: `docs/security/SECURITY-FIX-2026-02-06.md`
- Updated CHANGELOG.md

### Compliance
- ✅ RFC 7234 (HTTP Caching)
- ✅ OWASP Rate Limiting Best Practices
- ✅ Industry Standard: Counter First, Cache Second

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
