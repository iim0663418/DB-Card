# DB-Card v4.0 文檔

## 文檔結構

### 產品需求文檔 (PRD)
- [前端遷移 PRD](FRONTEND-MIGRATION-PRD.md) - v4.0 前端架構遷移計劃
- [名片顯示頁 PRD](CARD-DISPLAY-PAGE-PRD.md) - 名片顯示頁面需求
- [NFC 生成器 PRD](NFC-GENERATOR-PRD.md) - NFC 名片生成器需求
- [NFC 生成器歷史設計](NFC-GENERATOR-HISTORY-DESIGN.md) - 歷史記錄功能設計

### 設計雛形
- [Admin Dashboard 設計雛形](v4.0.0_Admin%20Dashboard%20管理主控台設計雛形.html)
- [NFC 生成器管理介面](v4.0NFC%20名片生成器管理介面.html)
- [名片顯示設計](v4.0名片顯示設計.html)

### 安全評估
- [Admin Token 安全評估](SECURITY-ASSESSMENT-ADMIN-TOKEN.md) - HttpOnly Cookie 安全分析

### 架構決策記錄 (ADR)
- [ADR-001: 隱私優先設計原則](adr/001-privacy-first.md)
- [ADR-002: 信封加密架構](adr/002-security-architecture.md)

### API 文檔
- [NFC Tap API](api/nfc-tap.md) - POST /api/nfc/tap
- [Read API](api/read.md) - GET /api/read
- [Admin APIs](api/admin-apis.md) - 管理後台 API

## v3.X 文檔

v3.X 相關文檔已封存至 `../archive/v3-docs/`，包含：
- PWA 架構文檔
- 翻譯系統實作報告
- 安全實作報告
- 測試報告與指南
- 部署指南
- API 參考文檔

## 貢獻指南

撰寫文檔時請遵循：
1. 使用 Markdown 格式
2. ADR 遵循 [MADR](https://adr.github.io/madr/) 格式
3. API 文檔包含請求/回應範例
4. 保持文檔與代碼同步更新
