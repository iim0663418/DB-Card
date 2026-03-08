# v5.0.1 Release Complete

## Status: ✅ Deployed to Staging

### Latest Fix (2026-03-08 22:26) - Search Empty Input & Circuit Breaker ✅ DEPLOYED
**Problem**: Empty search triggers API 400 → Circuit Breaker false positive
- Root Cause 1: compositionend unconditionally calls _triggerSearch()
- Root Cause 2: _triggerSearch() has no empty string guard
- Root Cause 3: Circuit Breaker counts 400 as failure (should only count network errors)

**Solution**: Three-layer defense
1. ✅ IME Handler: compositionend checks empty → filterCards('') + early return
2. ✅ Search Guard: _triggerSearch() validates keyword at function start
3. ✅ Circuit Breaker: Only count status=0/timeout/5xx as failures, ignore 4xx

**Files Modified**:
- `workers/public/js/received-cards.js` (2 locations)
- `workers/public/js/search-orchestrator.js` (1 location)

**Deployment**:
- Version: 9560fdf0-614b-4773-a791-b6e9e534a8c5
- Assets: 2 modified, 50 cached
- Bundle: 1059.54 KiB / gzip: 198.71 KiB
- Startup: 22ms
- Health: ✅ OK (v5.0.1, 28 cards, KEK v4)

**Testing Required**:
1. Manual: Type in search, clear it → verify no API call
2. Manual: Chinese IME, finish empty → verify no API call
3. Manual: 3 empty searches → verify circuit stays closed
4. DevTools: Verify no 400 errors from empty searches

---

### Version Info
- Version: v5.0.1
- Deployment: 70e24366-3898-46e2-af60-c3f4c709012f
- Bundle: 1059.45 KiB / gzip: 198.69 KiB
- Startup: 17ms
- Health: ✅ OK

### Latest Fix (2026-03-07 23:00)
**SQL UNION ORDER BY Compatibility**
- Issue: `ORDER BY COALESCE(updated_at, created_at)` not allowed in UNION ALL
- Root Cause: SQLite/D1 requires ORDER BY to reference result columns, not expressions
- Solution: Added `COALESCE(...) AS sort_ts` to both SELECT statements
- File: `workers/src/handlers/user/received-cards/crud.ts`
- Impact: `/api/user/received-cards` now returns properly sorted results

### Security Analysis (2026-03-07 23:02)
**CSRF Protection - OWASP ZAP False Positive**
- Report: 11 forms missing Anti-CSRF tokens
- Reality: ✅ All protected via `X-CSRF-Token` HTTP header (modern SPA pattern)
- Backend: `middleware/csrf.ts` validates all POST/PUT/DELETE requests
- Frontend: `sessionStorage` + HTTP header transmission
- Scanner Limitation: OWASP ZAP only detects `<input type="hidden">` patterns
- Recommendation: Mark as False Positive in security report
- Documentation: `docs/security/csrf-protection-analysis.md`

### Security Fix (2026-03-07 23:05)
**CSP Wildcard Removal**
- Issue: `img-src 'self' data: https:` allowed any HTTPS image source
- Risk: Medium (tracking/phishing potential)
- Solution: Replaced wildcard with specific domains
- Allowed: `*.googleusercontent.com`, `*.r2.cloudflarestorage.com`, `cdn.jsdelivr.net`, `static.cloudflareinsights.com`
- Files: `public/_headers`, `src/index.ts`
- Deployment: 0a403a99-572e-4c9c-92bc-45d093c2b239
- Result: Medium → Low risk

### Security Analysis (2026-03-07 23:07)
**CSP unsafe-inline - Accepted Risk**
- Report: `script-src 'unsafe-inline'` present in CSP
- Reality: ✅ Nonce-based protection for all inline scripts
- Implementation: Worker auto-injects `nonce` attribute to all `<script>` tags
- Modern Browsers (95%+): Ignore `'unsafe-inline'` when nonce present (CSP Level 2+)
- Legacy Browsers (<5%): Require `'unsafe-inline'` for backward compatibility
- Industry Practice: Google, Mozilla, OWASP all recommend this approach
- Inline Scripts: 6 locations, all legitimate (icon fallback, Three.js loading, etc.)
- Recommendation: Accept as Low Risk
- Documentation: `docs/security/csp-unsafe-inline-analysis.md`

**CSP style-src unsafe-inline - Accepted Risk**
- Report: `style-src 'unsafe-inline'` present in CSP
- Reality: Required for Tailwind CSS utility classes and dynamic styles
- Risk Level: Very Low (CSS cannot execute JavaScript code)
- Inline Styles: 6 `<style>` tags, 99 `style=` attributes
- Use Cases: Loading animations, Three.js effects, Tailwind utilities
- Alternative: Extract all styles to external CSS (high effort, minimal security benefit)
- **CSS Attack Vectors** (StackOverflow research):
  1. Visual defacement (pink page, silly appearance)
  2. Text modification (offensive content)
  3. Fake UI elements (phishing login buttons)
  4. Data exfiltration (carefully crafted CSS rules)
- **Mitigation**: Our `connect-src` CSP directive prevents external data exfiltration
- Recommendation: Accept Risk (CSS cannot execute code)

### Release Highlights

#### 1. Tag Normalization System
- Schema: category, raw_value, normalized_value
- Service: unified write layer (tag-service.ts)
- AI: language-neutral extraction
- Frontend: filter by normalized, display raw
- Migrations: 0039 (schema), 0040 (re-tag 85 cards)

#### 2. Batch API Stabilization
- Migration 0041: cleanup stale jobs (>48h)
- Unified cron path: simple auto-tag (20 cards/batch)
- Deprecated: auto-tag-cards-batch.ts (2-week review)

#### 3. Cron Subrequest Optimization
- Priority tasks: 4 blocking
- Background tasks: 8 non-blocking (ctx.waitUntil)
- Fix: "Too many API requests" error

#### 4. Critical Fixes
- **Sorting**: COALESCE(updated_at, created_at) AS sort_ts - SQLite compatible
- Location: traditional Chinese support (臺→台)
- Tag display: object format support
- Search abort: distinguish timeout vs cancellation

#### 5. Documentation
- Tag system architecture overview
- Internationalization analysis (TW-centric)
- Batch API decision record

### Documentation Updates (2026-03-07 23:13)
**Security Risk Analysis - README & Index**
- README.md: Added comprehensive security risk analysis section
- index.html: Added visual risk status display (4 items)
- Coverage: CSRF, CSP img-src, CSP script-src, CSP style-src
- Deployment: 48409c49-0059-45df-8110-fbe2449d8a1e
- Status: All Medium risks documented and addressed

### Frontend Search Optimization (2026-03-07 23:42)
**SearchOrchestrator with Circuit Breaker**
- Created: search-orchestrator.js (circuit breaker pattern)
- Circuit Breaker: 3 states (Closed/Open/Half-Open), 3 failures → 60s degraded
- Debounce: 300ms (Chinese IME friendly)
- IME Protection: compositionstart/end events
- Error Throttle: 10s window for NETWORK_ERROR/TIMEOUT
- Search Limit: 100 → 20 (80% cost reduction)
- Fallback: Local filter when circuit open
- UX: Yellow label for degraded mode (one-time notification)
- Integration: received-cards.js modified by Claude Code
- Deployment: dc6f3dc9-54e8-4730-9b4e-c02adbcf6abb
- External References: Medium (Atlassian), React best practices

### Next Steps
- Monitor tag normalization accuracy
- Evaluate Batch API after 2 weeks (2026-03-21)
- Consider user sorting preferences (if requested)
