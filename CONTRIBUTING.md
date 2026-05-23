# 貢獻指南

感謝你對 DB-Card 的興趣！

## 開發流程

1. Fork 本專案
2. 建立功能分支：`git checkout -b feat/your-feature`
3. 撰寫 BDD 規格（`.specify/specs/`）
4. 實作功能
5. 確認通過：`npm run typecheck && npm test`
6. 提交 PR 到 `main`

## Commit 格式

```
feat: 新功能
fix: 修復 bug
chore: 維護工作（依賴升級、CI 等）
docs: 文檔更新
refactor: 重構（不改變行為）
test: 測試相關
```

## 程式碼規範

- TypeScript 嚴格模式
- ESLint 規則遵循 `workers/eslint.config.js`
- 所有 SQL 使用 parameterized queries
- 安全敏感程式碼需附帶 BDD 規格

## 測試

```bash
cd workers
npm test          # Vitest 4 + Cloudflare Workers Pool
npm run typecheck # TypeScript 檢查
npm audit         # 依賴安全掃描
```

## 安全漏洞

請勿在 Issue 中公開安全漏洞。請使用 [GitHub Security Advisories](https://github.com/iim0663418/DB-Card/security/advisories/new) 回報。
