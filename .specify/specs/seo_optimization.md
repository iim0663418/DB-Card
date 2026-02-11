# BDD Spec: SEO 優化 - index.html

## Scenario 1: 完善 Meta Tags
**Given**: 當前只有基本的 description  
**When**: 新增完整的 SEO meta tags  
**Then**:
- `<meta name="keywords">` - 關鍵字
- `<meta name="author">` - 作者
- `<meta name="robots">` - 索引指令
- `<link rel="canonical">` - 規範網址
- `<meta property="og:*">` - Open Graph (社群分享)
- `<meta name="twitter:*">` - Twitter Card

## Scenario 2: 結構化資料 (JSON-LD)
**Given**: 缺少結構化資料  
**When**: 新增 Schema.org JSON-LD  
**Then**:
- `@type: SoftwareApplication` - 軟體應用程式
- `name`, `description`, `applicationCategory`
- `offers` - 免費/開源
- `operatingSystem` - Web-based
- `author` - 組織資訊

## Scenario 3: 語意化 HTML
**Given**: 當前使用 div 結構  
**When**: 改用語意化標籤  
**Then**:
- `<header>` - 頁首
- `<main>` - 主要內容
- `<section>` - 區塊
- `<article>` - 獨立內容
- `<footer>` - 頁尾
- 適當的 heading 層級 (h1, h2, h3)

## Scenario 4: 效能優化
**Given**: 字體載入可能阻塞渲染  
**When**: 優化資源載入  
**Then**:
- `<link rel="preload">` - 關鍵字體
- `font-display: swap` - 字體顯示策略
- `<link rel="dns-prefetch">` - DNS 預解析
- 移除不必要的外部資源

## Scenario 5: 無障礙優化
**Given**: 缺少 ARIA 標籤  
**When**: 新增無障礙屬性  
**Then**:
- `lang` 屬性正確設定
- `alt` 文字完整
- `aria-label` 描述互動元素
- 鍵盤導航支援

## Acceptance Criteria
- [ ] Google Lighthouse SEO 分數 > 90
- [ ] 所有圖片有 alt 屬性
- [ ] 結構化資料通過 Google Rich Results Test
- [ ] Open Graph 預覽正確
- [ ] 無 HTML 驗證錯誤
