# Spec: Frontend Vite Full Build Migration

## Context
DB-Card 前端目前是 5 個獨立 HTML MPA，JS 以 `<script src>` 直接載入（未打包、未 minify）。
Vite 7.3.1 已安裝但僅用於 icon tree-shaking（`src/icons.js` → `public/dist/`）。

本 spec 將前端全面納入 Vite build pipeline：
- 所有 JS 經 Vite bundle（code splitting + tree-shaking + minify）
- Three.js 改為 dynamic import（或移除）
- CSS pipeline 統一（移除獨立 `@tailwindcss/cli` 步驟）
- 產物帶 content hash，支援 CDN long-term cache

### 現有頁面 JS 依賴圖

```
index.html
├── /js/config.js (module)
└── /js/page-init.js

user-portal.html
├── /js/api-client.js
├── /js/error-policy.js
├── /js/feature-api.js
├── /js/received-cards.js
├── /js/search-orchestrator.js
├── /js/social-link-integration.js
├── /js/social-link-validation.js
└── /js/user-portal-init.js

admin-dashboard.html
├── /js/config.js
├── /js/admin-dashboard.js
├── /js/social-link-integration.js
└── /js/social-link-validation.js

card-display.html
├── /js/main.js (module)
└── /js/web-vitals-minimal.js

qr-quick.html
└── qrious (external CDN → 改為本地)
```

### 共用模組（將成為 shared chunk）
- config.js — 版本、環境
- api-client.js — 底層 fetch wrapper
- error-policy.js — 錯誤處理策略
- feature-api.js — 高階 API 呼叫
- social-link-validation.js — 社群連結驗證
- social-link-integration.js — 社群連結 UI

## Impacted Modules
- **Modified**: `vite.config.js` → `vite.config.ts`（ESM + TypeScript）
- **New**: `src/entries/index.ts` — index.html entry
- **New**: `src/entries/user-portal.ts` — user-portal entry
- **New**: `src/entries/admin.ts` — admin-dashboard entry
- **New**: `src/entries/card-display.ts` — card-display entry
- **New**: `src/entries/qr-quick.ts` — qr-quick entry
- **Modified**: 5 HTML files（`<script>` tags → Vite entry `<script type="module">`）
- **Modified**: `package.json` scripts（統一 build 命令）
- **Removed**: 獨立 `npm run build:css` 步驟（CSS 進 Vite pipeline）

## Scenarios

### Scenario 1: Vite config 改為 MPA multi-entry
```
Given vite.config.ts 定義 5 個 HTML entry points
When `npm run build` 執行
Then 產出 `dist/` 目錄包含：
  - 每個 entry 的 bundled JS（hashed filename）
  - 共用模組自動抽取為 shared chunk
  - CSS 產物（Tailwind 由 Vite PostCSS plugin 處理）
  - .vite/manifest.json 列出所有產物映射
And icons entry 保留（合併進 MPA 設定）
And sourcemap 產出
```

### Scenario 2: HTML entry point 改造（以 user-portal.html 為例）
```
Given user-portal.html 原本有 8 個 <script src="/js/..."> 標籤
When 改為 Vite entry 模式
Then HTML 中只保留一個 entry：
  <script type="module" src="/src/entries/user-portal.ts"></script>
And user-portal.ts 內部 import 所有需要的模組：
  import '../js/api-client'
  import '../js/error-policy'
  import '../js/feature-api'
  import '../js/received-cards'
  ...
And Vite 自動 bundle + code split
And 開發模式 `npm run dev:frontend` 可即時 HMR
```

### Scenario 3: Three.js 改為 dynamic import
```
Given Three.js (589KB) 目前在 index.html 和 user-portal.html 同步載入
When 改為 dynamic import
Then entry 中用：
  if (document.getElementById('three-canvas')) {
    import('/vendor/three.min.js').then(initParticles);
  }
And Three.js 只在有 canvas 元素的頁面按需載入
And 不計入 initial bundle size
And 頁面 LCP 不被 Three.js 阻塞
```

### Scenario 4: CSS 統一進 Vite pipeline
```
Given 目前 CSS 由獨立 `@tailwindcss/cli` 指令產出
When CSS 改由 Vite 處理
Then tailwind-input.css 作為 entry CSS import：
  // src/entries/index.ts
  import '../../public/css/tailwind-input.css'
And Vite 的 PostCSS plugin 自動處理 Tailwind
And 產出 minified CSS with hash
And 移除 package.json 的 build:css script（或保留為 legacy fallback）
And npm run dev:frontend 支援 CSS HMR
```

### Scenario 5: Vendor 本地化 — qrious
```
Given qr-quick.html 引用外部 CDN：
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js">
When 改為本地 + Vite import
Then 安裝 qrious 為 dependency 或放入 vendor/
And qr-quick.ts entry 用 import 引入
And 移除外部 CDN 引用（消除第三方請求）
```

### Scenario 6: 開發模式
```
Given 開發者跑 `npm run dev:frontend`
When Vite dev server 啟動
Then 監聽 http://localhost:5173（或可設定 port）
And 所有 HTML pages 可直接存取
And JS/CSS 修改即時 HMR（不需全頁重載）
And 同時需 Workers dev server（wrangler dev）處理 API
Note: 可考慮 Vite proxy 設定將 /api/* 轉發給 wrangler
```

### Scenario 7: Production build 輸出
```
Given `npm run build` 完成
When 檢查 dist/ 目錄
Then 結構如下：
  dist/
  ├── index.html
  ├── user-portal.html
  ├── admin-dashboard.html
  ├── card-display.html
  ├── qr-quick.html
  ├── assets/
  │   ├── index-[hash].js
  │   ├── user-portal-[hash].js
  │   ├── admin-[hash].js
  │   ├── card-display-[hash].js
  │   ├── qr-quick-[hash].js
  │   ├── shared-[hash].js     (共用 chunk)
  │   ├── icons-[hash].js
  │   ├── index-[hash].css
  │   └── ...
  ├── images/                   (copied from public)
  ├── icons/
  ├── vendor/                   (Three.js etc — lazy loaded)
  └── .vite/manifest.json
And 所有 JS 已 minify + tree-shake
And 所有 CSS 已 minify
And HTML 中的 <script>/<link> 已自動替換為 hashed 路徑
```

### Scenario 8: Wrangler 部署整合
```
Given Cloudflare Workers 從 public/ 服務靜態檔案
When 遷移後改為從 dist/ 服務
Then wrangler.toml assets 設定指向 dist/（或 build 後 copy 回 public/）
And deploy:staging 流程改為：
  npm run build → npm run deploy:staging
And production 同理
```

### Scenario 9: 向後相容 — 漸進遷移
```
Given 不可能一次改完 5 個頁面
When 採用漸進遷移策略
Then 第一波遷移 index.html（最簡單，只有 2 個 JS）
And 驗證後再遷移 card-display.html（次簡單）
And 最後遷移 user-portal + admin-dashboard（最複雜，多依賴）
And 遷移期間未遷移頁面仍用原本的 <script src> 方式
And Vite config 中 HTML entry 逐步增加
```

### Scenario 10: manifest-loader.js 退場
```
Given 目前 manifest-loader.js 手動讀 hash 載入 icon bundle
When icons entry 合併進 Vite MPA build
Then manifest-loader.js 不再需要
And icons 直接作為 entry 的 import：
  // 每頁 entry 中
  import '../icons'  // or dynamic: import('./icons') for non-critical pages
And 移除所有頁面的 <script src="/js/manifest-loader.js">
```

## Validation Target
- `npm run build` 成功產出 dist/
- 所有 5 頁在本地 preview（`npm run preview`）功能正常
- Bundle size 比較：
  - Before: ~600KB JS (unminified) + 1.3MB vendor (all pages load all)
  - After: 每頁只載入需要的 JS（估計首頁 <50KB，portal ~150KB minified）
- Lighthouse Performance score ≥ 90（首頁）
- 既有功能不迴歸（手動 smoke test 全 5 頁）

## Technical Notes

### vite.config.ts 骨架
```typescript
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'  // Tailwind v4 Vite plugin

export default defineConfig({
  root: '.',  // project root = workers/
  build: {
    outDir: 'dist',
    manifest: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'public/index.html'),
        'user-portal': resolve(__dirname, 'public/user-portal.html'),
        admin: resolve(__dirname, 'public/admin-dashboard.html'),
        'card-display': resolve(__dirname, 'public/card-display.html'),
        'qr-quick': resolve(__dirname, 'public/qr-quick.html'),
      },
    },
    sourcemap: true,
  },
  plugins: [tailwindcss()],
  publicDir: 'public',  // static assets (images, icons, vendor)
})
```

### 遷移順序
1. index.html（2 個 JS，最簡單，驗證 pipeline）
2. card-display.html（1 個 module JS，已是 type="module"）
3. qr-quick.html（1 個外部 CDN → 本地化）
4. admin-dashboard.html（4 個 JS，中等）
5. user-portal.html（8 個 JS，最複雜）

### 已知限制
- Vite 7 已 deprecate `rollupOptions`，改用 `rolldownOptions`（但 7.3.1 兩者都支援）
- Tailwind v4 有官方 Vite plugin `@tailwindcss/vite`（需安裝）
- 現有 JS 不是 ES module（需加 export/import 或用 IIFE 相容模式）
- Three.js r128 不支援 ES module import（保留 vendor/ 用 dynamic import URL）
- wrangler.toml 的 [site] 或 assets 設定需指向新 output dir

### 不做的事
- 不遷移到 SPA / 不加前端路由
- 不引入 React/Vue/Svelte
- 不重寫業務邏輯（只包裝 import/export）
- 不在此 spec 處理 TypeScript 遷移（Phase C）
- 不在此 spec 處理 design token 收斂（Phase B）
