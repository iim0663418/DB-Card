# BDD Spec: Complete Security Headers Implementation

## Scenario 1: HTML Responses Must Have All Security Headers
- **Given**: A request for HTML content (index.html, admin-dashboard, user-portal, etc.)
- **When**: The response is returned
- **Then**: Response must include:
  - Content-Security-Policy (with nonce)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - Permissions-Policy: geolocation=(), microphone=(), camera=()
  - Cross-Origin-Embedder-Policy: require-corp
  - Cross-Origin-Opener-Policy: same-origin
  - Cross-Origin-Resource-Policy: same-origin
  - Referrer-Policy: strict-origin-when-cross-origin

## Scenario 2: Static Assets Must Have Security Headers
- **Given**: A request for static assets (CSS, JS, fonts, images)
- **When**: The response is returned
- **Then**: Response must include:
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - Cross-Origin-Resource-Policy: same-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()

## Scenario 3: API Responses Must Have Minimal Security Headers
- **Given**: A request for API endpoints (/api/*)
- **When**: The response is returned
- **Then**: Response must include:
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

## Implementation Requirements
1. Modify `addSecurityHeaders()` to add Permissions-Policy
2. Ensure static asset handler (line 454-462) includes Permissions-Policy
3. Verify all HTML responses go through `addSecurityHeaders()`
4. Keep existing CSP, HSTS, COEP, COOP, CORP headers

## Target Files
- workers/src/index.ts (lines 40-75, 454-462)
