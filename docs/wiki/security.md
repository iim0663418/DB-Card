# 安全合規

## 安全掃描結果 (2026-05-23)

| 工具 | 結果 | 範圍 |
|------|------|------|
| npm audit | 0 vulnerabilities | 241 packages |
| OSV-Scanner | 0 issues | 241 packages |
| OWASP ZAP | A (51 PASS, 16 WARN, 0 FAIL) | Staging |

## OWASP ZAP 16 WARN 適用性聲明

| # | WARN 項目 | 處置 | 理由 |
|---|----------|------|------|
| 1 | CSP script-src unsafe-inline | 接受 | Nonce-based CSP 已保護 95%+ 瀏覽器，保留為舊瀏覽器向後相容 |
| 2 | CSP style-src unsafe-inline | 接受 | Tailwind CSS 需求；CSS 無法執行 JS；connect-src 白名單阻止資料外洩 |
| 3 | CSP Wildcard Directive | 誤報 | 掃描器將 nonce 誤判為 wildcard，實際為安全實作 |
| 4 | Timestamp Disclosure | 不適用 | API 功能需求（`/health`、audit logs），非敏感資訊 |
| 5 | Server Version Disclosure | 不可控 | Cloudflare Workers 平台預設行為，無法移除 |
| 6 | Cross-Domain JS Inclusion | 已緩解 | CDN 資源已實作 SRI (Subresource Integrity) 驗證 |
| 7 | Weak/Deprecated Cipher Suites | 不可控 | TLS 由 Cloudflare 邊緣管理，非應用層可配置 |
| 8 | Cookie Without SameSite | 已修復 | 所有 cookie 已設定 SameSite=Lax |
| 9 | Cookie Without Secure Flag | 已修復 | 所有 cookie 已設定 Secure（HTTPS only） |
| 10 | Missing Anti-clickjacking | 已修復 | X-Frame-Options: DENY 已實作 |
| 11 | X-Content-Type-Options Missing | 已修復 | nosniff 已實作於所有回應 |
| 12 | Strict-Transport-Security | 已修復 | HSTS max-age=31536000 已實作 |
| 13 | Permissions-Policy | 已實作 | geolocation=(), microphone=(), camera=() |
| 14 | Content-Type Header Missing | 接受 | 個別靜態資源，Cloudflare 自動推斷 MIME type |
| 15 | Private IP Disclosure | 不適用 | Cloudflare 內部路由資訊，非應用程式洩漏 |
| 16 | Information Disclosure in URL | 不適用 | OAuth state/session 為短暫 UUID（128-bit entropy, 60s TTL） |

**處置統計**：已修復 5 · 已緩解/接受 5 · 誤報 1 · 不適用 3 · 不可控 2

## 符合標準

- RFC 6749 (OAuth 2.0)
- RFC 7636 (PKCE)
- RFC 9700 (OAuth 2.0 Security BCP)
- RFC 8414 (AS Metadata)
- RFC 9728 (Protected Resource Metadata)
- RFC 7591 (Dynamic Client Registration)
- RFC 8707 (Resource Indicators)
- MCP Specification 2025-06-18
- OpenID Connect Core 1.0
- OWASP Top 10 2021
- GDPR Article 7, 12, 13, 15, 20, 30
- ISO/IEC 18974:2023 (OpenChain Security Assurance)

## 安全架構

- **信封加密**: 每張名片獨立 DEK，KEK 定期輪換
- **OIDC 認證**: PKCE + State + Nonce
- **審計日誌**: 完整記錄所有存取，IP 匿名化
- **HttpOnly Cookies**: XSS 防護
- **CSRF Token**: HTTP Header 模式
- **Rate Limiting**: Durable Objects 原子限速
- **CSP**: Nonce-based + 嚴格域名白名單

## 漏洞回報

- **管道**: [GitHub Security Advisories](https://github.com/iim0663418/DB-Card/security/advisories/new)
- **回應時間**: 48 小時內
- **修復承諾**: 高/嚴重漏洞 30 天內修復
- **掃描頻率**: 每次提交（npm audit + OSV-Scanner）
