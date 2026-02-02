# 🔍 外部資源風險評估報告

**評估日期**: 2026-02-02  
**評估範圍**: workers/public/*.html  
**評估者**: Amazon Q Dev CLI

## 📊 風險總覽

| 資源 | CDN | SRI | 風險 | 影響範圍 |
|------|-----|-----|------|---------|
| Lucide Icons | unpkg.com | ✅ | 🟡 中 | UI 圖示 |
| QR Creator | unpkg.com | ❌ | 🔴 高 | QR 功能 |
| DOMPurify | cdnjs | ✅ | 🔴 高 | XSS 防護 |
| Three.js | cdnjs | ✅ | 🟢 低 | 視覺效果 |
| Google Fonts | googleapis | ❌ | 🟡 中 | 字體顯示 |

## 🚨 立即需要修復的問題

### 1. QR Creator 缺少 SRI (高風險)
**問題**: 無完整性驗證，可能遭受供應鏈攻擊  
**SRI Hash**: `sha384-cmmVU8dn+rGH6Yvlt0Q1+31iG9lS4wdVsqV/ZP/53RBddef+VZcYakA+NhG4S8wE`  
**修復**: 添加 integrity 和 crossorigin 屬性

**影響檔案**:
- card-display.html
- index.html
- user-portal.html
- admin-dashboard.html

### 2. DOMPurify 單點故障 (高風險)
**問題**: CDN 失效會導致 XSS 防護完全失效  
**影響**: 安全性核心功能  
**修復**: 實作 fallback 機制或本地託管

### 3. unpkg.com 可靠性 (中風險)
**問題**: 社群維護 CDN，SLA 不如 Cloudflare  
**影響**: Lucide Icons + QR Creator  
**修復**: 遷移至 cdnjs.cloudflare.com

## 💡 建議修復方案

### 方案 A: 快速修復 (立即可行) ⭐
1. 為 QR Creator 添加 SRI
2. 為 DOMPurify 添加 onerror fallback
3. 保持現有架構

**優點**: 最小變更，快速部署  
**缺點**: 仍依賴外部 CDN  
**時間**: 30 分鐘

### 方案 B: 本地託管 (推薦)
1. 下載所有關鍵資源至 `workers/public/vendor/`
2. 更新所有 HTML 引用路徑
3. 保留 SRI 驗證

**優點**: 完全控制，無外部依賴  
**缺點**: 需要維護更新  
**時間**: 2 小時

### 方案 C: 混合策略 (平衡)
- **關鍵資源** (DOMPurify): 本地託管
- **非關鍵資源** (Lucide, Three.js): CDN + fallback
- **字體**: 自託管 woff2

**優點**: 平衡效能與可靠性  
**缺點**: 架構較複雜  
**時間**: 4 小時

## 🎯 推薦執行順序

### Phase 1: 緊急修復 (30 分鐘)
- [ ] 為 QR Creator 添加 SRI
- [ ] 為 DOMPurify 添加 onerror fallback
- [ ] 測試 fallback 機制

### Phase 2: 中期優化 (2 小時)
- [ ] 本地託管 DOMPurify
- [ ] 遷移 unpkg.com 資源至 cdnjs
- [ ] 更新所有 HTML 檔案

### Phase 3: 長期改善 (1 天)
- [ ] 自託管 Google Fonts
- [ ] 建立 vendor 目錄結構
- [ ] 更新 CI/CD 流程
- [ ] 建立依賴更新機制

## 📝 技術細節

### QR Creator SRI 修復
```javascript
// card-display.html (line 99)
var qrScript = document.createElement('script');
qrScript.src = 'https://unpkg.com/qr-creator@1.0.0/dist/qr-creator.min.js';
qrScript.integrity = 'sha384-cmmVU8dn+rGH6Yvlt0Q1+31iG9lS4wdVsqV/ZP/53RBddef+VZcYakA+NhG4S8wE';
qrScript.crossOrigin = 'anonymous';
document.head.appendChild(qrScript);
```

### DOMPurify Fallback 機制
```javascript
// card-display.html (line 104)
var purifyScript = document.createElement('script');
purifyScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js';
purifyScript.integrity = 'sha384-qJNkHwhlYywDHfyoEe1np+1lYvX/8x+3gHCKFhSSBMQyCFlvFnn+zXmaebXl21rV';
purifyScript.crossOrigin = 'anonymous';
purifyScript.onerror = function() {
    console.warn('CDN failed, loading local DOMPurify');
    var fallback = document.createElement('script');
    fallback.src = '/vendor/purify.min.js';
    fallback.integrity = 'sha384-qJNkHwhlYywDHfyoEe1np+1lYvX/8x+3gHCKFhSSBMQyCFlvFnn+zXmaebXl21rV';
    document.head.appendChild(fallback);
};
document.head.appendChild(purifyScript);
```

### 本地託管目錄結構
```
workers/public/vendor/
├── lucide.min.js (v0.562.0)
├── qr-creator.min.js (v1.0.0)
├── dompurify.min.js (v3.2.7)
├── three.min.js (r128)
└── fonts/
    ├── outfit-300.woff2
    ├── outfit-400.woff2
    ├── outfit-700.woff2
    ├── outfit-900.woff2
    ├── noto-sans-tc-300.woff2
    ├── noto-sans-tc-500.woff2
    └── noto-sans-tc-900.woff2
```

## 🔒 安全性影響評估

### 當前狀態
- **XSS 防護**: 依賴單一 CDN (🔴 高風險)
- **供應鏈攻擊**: QR Creator 無 SRI (🔴 高風險)
- **可用性**: 依賴 3 個外部 CDN (🟡 中風險)
- **隱私**: Google Fonts 追蹤 (🟡 中風險)

### 修復後狀態 (Phase 1)
- **XSS 防護**: 本地備援 (🟢 低風險)
- **供應鏈攻擊**: 全部 SRI 保護 (🟢 低風險)
- **可用性**: Fallback 機制 (🟢 低風險)
- **隱私**: Google Fonts 追蹤 (🟡 中風險)

### 修復後狀態 (Phase 3)
- **XSS 防護**: 本地託管 (🟢 低風險)
- **供應鏈攻擊**: 全部 SRI 保護 (🟢 低風險)
- **可用性**: 完全自主控制 (🟢 低風險)
- **隱私**: 自託管字體 (🟢 低風險)

## 📈 效能影響

### CDN vs 本地託管

| 指標 | CDN | 本地託管 | 差異 |
|------|-----|---------|------|
| DNS 查詢 | 3 個域名 | 0 | -300ms |
| TLS 握手 | 3 次 | 0 | -200ms |
| 瀏覽器快取 | 跨站共享 | 單站 | 略差 |
| 邊緣節點 | 全球 | Cloudflare Workers | 相同 |

### Cloudflare Workers 優勢
- 邊緣運算：本地託管檔案同樣分散至全球節點
- 無 DNS 查詢：同源請求，減少延遲
- 完全控制：不受外部 CDN 影響

### 建議
對於 Cloudflare Workers 部署，**本地託管不會顯著影響效能**，反而提升可靠性與隱私。

## 🔍 其他發現

### 1. Google Fonts 隱私問題
- 每次載入會向 Google 發送請求（含 IP、User-Agent）
- 中國大陸可能無法訪問
- 建議：自託管 woff2 字體檔案

### 2. Three.js 版本過舊
- 當前使用 r128 (2021)
- 最新版本 r170+ (2024)
- 建議：評估升級可行性

### 3. 缺少 CSP 對 CDN 的限制
- 當前 CSP 允許所有 CDN
- 建議：限制 script-src 至特定域名

## 📚 參考資料

- [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [OWASP: Third Party JavaScript Management](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)
- [Cloudflare Workers: Static Assets](https://developers.cloudflare.com/workers/static-assets/)

---

**下一步行動**: 執行 Phase 1 緊急修復（30 分鐘）
