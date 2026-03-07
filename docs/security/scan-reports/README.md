# Security Scan Reports

## Latest Scan (2026-03-07)

### npm audit
- **Vulnerabilities**: 0
- **Dependencies**: 414 packages
- **Fixed**: ajv, minimatch, rollup (dev dependencies)
- **Status**: ✅ All dependencies secure

### OSV-Scanner
- **Vulnerabilities**: 0
- **Packages**: 378 packages
- **Fixed**: 3 dev dependency issues (2026-03-07)
- **Status**: ✅ No issues found

### OWASP ZAP
- **Result**: 51 PASS, 16 WARN, 0 FAIL
- **Environment**: Staging
- **URL**: https://db-card-staging.csw30454.workers.dev
- **Status**: ✅ All medium+ risks fixed

**Detailed Report**: [security-scan-2026-03-07.md](./security-scan-2026-03-07.md)

---

## Historical Scans

### 2026-01-24
- OWASP ZAP: 52 PASS, 15 WARN, 0 FAIL
- npm audit: 0 vulnerabilities
- OSV-Scanner: 0 vulnerabilities

---

## Security Headers (Complete)
1. Content-Security-Policy (CSP with nonce)
2. X-Content-Type-Options: nosniff
3. X-Frame-Options: DENY
4. X-XSS-Protection: 1; mode=block
5. Referrer-Policy: strict-origin-when-cross-origin
6. Strict-Transport-Security (HSTS)
7. Cross-Origin-Embedder-Policy (COEP)
8. Cross-Origin-Opener-Policy (COOP)
9. Cross-Origin-Resource-Policy (CORP)

---

## Final Rating
- **Security Grade**: A
- **Production Ready**: ✅
- **All Scans**: Passed ✅
- **Last Updated**: 2026-03-07
