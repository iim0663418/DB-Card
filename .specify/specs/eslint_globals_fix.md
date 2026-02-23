# BDD Spec: ESLint Globals Configuration Fix

## Scenario: Add Missing Global Types
**Given**: ESLint 配置缺少 Cloudflare Workers 和 Web API 全域類型
**When**: ESLint 掃描 TypeScript 和 JavaScript 檔案
**Then**: 
  - 所有 Cloudflare Workers 類型被識別 (Request, Response, Headers, ExecutionContext, D1Database, KVNamespace, R2Bucket, DurableObjectNamespace, Fetcher, ScheduledEvent, AbortSignal, DurableObjectStub)
  - 所有 Web API 類型被識別 (URL, TextEncoder, TextDecoder, CryptoKey, File, FileReader, Image, AbortController, PerformanceObserver, QRCode, HeadersInit)
  - 所有 no-undef 錯誤消失

## Technical Requirements
1. 在 eslint.config.js 的 globals 區塊新增：
   - Cloudflare Workers Runtime API
   - Web Crypto API
   - Web File API
   - Web Performance API
   - 第三方函式庫 (QRCode)

2. 保留現有的 globals 設定

## Acceptance Criteria
- ✅ `npm run lint` 的 no-undef 錯誤從 475 降至接近 0
- ✅ 保留有意義的 warnings (unused vars)
- ✅ 不影響現有的 lint rules
