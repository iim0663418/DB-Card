# BDD Spec: CSP 和 SRI 安全改進

## Scenario 1: Complete CSP Directive Coverage

### Given
- 當前 CSP 缺少 4 個重要指令
- OWASP ZAP 報告 [10055] CSP Directive Missing

### When
- 添加缺失的 CSP 指令到安全標頭函數

### Then
- CSP 必須包含以下指令：
  - `object-src 'none'` - 禁止 object/embed/applet
  - `base-uri 'self'` - 限制 base 標籤
  - `form-action 'self'` - 限制表單提交
  - `frame-ancestors 'none'` - 禁止被嵌入 iframe

## Scenario 2: Subresource Integrity for CDN Resources

### Given
- HTML 頁面引用多個 CDN 資源
- 缺少 SRI (Subresource Integrity) 屬性
- OWASP ZAP 報告 [90003] SRI Missing

### When
- 為所有 CDN 資源添加 integrity 和 crossorigin 屬性

### Then
- 每個外部 script/link 標籤必須包含：
  - `integrity="sha384-..."` - SRI 雜湊值
  - `crossorigin="anonymous"` - CORS 設定

### CDN 資源清單
1. DOMPurify 3.2.7
2. Three.js r128
3. Lucide Icons 0.562.0
4. Tailwind CSS (CDN)
5. Google Fonts

## Implementation Strategy

### Phase 1: CSP Enhancement (Minimal)
- 修改 `addSecurityHeaders()` 函數
- 添加 4 個新指令到現有 CSP 字串

### Phase 2: SRI Generation
- 使用 `openssl` 生成 SHA-384 雜湊
- 更新所有 HTML 模板

### Phase 3: Verification
- 部署到 Staging
- 執行 OWASP ZAP 掃描驗證

## Acceptance Criteria
1. CSP 包含所有 OWASP 建議的指令
2. 所有 CDN 資源有 SRI 屬性
3. OWASP ZAP WARN [10055] 消失
4. OWASP ZAP WARN [90003] 消失
5. 頁面功能正常運作
