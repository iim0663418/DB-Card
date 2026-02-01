# BDD Spec: Apply Security Headers to All Responses

## Scenario: All HTTP responses should include Permissions-Policy header

### Given
- A Cloudflare Worker handling various types of requests (HTML, JSON, static assets)
- Security headers function `addSecurityHeaders()` exists
- OWASP ZAP requires Permissions-Policy on all responses

### When
- Any HTTP request is processed (API, HTML pages, static resources, error responses)

### Then
- Response MUST include `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- HTML responses MUST include full security headers (CSP, HSTS, etc.)
- JSON/API responses MUST include at least Permissions-Policy
- Static assets MUST include Permissions-Policy

## Implementation Strategy

### Option 1: Wrapper Function (Minimal Change)
Create `addMinimalSecurityHeaders()` for non-HTML responses:
- Only adds Permissions-Policy
- Applied to all responses before return

### Option 2: Response Interceptor (Comprehensive)
Modify all `return` statements to pass through security header middleware

### Chosen: Option 1 (Minimal)
- Less invasive
- Maintains existing CSP logic for HTML
- Quick to implement and test

## Acceptance Criteria
1. `/health` endpoint returns Permissions-Policy header
2. `/api/*` endpoints return Permissions-Policy header
3. Static assets (CSS, JS) return Permissions-Policy header
4. HTML pages return full security headers including Permissions-Policy
5. Error responses (404, 500) return Permissions-Policy header
