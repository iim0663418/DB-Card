# Frontend Design System Refactor

## Status: Draft
## Priority: High
## Scope: 全部前端 HTML/CSS（index.html, user-portal.html, card-display.html, admin-dashboard.html, qr-quick.html）

---

## 背景

現有前端缺乏統一的設計系統基礎。5 個 HTML 頁面各自定義 `:root` 變數、inline styles、重複的 glassmorphism class。
品牌色 `#6868ac` 硬寫在至少 20+ 處。無 Dark Mode、無 fluid typography、無 motion tokens。

## 設計原則（from skill: frontend-design-system）

1. **刪減即設計** — 統一為一份 tokens 檔，刪除所有重複定義
2. **清晰度 > 裝飾** — typography hierarchy + spacing 優先
3. **主題一致性** — 從首頁到名片顯示有統一視覺語氣
4. **無障礙即核心路徑** — contrast-color 確保對比、reduced-motion 全域處理

---

## Feature: Design Tokens Architecture

### Scenario: 統一的 CSS Custom Properties 基礎層

**Given** 一個新的 `tokens.css` 檔案  
**When** 所有頁面引入此檔  
**Then** 品牌色、語義色、間距、字級、圓角、陰影、動效 duration 均從 tokens 取值  
**And** 不再有 inline hex/rgba 硬寫（除 tokens.css 定義處外）

#### Token 結構（三層）

```
Primitive (tokens.css)     →  Semantic (tokens.css)      →  Component (v4-design.css)
────────────────────────────────────────────────────────────────────────────────────────
--color-moda-500           →  --color-primary            →  .glass-card background
--space-100 (8px)          →  --space-inline-md          →  .info-chip padding
--text-base (clamp)        →  --text-body                →  body font-size
```

---

## Feature: OKLCH Color System

### Scenario: 品牌色階完整定義

**Given** 品牌色 #6868ac 轉換為 OKLCH  
**When** 定義 50–950 色階  
**Then** 所有衍生色（hover、glow、border）使用 relative color syntax 從 primary 推導

```css
:root {
  /* Primitive — OKLCH */
  --color-moda-50:  oklch(0.96 0.02 280);
  --color-moda-100: oklch(0.92 0.04 280);
  --color-moda-200: oklch(0.84 0.07 280);
  --color-moda-300: oklch(0.74 0.10 280);
  --color-moda-400: oklch(0.64 0.12 280);
  --color-moda-500: oklch(0.54 0.11 280);  /* ≈ #6868ac */
  --color-moda-600: oklch(0.46 0.10 280);
  --color-moda-700: oklch(0.38 0.09 280);
  --color-moda-800: oklch(0.30 0.07 280);
  --color-moda-900: oklch(0.22 0.05 280);

  /* Semantic */
  --color-primary: var(--color-moda-500);
  --color-primary-hover: var(--color-moda-600);
  --color-primary-ghost: oklch(from var(--color-primary) l c h / 0.1);
  --color-primary-glow: oklch(from var(--color-primary) l c h / 0.2);

  /* Neutral */
  --color-text: oklch(0.20 0.02 280);
  --color-text-secondary: oklch(0.40 0.01 280);
  --color-surface: oklch(0.99 0.005 280);
  --color-border: oklch(0 0 0 / 0.08);

  /* Feedback */
  --color-success: oklch(0.60 0.15 155);
  --color-warning: oklch(0.70 0.15 75);
  --color-error: oklch(0.55 0.18 25);
  --color-info: oklch(0.58 0.14 240);
}
```

### Scenario: Dark Mode 支援

**Given** `color-scheme: light dark` 在 `:root`  
**When** 系統切換為深色模式  
**Then** 所有語義 token 自動切換為深色值

```css
:root {
  color-scheme: light dark;
  --color-text: light-dark(oklch(0.20 0.02 280), oklch(0.93 0.01 280));
  --color-surface: light-dark(oklch(0.99 0.005 280), oklch(0.15 0.02 280));
  --color-primary: light-dark(oklch(0.54 0.11 280), oklch(0.68 0.10 280));
}
```

---

## Feature: Spacing System (8pt Grid)

### Scenario: 統一間距 tokens

```css
:root {
  --space-025: 2px;
  --space-050: 4px;
  --space-100: 8px;
  --space-150: 12px;
  --space-200: 16px;
  --space-300: 24px;
  --space-400: 32px;
  --space-500: 40px;
  --space-600: 48px;
  --space-800: 64px;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}
```

---

## Feature: Fluid Typography

### Scenario: 響應式字級無斷點

```css
:root {
  --text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm:   clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem + 0.6vw, 1.375rem);
  --text-xl:   clamp(1.25rem, 1rem + 1.2vw, 1.75rem);
  --text-2xl:  clamp(1.5rem, 1rem + 2vw, 2.5rem);
  --text-3xl:  clamp(2rem, 1.2rem + 3vw, 3.5rem);
}
```

---

## Feature: Cascade Layers

### Scenario: 消除 !important，建立明確覆蓋順序

```css
@layer reset, tokens, base, components, utilities, overrides;
```

**Given** `v4-design.css` 所有 class 在 `@layer components`  
**And** Tailwind output 在 `@layer utilities`  
**When** `.bg-moda` 等覆蓋類不再使用 `!important`  
**Then** specificity 由 layer 順序解決

---

## Feature: Motion Tokens + Accessibility

### Scenario: 統一動效 + prefers-reduced-motion

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-emphasis: 800ms;
  --ease-default: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
    --duration-emphasis: 0ms;
  }
}
```

**Given** 所有 `transition` / `animation` 引用 `var(--duration-*)`  
**When** 使用者啟用 reduced-motion  
**Then** 所有動畫即時完成，不干擾功能

---

## Feature: Component Consolidation

### Scenario: Glassmorphism 元件統一

**Given** 現有 3 種 class 混用：`glass-card`, `crystal-container`, `glass-panel`  
**When** 統一為語義化的元件 class  
**Then** 只保留：

| Class | 用途 |
|-------|------|
| `.surface-glass` | 通用 glassmorphism 面板（cards, panels） |
| `.surface-solid` | 不透明面板（modals, dropdowns） |
| `.surface-elevated` | 浮動元素（notifications, tooltips） |

所有三者共用 `--glass-blur`, `--glass-saturation`, `--glass-bg-opacity` tokens。

---

## Feature: Elevation System

### Scenario: 統一陰影層級

```css
:root {
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
  --shadow-md: 0 4px 16px oklch(from var(--color-primary) l c h / 0.08),
               0 1px 4px oklch(0 0 0 / 0.04);
  --shadow-lg: 0 8px 32px oklch(from var(--color-primary) l c h / 0.12),
               0 2px 8px oklch(0 0 0 / 0.04);
  --shadow-xl: 0 20px 60px oklch(0 0 0 / 0.15),
               0 8px 20px oklch(0 0 0 / 0.08);
}
```

---

## Feature: Focus Management (WCAG 2.2)

### Scenario: 全域 focus-visible 一致性

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

## 實作檔案規劃

| 檔案 | 作用 |
|------|------|
| `public/css/tokens.css` | Design tokens 定義（primitive + semantic） |
| `public/css/base.css` | Reset + body + typography + focus（@layer base） |
| `public/css/components.css` | 重構後的 `v4-design.css`（@layer components） |
| `public/css/tailwind-input.css` | 匯入 tokens + base + components + tailwind |
| 刪除 | 各 HTML 中的 inline `<style>` 重複定義（移入對應 layer） |

匯入順序：
```css
/* tailwind-input.css */
@layer reset, tokens, base, components, utilities, overrides;

@import "tailwindcss";
@import "./tokens.css" layer(tokens);
@import "./base.css" layer(base);
@import "./components.css" layer(components);
```

---

## 不動的部分

- **佈局** — 所有頁面佈局不變（grid, flex structure）
- **Three.js 背景** — 保留
- **Lucide icons** — 保留現有 tree-shaking 機制
- **JS 邏輯** — 不動
- **功能** — 純視覺層重構

---

## 驗收標準

1. `npm run build:css` 成功
2. 所有頁面視覺一致性提升（品牌色統一、間距統一）
3. Dark mode 在所有頁面可用
4. 無 `!important` 殘留（除 reduced-motion 的 override）
5. Lighthouse Accessibility score ≥ 95
6. `grep -r "#6868ac" public/` 僅出現在 tokens.css
