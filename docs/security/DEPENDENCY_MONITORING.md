# 依賴套件安全監控政策

**版本**: v1.0.0  
**最後更新**: 2026-02-23  
**負責人**: DB-Card Security Team

---

## 📋 監控清單

### 前端依賴（Vendor）

| 套件 | 當前版本 | 最後檢查 | 狀態 | 下次檢查 |
|------|---------|---------|------|---------|
| browser-image-compression | 2.0.2 | 2026-02-23 | ✅ 安全 | 2026-05-23 |
| three.min.js | r128 | 2026-01-24 | ✅ 安全 | 2026-04-24 |
| purify.min.js | 3.2.7 | 2026-01-24 | ✅ 安全 | 2026-04-24 |
| lucide.min.js | 0.562.0 | 2026-02-08 | ✅ 安全 | 2026-05-08 |

### 後端依賴（npm）

| 套件 | 當前版本 | 最後檢查 | 狀態 | 下次檢查 |
|------|---------|---------|------|---------|
| jose | ^6.1.3 | 2026-01-24 | ✅ 安全 | 2026-04-24 |
| @simplewebauthn/server | ^13.2.2 | 2026-01-24 | ✅ 安全 | 2026-04-24 |

---

## 🔍 監控標準

### 檢查頻率

- **關鍵依賴**: 每季度（3 個月）
- **一般依賴**: 每半年（6 個月）
- **開發依賴**: 每年

### 安全評估標準

| 評級 | 條件 | 行動 |
|------|------|------|
| ✅ 安全 | 無 CVE，Snyk 評分 > 50 | 繼續使用 |
| ⚠️ 注意 | 維護不活躍但無漏洞 | 監控，尋找替代品 |
| ❌ 危險 | 存在 High/Critical CVE | 立即修復或替換 |

---

## 📊 browser-image-compression 監控記錄

### 2026-02-23 檢查結果

**版本**: 2.0.2  
**Snyk 評分**: 56/100  
**安全狀態**: ✅ 無已知漏洞

#### 詳細評估

| 項目 | 狀態 | 說明 |
|------|------|------|
| CVE 漏洞 | ✅ 0 個 | 無 Critical/High/Medium/Low |
| 維護狀態 | ⚠️ 不活躍 | 最後更新 2023-03-06 (2 年前) |
| 社群活躍度 | ✅ 良好 | 207K 週下載，1,641 Stars |
| 依賴安全 | ✅ 安全 | 僅 1 個依賴 (uzip) |
| 授權合規 | ✅ MIT | 可商用 |

#### 替代品評估

**compressorjs v1.2.1**:
- Snyk 評分: 61/100 (僅高 5 分)
- 維護狀態: 同樣不活躍 (2023-02-28)
- 遷移成本: 高（API 不同）
- **結論**: 無明顯優勢，不建議遷移

#### 決策

✅ **繼續使用 browser-image-compression v2.0.2**

**理由**:
1. 無安全漏洞
2. 功能穩定成熟
3. 無更好的替代品
4. 遷移成本高於收益

**下次檢查**: 2026-05-23

---

## 🚨 觸發立即檢查的條件

1. **安全警報**: Snyk/GitHub 發出漏洞通知
2. **重大更新**: 套件發布新主版本
3. **瀏覽器變更**: Chrome/Firefox 棄用相關 API
4. **生產事故**: 與依賴相關的錯誤

---

## 🔧 檢查流程

### 1. 版本檢查

```bash
# 檢查最新版本
npm view browser-image-compression version

# 檢查更新日誌
npm view browser-image-compression time
```

### 2. 安全掃描

```bash
# npm audit
npm audit --package-lock-only

# Snyk 掃描
npx snyk test --package=browser-image-compression@2.0.2

# OSV Scanner
osv-scanner --lockfile=package-lock.json
```

### 3. 替代品評估

```bash
# 檢查 compressorjs
npm view compressorjs version time

# Snyk 比較
open https://snyk.io/advisor/npm-package/browser-image-compression
open https://snyk.io/advisor/npm-package/compressorjs
```

### 4. 記錄更新

更新本文件的監控清單和檢查記錄。

---

## 📝 變更歷史

| 日期 | 版本 | 變更內容 |
|------|------|---------|
| 2026-02-23 | v1.0.0 | 初始版本，新增 browser-image-compression 監控 |

---

## 📞 聯絡方式

**安全問題回報**: [GitHub Security Advisories](https://github.com/iim0663418/DB-Card/security/advisories/new)  
**一般問題**: [GitHub Issues](https://github.com/iim0663418/DB-Card/issues)
