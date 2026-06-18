# Dark Mode Adaptation

## Status: Draft
## Priority: High
## Depends-on: frontend-design-system-refactor.md (Phase 1 tokens ✅ 已完成)
## Scope: 所有前端頁面暗色模式適配

---

## 背景

Phase 1 設計系統重構已建立 tokens.css dark mode 區塊（`@media (prefers-color-scheme: dark)`），覆蓋核心語義 token。但因 **cascade 層級錯位**，暗色模式下呈現「白色底上浮著暗色方塊」的反差問題。

### 根因分析

**載入順序**：tokens.css → base.css → tailwind.css → v4-design.css → components.css

**故障機制**：
1. `base.css`（@layer base）：`body { background-color: var(--color-surface) }` — 引用 token ✅
2. `v4-design.css`（**無 layer**）：`body { background-color: #f4f7f9 }` — 硬編碼白色 ❌
3. 無 layer CSS 優先級 > 所有 @layer 內的 CSS → **body 背景永遠白色，dark token 無效**
4. 但 `components.css`（@layer components）的 glass 元件引用 `var(--glass-bg)` → dark mode 切為 `rgba(30,30,50,0.6)` → 暗色方塊正確響應了 dark
5. **結果**：body 不動（白）+ glass 元件變暗 = 白底上浮著暗色方塊

**核心矛盾**：v4-design.css 不在 layer 系統內，其 body 定義壓制了 base.css 的 token 引用。

### 現況量化

| 層級 | 問題數 | 說明 |
|------|--------|------|
| v4-design.css body 硬編碼 | 根因 | 無 layer，壓制 base.css token → body 不響應 dark |
| tokens.css dark 區塊 | 5 缺失 | primary-border, glass-shadow-hover, shadow-sm/xl, crystal-bg |
| components.css | 12 元件 | 硬編碼 `white` / `#e2e8f0` / `#f1f5f9` 背景（dark 下仍白） |
| HTML bg-white/bg-gray-* | 217 處 | admin(100) + user-portal(95) + card-display(14) + index(5) + qr(3) |

---

## 設計決策

### D1: 採用 `@media (prefers-color-scheme: dark)` + Token 覆蓋策略

**不用** `light-dark()` 函數 — 原因：
- 規格原建議用 `light-dark()`，但 Tailwind v4 的 dark mode 機制與 `prefers-color-scheme` media query 整合
- 現有 tokens.css 已建立 media query 覆蓋架構，切換成本高
- `light-dark()` 瀏覽器支援尚在擴展中

**策略**：Token 層用 media query 覆蓋 → 元件層引用 token（無條件 dark 適配）→ HTML 層用 Tailwind `dark:` utilities

### D2: Tailwind v4 dark mode 配置

Tailwind v4 預設 `darkMode: 'media'`（跟隨 prefers-color-scheme），不需額外配置。HTML 中可直接使用 `dark:bg-gray-900` 等 utilities。

### D3: v4-design.css 處理策略

**Phase 3（本規格）不動 v4-design.css**。card-display.html 專用的 3D card / perspective 樣式保留原位，暗色適配在 card-display.html 的 `<style>` 區塊處理。

理由：v4-design.css 職責已收斂為 card-display 專用視覺效果（3D flip、floating animation、desktop 物理效果），不再是通用元件庫。完全移除需確認 card-display 所有視覺無迴歸，風險高，應獨立規格處理。

### D4: 暗色表面色策略

| 表面層級 | Light | Dark | 用途 |
|----------|-------|------|------|
| Base | `--color-surface` #f8fafd | #121218 | body 背景 |
| Raised | `--color-surface-alt` #f4f7f9 | #1a1a24 | card、section 背景 |
| Elevated | (new) `--color-surface-elevated` | white → #222230 | modal、notification、dropdown |
| Glass | `--glass-bg` rgba(255,255,255,0.1) | rgba(30,30,50,0.6) | glassmorphism 面板 |

### D5: 暗色模式文字對比

| Token | Light | Dark | Contrast (dark on dark-surface) |
|-------|-------|------|------|
| `--color-text` | #1e1e3f | #e8e8f0 | ≥ 12:1 ✅ |
| `--color-text-secondary` | #64748b | #a1a1b5 | ≥ 5:1 ✅ |
| `--color-text-muted` | #94a3b8 | #6b6b80 | ≥ 3:1 (decorative) |

### D6: Feedback 色在暗底上的調整

暗色背景上，feedback 色的 background 需提高 alpha：

| Token | Light | Dark |
|-------|-------|------|
| `--color-success-bg` | rgba(16,185,129,0.1) | rgba(16,185,129,0.15) |
| `--color-warning-bg` | rgba(245,158,11,0.1) | rgba(245,158,11,0.15) |
| `--color-error-bg` | rgba(239,68,68,0.1) | rgba(239,68,68,0.15) |
| `--color-info-bg` | rgba(59,130,246,0.1) | rgba(59,130,246,0.15) |

---

## Feature: Token Layer 補齊

### Scenario: 缺失的 dark token 完整覆蓋

**Given** tokens.css 的 `@media (prefers-color-scheme: dark)` 區塊  
**When** 暗色模式啟用  
**Then** 以下 token 有正確的暗色值：

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* 既有（確認保留） */
    --color-text: #e8e8f0;
    --color-text-secondary: #a1a1b5;
    --color-text-muted: #6b6b80;
    --color-surface: #121218;
    --color-surface-alt: #1a1a24;
    --color-border: rgba(255, 255, 255, 0.08);
    --color-primary: oklch(0.68 0.10 280);
    --color-primary-hover: oklch(0.74 0.08 280);
    --color-primary-ghost: oklch(0.68 0.10 280 / 0.12);
    --color-primary-glow: oklch(0.68 0.10 280 / 0.2);
    --glass-bg: rgba(30, 30, 50, 0.6);
    --glass-bg-hover: rgba(30, 30, 50, 0.7);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25);

    /* 新增 — 缺失補齊 */
    --color-primary-border: oklch(0.68 0.10 280 / 0.3);
    --color-surface-elevated: #222230;
    --glass-shadow-hover: 0 12px 48px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
    --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3);
    --crystal-bg: rgba(30, 30, 50, 0.5);

    /* Feedback backgrounds — 暗底加強 */
    --color-success-bg: rgba(16, 185, 129, 0.15);
    --color-warning-bg: rgba(245, 158, 11, 0.15);
    --color-error-bg: rgba(239, 68, 68, 0.15);
    --color-info-bg: rgba(59, 130, 246, 0.15);
  }
}
```

---

## Feature: Component Layer 暗色適配

### Scenario: 元件背景改用 token 或 dark 覆蓋

**Given** components.css 中有硬編碼 light-only 背景  
**When** 元件渲染在暗色模式  
**Then** 以下元件使用正確的暗色表面：

| 元件 | Light 值 | 改為 |
|------|----------|------|
| `.notification` | `background: white` | `background: var(--color-surface-elevated)` |
| `.error-message` | `background: white` | `background: var(--color-surface-elevated)` |
| `.modal-content` | `rgba(255,255,255,0.98)` | `background: var(--color-surface-elevated)` + `backdrop-filter: blur(20px)` |
| `.loading-overlay` | `rgba(255,255,255,0.8)` | `background: rgba(18, 18, 24, 0.8)` via token |
| `.social-node` | `rgba(255,255,255,0.8)` | `background: var(--glass-bg)` |
| `.bilingual-field` | `#e2e8f0` | `background: var(--color-border)` |
| `.bilingual-field input` | `#fff` | `background: var(--color-surface-alt)` |
| `.skeleton` | `#f1f5f9/#e2e8f0` gradient | 暗色用 `#1a1a24`/`#222230` gradient |
| `.btn-google` | `white` + `#dadce0` | `var(--color-surface-elevated)` + `var(--color-border)` |

### Scenario: Badge 系統暗色適配

**Given** badge 使用硬編碼淺色背景  
**When** 暗色模式啟用  
**Then** badge 背景使用半透明版本（保留在任何表面上可見）：

```css
@media (prefers-color-scheme: dark) {
  .badge-personal  { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
  .badge-event     { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
  .badge-sensitive { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
  .badge-bound     { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
  .badge-revoked   { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
  .badge-active    { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
  .badge-suspended { background: rgba(251, 146, 60, 0.2); color: #fdba74; }
}
```

### Scenario: Notification 色彩在暗色下可見

**Given** notification 的 `color` 值是 feedback 色  
**When** 暗色模式背景變為 `--color-surface-elevated`  
**Then** 文字對比度仍 ≥ 4.5:1（feedback 色在暗底上 L 已夠高，可保留）

---

## Feature: card-display.html 暗色適配

### Scenario: 名片卡面在暗色下的表現

**Given** `.card-face` 目前用白色 gradient 背景 + 白邊框  
**When** 暗色模式啟用  
**Then**：
- `.card-face` background 切為暗色 gradient：`linear-gradient(135deg, rgba(30,30,50,0.8), rgba(30,30,50,0.6))`
- Desktop `.card-face` border 從 `8px solid #fff` 改為 `8px solid rgba(255,255,255,0.1)`
- `.card-face::before` ambient glow 不需調整（已用 `--color-primary-ghost` token）
- `.card-face` box-shadow inner highlight 從 `rgba(255,255,255,0.5)` 改為 `rgba(255,255,255,0.05)`

---

## Feature: HTML Tailwind Utilities 暗色適配

### Scenario: 頁面級 `bg-white` / `bg-gray-*` 替換策略

**Given** 217 處硬編碼背景色  
**When** 需要暗色支援  
**Then** 分三類處理：

| 類別 | 策略 | 範例 |
|------|------|------|
| 主容器背景 | 用 token utility `bg-surface` | `<main class="bg-white">` → `<main class="bg-[var(--color-surface)]">` |
| Card/Panel 背景 | 加 `dark:bg-gray-900` 或用 glass class | `bg-white rounded-xl` → `bg-white dark:bg-gray-900 rounded-xl` |
| Input/Form 背景 | 加 `dark:bg-gray-800` | `bg-white border` → `bg-white dark:bg-gray-800 border dark:border-gray-700` |

**優先順序**：
1. 能用 token utility（`bg-[var(...)]`）的用 token — 自動響應 dark
2. 不能的加 `dark:` prefix — 明確覆蓋
3. 已有 glass-card class 的不需處理 — token 已覆蓋

---

## 實作分期

### Phase 0 — 修正根因：v4-design.css body 硬編碼（P0，立即）
- 移除 v4-design.css 中的 `body { background-color: #f4f7f9; ... }` 定義
- base.css 已有 `body { background-color: var(--color-surface) }` — 移除後 token 自然生效
- 或者：在 v4-design.css 的 body rule 中改為 `background-color: var(--color-surface)`
- **驗證**：dark mode 下 body 背景應從白色變為 `#121218`，暗色方塊消失

### Phase 3a — Token 補齊（低風險，全自動覆蓋）
- 在 tokens.css dark 區塊加入缺失的 5 個 token + 新增 `--color-surface-elevated`
- 在 `:root`（light）加入 `--color-surface-elevated: white`
- 預期影響：0 — 僅補齊 dark fallback

### Phase 3b — components.css 暗色適配
- 將硬編碼背景改為 token 引用（自動響應 dark）
- 加入 `@media (prefers-color-scheme: dark)` 區塊處理無法用 token 解決的樣式
- badge 系統暗色覆蓋
- 預期影響：中 — 需逐元件視覺驗證

### Phase 3c — card-display 暗色適配
- card-display.html 內 `<style>` 的 dark media query 擴充
- v4-design.css 中 `.card-face` 的 dark 覆蓋
- 預期影響：中 — 名片視覺變化最大

### Phase 3d — HTML Tailwind 暗色（分頁面）
- index.html（5 處 — 最少）
- qr-quick.html（3 處）
- card-display.html（14 處）
- user-portal.html（95 處）
- admin-dashboard.html（100 處）
- 預期影響：高 — 量大，逐頁進行

---

## 驗收標準

1. macOS Settings → Appearance → Dark：所有頁面無白色區塊閃現
2. 文字對比度：主文字 ≥ 7:1，次文字 ≥ 4.5:1（WCAG AA）
3. 品牌色辨識度：暗色下 primary 仍可見且不刺眼
4. Glass 效果：暗色下仍有深度感（不坍塌為純色）
5. Badge/Notification/Error：在暗色下仍清晰可辨
6. `grep -r "background: white\|background-color: white" public/css/` 返回 0（components.css 內）
7. Lighthouse Accessibility ≥ 95（暗色模式下）

---

## Anti-Patterns（禁止）

| ❌ | 原因 |
|----|------|
| 在 components.css 中用 `@media (prefers-color-scheme: dark)` 重寫整個元件 | 應改用 token 引用讓一套規則適用兩種模式 |
| Dark mode 只改背景不改 text/border | 造成對比度問題 |
| 用 `!important` 強制暗色值 | 破壞 cascade layer 架構 |
| 暗色下所有表面用同一色 | 失去層級感（elevated > surface > base） |
| 硬編碼 `#121218` 在元件中 | 應引用 `var(--color-surface)` |
