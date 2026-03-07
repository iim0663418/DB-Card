# OWASP ZAP 實際掃描結果（2026-03-07）

## 掃描摘要

- **HIGH (risk-3)**: 0
- **MEDIUM (risk-2)**: 4
- **LOW (risk-1)**: 4
- **INFO (risk-0)**: 多個

**總計**: 0 FAIL, 4 MEDIUM (需處理), 4 LOW (WARN)

---

## MEDIUM Risk (需處理) - 4 項

### 1. Absence of Anti-CSRF Tokens
- **風險**: CSRF 攻擊
- **狀態**: ⚠️ 需確認
- **說明**: 部分表單可能缺少 CSRF token
- **優先級**: P1

### 2. CSP: Wildcard Directive
- **風險**: CSP 過於寬鬆
- **狀態**: ⚠️ 需檢查
- **說明**: 可能使用了 wildcard (*)
- **優先級**: P1

### 3. CSP: script-src unsafe-inline
- **風險**: XSS 攻擊
- **狀態**: ❌ 確認存在
- **說明**: 允許 inline scripts
- **優先級**: P0

### 4. CSP: style-src unsafe-inline
- **風險**: CSS injection
- **狀態**: ❌ 確認存在
- **說明**: 允許 inline styles
- **優先級**: P1

---

## LOW Risk (WARN) - 4 項

### 1. Private IP Disclosure
- **風險**: 資訊洩漏
- **狀態**: 📝 資訊性
- **說明**: 回應中可能包含內部 IP
- **優先級**: P3

### 2. Strict-Transport-Security Header Not Set
- **風險**: 未強制 HTTPS
- **狀態**: ❌ 確認缺少
- **說明**: 缺少 HSTS header
- **優先級**: P1

### 3. Timestamp Disclosure - Unix
- **風險**: 資訊洩漏
- **狀態**: 📝 功能需求
- **說明**: API 回應包含時間戳
- **優先級**: P3

### 4. X-Content-Type-Options Header Missing
- **風險**: MIME sniffing
- **狀態**: ❌ 確認缺少
- **說明**: 缺少 nosniff header
- **優先級**: P1

---

## INFO (資訊性) - 多項

### 1. Content Security Policy (CSP) Report-Only Header Found
- **狀態**: ✅ 正常
- **說明**: CSP Report-Only 用於測試

### 2. Information Disclosure - Sensitive Information in URL
- **狀態**: 📝 需檢查
- **說明**: URL 中可能包含敏感資訊

### 3. 其他資訊性警告
- 多個低風險資訊性警告

---

## 修復建議

### 立即修復（P0-P1）- 6 項

#### 1. 移除 CSP unsafe-inline (P0)
```typescript
// 當前
script-src 'self' 'unsafe-inline' ...

// 修復
script-src 'self' 'nonce-{random}' ...
```
**工時**: 2-3 小時（需實作 nonce 機制）

#### 2. 加入 HSTS (P1)
```typescript
response.headers.set('Strict-Transport-Security', 
  'max-age=31536000; includeSubDomains; preload');
```
**工時**: 5 分鐘

#### 3. 加入 X-Content-Type-Options (P1)
```typescript
response.headers.set('X-Content-Type-Options', 'nosniff');
```
**工時**: 5 分鐘

#### 4. 檢查 CSRF Token (P1)
- 確認所有表單都有 CSRF token
- 檢查 API 端點的 CSRF 保護
**工時**: 30 分鐘

#### 5. 檢查 CSP Wildcard (P1)
- 確認是否使用了 wildcard
- 收緊 CSP 規則
**工時**: 30 分鐘

#### 6. 移除 style-src unsafe-inline (P1)
```typescript
// 使用 nonce 或外部 CSS
style-src 'self' 'nonce-{random}' ...
```
**工時**: 1-2 小時

---

### 可選修復（P3）- 2 項

#### 1. Private IP Disclosure
- 檢查回應中是否包含內部 IP
- 如果是 Cloudflare 加入的，無法控制
**工時**: 15 分鐘

#### 2. Timestamp Disclosure
- 功能需求，不需修復
**工時**: 0

---

## 修復優先級

### 快速修復（30 分鐘）
1. 加入 HSTS header
2. 加入 X-Content-Type-Options header
3. 檢查 CSRF token 覆蓋率

**效果**: MEDIUM 4 → 2-3, LOW 4 → 3

### 完整修復（4-5 小時）
1. 實作 nonce 機制
2. 移除所有 unsafe-inline
3. 收緊 CSP 規則
4. 完整 CSRF 保護

**效果**: MEDIUM 4 → 0, LOW 4 → 2

---

## 總結

### 當前狀態
- ❌ 4 個 MEDIUM 風險（需處理）
- ⚠️ 4 個 LOW 風險（WARN）
- 📝 多個 INFO（資訊性）

### 建議
**先做快速修復（30 分鐘）**，可以立即改善 2-3 個問題。

**CSP unsafe-inline 是最大問題**，但需要 2-3 小時實作 nonce 機制。

---

**要現在開始修復嗎？** 🔧
