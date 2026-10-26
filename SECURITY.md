# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in DB-Card, please report it via:

**GitHub Security Advisories**: https://github.com/iim0663418/DB-Card/security/advisories/new

### Response Timeline
- **Acknowledgment**: Within 48 hours
- **Status Updates**: Every 7 days
- **Fix Target**: Within 30 days for high/critical issues

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.6.x   | :white_check_mark: |
| 4.0-4.5 | :white_check_mark: |
| < 4.0   | :x:                |

## Security Scanning

DB-Card undergoes regular security scanning:

- **OSV-Scanner**: Multi-language vulnerability database (every commit)
- **npm audit**: Node.js dependency scanning (weekly)
- **OWASP ZAP**: Web application security testing (monthly)

Latest scan results: [docs/security/scan-reports/](docs/security/scan-reports/)

## Security Standards

DB-Card follows these security standards:

- **OWASP Top 10 2021**: Web application security
- **RFC 6749**: OAuth 2.0 Authorization Framework
- **RFC 7636**: PKCE for OAuth Public Clients
- **RFC 9700**: OAuth 2.0 Security Best Current Practice
- **GDPR**: Articles 7, 12, 13, 15, 20, 30 (100% compliant)

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. Report received and acknowledged
2. Vulnerability verified and assessed
3. Fix developed and tested
4. Security advisory published (if applicable)
5. CVE assigned (for critical issues)

## Out of Scope

The following are **not** considered security vulnerabilities:

- Issues in unsupported versions (< 4.0)
- Social engineering attacks
- Physical access attacks
- Denial of Service (DoS) without demonstrated impact
- Issues requiring physical access to user devices

## Contact

For non-security issues, please use [GitHub Issues](https://github.com/iim0663418/DB-Card/issues).

## Known Residual Risks

### CIMD DNS Rebinding (Low-Medium)

**Status**: Accepted residual risk  
**Risk owner**: @iim0663418  
**Accepted**: 2026-10-26  
**Expiry**: 2027-04-26 (review required)

The CIMD client metadata resolver (`oauth-client-metadata.ts`) performs
server-side HTTPS fetch to arbitrary public hostnames. The `isValidCimdUrl`
guard rejects IP literals, localhost, credentials, custom ports, redirects,
and restricts paths to `/.well-known/mcp-client.json`, but cannot prevent
DNS rebinding — an attacker-controlled domain could resolve to a private IP
at fetch time.

**Current mitigations**:
- HTTPS required (TLS certificate must match hostname)
- `redirect: 'error'` prevents redirect pivot
- All IP literals rejected (IPv4 + IPv6)
- Exact path allowlist (`/.well-known/mcp-client.json` only)
- Content-Type: `application/json` required (exact prefix)
- Response body capped at 64 KB
- `client_id` self-referential validation required
- Rate limiting: 10 req/min/IP (fail-closed on DO failure)
- 1-hour KV cache reduces repeated fetch exposure

**Limitation**: Cloudflare Workers `fetch()` cannot pin to a pre-resolved IP.
Mitigating this fully requires Workers VPC + Cloudflare Gateway (Zero Trust),
which is not currently provisioned for this account.

**Impact**: Blind SSRF to public internet only (no private network reachable).
Attacker cannot exfiltrate response body directly. CVSS 3.1 ~5.8 Medium.

---

**Last Updated**: 2026-02-02  
**Version**: 1.0.0
