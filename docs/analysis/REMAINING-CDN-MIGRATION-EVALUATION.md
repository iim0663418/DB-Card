# 剩餘 CDN 套件遷移評估報告

**評估日期**: 2026-01-24T23:40:00+08:00  
**專案版本**: v4.3.3  
**已完成**: Tailwind CSS (CDN → npm)

---

## 📊 當前 CDN 使用狀況

### CDN 來源統計
| CDN 來源 | 套件數 | 總大小 | SRI 支援 |
|---------|--------|--------|---------|
| cdnjs.cloudflare.com | 2 | ~500KB | ✅ 100% |
| unpkg.com | 3 | ~50KB | ❌ 0% |
| cdn.jsdelivr.net | 1 | ~200KB | ❌ 0% |
| **總計** | **6** | **~750KB** | **33%** |

### 套件清單

#### 1. Three.js (r128)
- **來源**: cdnjs.cloudflare.com
- **大小**: ~500KB (minified)
- **用途**: 3D 背景動畫
- **SRI**: ✅ 有
- **使用頁面**: 4 個 (全部)

#### 2. DOMPurify (3.2.7)
- **來源**: cdnjs.cloudflare.com
- **大小**: ~20KB (minified)
- **用途**: XSS 防護
- **SRI**: ✅ 有
- **使用頁面**: 4 個 (全部)

#### 3. Lucide Icons (0.562.0)
- **來源**: unpkg.com
- **大小**: ~15KB (minified)
- **用途**: UI 圖標
- **SRI**: ❌ 無
- **使用頁面**: 4 個 (全部)

#### 4. qr-creator (1.0.0)
- **來源**: unpkg.com
- **大小**: ~5KB (minified)
- **用途**: QR Code 生成
- **SRI**: ❌ 無
- **使用頁面**: 2 個 (card-display, admin-dashboard)

#### 5. Chart.js (4.5.1)
- **來源**: cdn.jsdelivr.net
- **大小**: ~200KB (minified)
- **用途**: 安全監控圖表
- **SRI**: ❌ 無
- **使用頁面**: 1 個 (admin-dashboard)

#### 6. SimpleWebAuthn Browser (13.0.0)
- **來源**: unpkg.com
- **大小**: ~30KB (minified)
- **用途**: Passkey 前端認證
- **SRI**: ❌ 無
- **使用頁面**: 1 個 (admin-dashboard)

---

## 🎯 遷移評估

### 套件 1: Three.js

#### 當前狀態
- CDN: cdnjs.cloudflare.com
- 版本: r128 (舊版本，最新 r170+)
- 大小: ~500KB
- SRI: ✅ 有

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟡 中 | 版本舊，但功能穩定 |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟡 中 | 檔案大小相同，版本控制 |
| **風險** | 🟡 中 | API 可能變更 |
| **優先級** | P2 | 非緊急 |

#### npm 遷移方案
```bash
npm install three@0.128.0
```

```javascript
// 改用 ES Module
import * as THREE from 'three';
```

**問題**: 需要打包工具（esbuild/webpack）

#### 建議
**保留 CDN**

理由:
1. 僅用於背景動畫（非核心功能）
2. 已有 SRI 保護
3. 遷移需要打包工具（增加複雜度）
4. 版本舊但穩定，無安全漏洞

---

### 套件 2: DOMPurify

#### 當前狀態
- CDN: cdnjs.cloudflare.com
- 版本: 3.2.7 (最新)
- 大小: ~20KB
- SRI: ✅ 有

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟢 低 | 已有 SRI，版本最新 |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟢 低 | 檔案小，CDN 快取佳 |
| **風險** | 🟢 低 | 安全套件，需謹慎 |
| **優先級** | P3 | 低優先級 |

#### npm 遷移方案
```bash
npm install dompurify
```

```javascript
import DOMPurify from 'dompurify';
```

**問題**: 需要打包工具

#### 建議
**保留 CDN**

理由:
1. 安全關鍵套件，已有 SRI 保護
2. 檔案小（20KB），CDN 快取效果好
3. 版本最新，無安全問題
4. 遷移效益低

---

### 套件 3: Lucide Icons

#### 當前狀態
- CDN: unpkg.com
- 版本: 0.562.0
- 大小: ~15KB
- SRI: ❌ 無

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟡 中 | 無 SRI，但風險低 |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟡 中 | 版本控制，可 tree-shake |
| **風險** | 🟢 低 | 僅 UI 圖標 |
| **優先級** | P2 | 中優先級 |

#### npm 遷移方案
```bash
npm install lucide
```

```javascript
import { createIcons, icons } from 'lucide';
createIcons({ icons });
```

**優勢**:
- Tree-shaking: 只打包使用的圖標
- 可能減少 50-80% 大小

**問題**: 需要打包工具

#### 建議
**考慮遷移**（如果引入打包工具）

理由:
1. 無 SRI 保護
2. Tree-shaking 可大幅減少大小
3. 版本控制更好

---

### 套件 4: qr-creator

#### 當前狀態
- CDN: unpkg.com
- 版本: 1.0.0
- 大小: ~5KB
- SRI: ❌ 無

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟢 低 | 檔案極小，風險低 |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟢 低 | 檔案太小，效益有限 |
| **風險** | 🟢 低 | 功能簡單 |
| **優先級** | P3 | 低優先級 |

#### npm 遷移方案
```bash
npm install qr-creator
```

```javascript
import QrCreator from 'qr-creator';
```

**問題**: 需要打包工具

#### 建議
**保留 CDN**

理由:
1. 檔案極小（5KB）
2. 功能簡單，風險低
3. 遷移效益極低
4. 剛從 QRious 遷移過來

---

### 套件 5: Chart.js

#### 當前狀態
- CDN: cdn.jsdelivr.net
- 版本: 4.5.1
- 大小: ~200KB
- SRI: ❌ 無

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟡 中 | 無 SRI，檔案較大 |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟡 中 | Tree-shaking 可減少大小 |
| **風險** | 🟢 低 | 僅管理後台使用 |
| **優先級** | P2 | 中優先級 |

#### npm 遷移方案
```bash
npm install chart.js
```

```javascript
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
```

**優勢**:
- Tree-shaking: 只打包使用的圖表類型
- 可能減少 30-50% 大小

**問題**: 需要打包工具

#### 建議
**考慮遷移**（如果引入打包工具）

理由:
1. 無 SRI 保護
2. 檔案較大（200KB）
3. Tree-shaking 效益明顯
4. 僅管理後台使用（影響範圍小）

---

### 套件 6: SimpleWebAuthn Browser

#### 當前狀態
- CDN: unpkg.com
- 版本: 13.0.0
- 大小: ~30KB
- SRI: ❌ 無

#### 遷移評估
| 項目 | 評分 | 說明 |
|------|------|------|
| **必要性** | 🟡 中 | 安全相關，無 SRI |
| **可行性** | ✅ 高 | npm 套件完整 |
| **效益** | 🟡 中 | 版本控制，安全性 |
| **風險** | 🟡 中 | 安全關鍵功能 |
| **優先級** | P2 | 中優先級 |

#### npm 遷移方案
```bash
npm install @simplewebauthn/browser
```

```javascript
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
```

**問題**: 需要打包工具

#### 建議
**考慮遷移**（如果引入打包工具）

理由:
1. 安全相關套件，應有版本控制
2. 無 SRI 保護
3. 僅管理後台使用（影響範圍小）

---

## 📊 遷移優先級總結

### P1: 立即執行
無

### P2: 短期規劃（如果引入打包工具）
1. **Lucide Icons** - 無 SRI，可 tree-shake
2. **Chart.js** - 無 SRI，檔案大，可 tree-shake
3. **SimpleWebAuthn** - 安全相關，無 SRI

### P3: 低優先級
1. **DOMPurify** - 已有 SRI，檔案小
2. **qr-creator** - 檔案極小，風險低
3. **Three.js** - 已有 SRI，僅背景動畫

---

## 🎯 整體建議

### 方案 A: 保持現狀（推薦）⭐

**理由**:
1. ✅ 已完成最大效益遷移（Tailwind: 99.7% 減少）
2. ✅ 剩餘套件總大小僅 750KB（可接受）
3. ✅ 33% 已有 SRI 保護（關鍵套件）
4. ✅ 無打包工具，架構簡單
5. ✅ CDN 快取效果好

**效益**: 維持簡單架構，風險低

---

### 方案 B: 引入打包工具（不推薦）

**需要**:
- esbuild 或 webpack
- 複雜的構建流程
- 開發環境配置

**效益**:
- 可 tree-shake（Lucide, Chart.js）
- 版本控制更好
- 可能減少 100-200KB

**成本**:
- 增加構建複雜度
- 開發體驗下降
- 維護成本增加

**結論**: 效益不足以抵消成本

---

### 方案 C: 選擇性遷移（折衷）

僅遷移無 SRI 且檔案較大的套件：
1. Chart.js (200KB, 無 SRI)

**方式**: 使用 Cloudflare Workers 的 ES Module 支援

```javascript
// workers/public/js/chart.module.js
import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/+esm';
export { Chart };
```

**效益**: 有限（仍依賴 CDN）

---

## 📈 性能對比

### 當前狀態（已完成 Tailwind 遷移）
```
Tailwind:  12KB (npm build)
其他 CDN:  750KB
總計:      762KB
```

### 如果全部遷移（需打包工具）
```
Tailwind:     12KB
Three.js:     500KB (無法減少)
DOMPurify:    20KB (無法減少)
Lucide:       5-10KB (tree-shake 50%)
qr-creator:   5KB (無法減少)
Chart.js:     100-150KB (tree-shake 30%)
SimpleWebAuthn: 30KB (無法減少)
總計:         672-727KB
```

**改善**: 35-90KB (5-12%)

**成本**: 引入打包工具，增加複雜度

---

## 🚀 最終建議

### 立即行動
**無需進一步遷移**

### 理由
1. ✅ **已完成最大效益遷移** (Tailwind: 99.7%)
2. ✅ **剩餘套件效益低** (5-12% 改善)
3. ✅ **架構簡單** (無打包工具)
4. ✅ **風險低** (關鍵套件有 SRI)
5. ✅ **維護成本低**

### 未來考慮
如果專案需要打包工具（例如引入 React/Vue），再考慮遷移：
- Lucide Icons (tree-shake)
- Chart.js (tree-shake)
- SimpleWebAuthn (版本控制)

---

## 📊 結論

### 當前狀態
- ✅ **Tailwind 已遷移**: 99.7% 改善
- ✅ **剩餘 CDN**: 750KB, 33% SRI
- ✅ **架構簡單**: 無打包工具
- ✅ **性能優異**: 總計 762KB

### 建議
**保持現狀，無需進一步遷移**

**原因**: 效益不足以抵消引入打包工具的成本

---

**評估完成，建議維持現狀！**
