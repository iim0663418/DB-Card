# DB-Card

安全預設 NFC 數位名片系統 — 隱私優先 · OIDC 認證 · GDPR 合規 · MCP 介面

[![Security: A](https://img.shields.io/badge/OWASP_ZAP-A-brightgreen)](docs/wiki/security.md)
[![Vulnerabilities: 0](https://img.shields.io/badge/npm_audit-0_vulnerabilities-brightgreen)](#安全)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Version: 5.2.0](https://img.shields.io/badge/version-5.2.0-purple)]()

## 功能

- **NFC 數位名片** — 觸碰即開、24h 授權會話、即時撤銷
- **收到的名片管理** — 多模態 AI 辨識（Gemini）、智慧壓縮、冪等上傳
- **自建名片 OCR** — 拍照自動填入、Provenance 標記（可見/翻譯/推測）
- **MCP AI Agent 介面** — 7 個 Tools、OAuth 2.1 + PKCE、結構化搜尋
- **信封加密** — 每張名片獨立 DEK、KEK 定期輪換
- **GDPR 合規** — 分層揭露、撤回機制、資料可攜權

## 快速開始

```bash
git clone https://github.com/iim0663418/DB-Card.git
cd DB-Card/workers
npm install
cp .dev.vars.example .dev.vars   # 編輯環境變數
npm run dev                       # http://localhost:8787
```

> 完整部署指南見 [docs/wiki/deployment.md](docs/wiki/deployment.md)

## MCP 連接

讓 AI 助手直接查詢、管理你收到的名片：

**claude.ai** — 🔌 Integrations → Add custom integration → 貼上 URL

**Claude Desktop** — Settings → Connectors → Add custom connector

```
https://db-card.sfan-tech.com/mcp
```

首次連線會開啟 Google 登入授權，完成後即可使用。

## 架構

```
Cloudflare Workers (全球邊緣)
├── D1 Database (SQLite 分散式)
├── Durable Objects (Rate Limiting)
├── R2 Bucket (名片圖片)
├── KV (Session Cache)
└── Cloudflare CDN + WAF
```

**技術棧**: TypeScript · Cloudflare Workers · D1 · Vite · Tailwind CSS · Gemini AI

## 安全

通過三項安全掃描（2026-05-23）：

| 工具 | 結果 |
|------|------|
| OWASP ZAP | **A** — 51 PASS, 16 WARN, 0 FAIL |
| npm audit | **0** vulnerabilities (241 packages) |
| OSV-Scanner | **0** issues (241 packages) |

9 個安全標頭完整實作（CSP with nonce、HSTS、COEP/COOP/CORP 等）。

> 16 WARN 適用性聲明及完整安全分析見 [docs/wiki/security.md](docs/wiki/security.md)

## 測試

```bash
npm test             # 56 tests (Vitest 4 + Cloudflare Workers Pool)
npm run typecheck    # TypeScript 嚴格模式
```

## 文檔

| 文檔 | 說明 |
|------|------|
| [部署指南](docs/wiki/deployment.md) | 環境設定、D1、Secrets、部署流程 |
| [API 參考](docs/wiki/api-reference.md) | 所有端點、OIDC 流程 |
| [安全合規](docs/wiki/security.md) | 掃描結果、適用性聲明、符合標準 |
| [ADR](docs/adr/) | 架構決策記錄 |
| [BDD 規格](.specify/specs/) | 功能規格（Gherkin） |

## 版本歷程

| 版本 | 日期 | 重點 |
|------|------|------|
| v5.2.0 | 2026-04 | MCP 介面 + OAuth 2.1 |
| v5.1.0 | 2026-04 | 自建名片 OCR 掃描 |
| v5.0.x | 2026-02 | 收到的名片管理系統 |
| v4.6.0 | 2026-01 | OIDC 安全優化 + GDPR |

## 貢獻

1. Fork → 功能分支 → BDD 規格 → 實作 → PR
2. 規格位於 `.specify/specs/`
3. Commit 格式：`feat:` / `fix:` / `chore:` / `docs:`

## 授權

[Apache License 2.0](LICENSE) — 所有依賴均為開源授權，詳見 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)
