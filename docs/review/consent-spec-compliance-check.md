# 個資同意系統 - BDD Spec 符合度檢查

**日期**: 2026-02-02  
**版本**: v4.6.0  
**檢查範圍**: Backend + Frontend  
**參考規格**: `.specify/specs/consent-management.md`

---

## 📋 Scenario 1: 首次登入顯示同意介面

### Spec 要求
- ✅ 檢查 consent_records 是否有該 user_email 的 accepted 記錄
- ✅ 若無，顯示全螢幕同意 Modal（阻斷式）
- ✅ 若有但版本過舊，顯示版本更新 Modal
- ✅ 若有且版本最新，正常進入 user-portal

### 實作檢查

#### Backend: `handleConsentCheck()` ✅
**檔案**: `workers/src/handlers/consent.ts` Line 103-180

```typescript
// Case 1: No consent record - first time login
if (!latestConsent) {
  return jsonResponse({
    needs_consent: true,
    reason: 'first_login',
    current_policy: { ... }
  });
}

// Case 2: Consent withdrawn
if (latestConsent.consent_status === 'withdrawn') {
  return jsonResponse({
    needs_consent: false,
    is_withdrawn: true,
    days_remaining: ...
  });
}

// Case 3: Version outdated
if (latestConsent.consent_version !== currentPolicy.version) {
  return jsonResponse({
    needs_consent: true,
    reason: 'version_update',
    new_version: currentPolicy.version
  });
}

// Case 4: All good
return jsonResponse({ needs_consent: false });
```

**符合度**: ✅ 100%

#### Frontend: `checkConsentStatus()` ✅
**檔案**: `user-portal-init.js` Line 1696-1720

```javascript
async function checkConsentStatus() {
  const response = await apiCall('/api/consent/check');
  
  if (response.needs_consent) {
    showConsentModal(response.current_policy, response.reason);
    return false; // 阻斷登入
  }
  
  if (response.is_withdrawn && response.can_restore) {
    showRestoreConsentModal(response.days_remaining);
    return false; // 阻斷登入
  }
  
  return true; // 允許登入
}
```

**符合度**: ✅ 100%

**總評**: ✅ **完全符合**

---

## 📋 Scenario 2: 分層揭露內容

### Spec 要求
- ✅ 第一層：顯示摘要（summary_zh/en）
- ✅ 標示蒐集目的代碼：069, 090, 135, 157
- ⚠️ 提供「查看完整條款」連結
- ✅ 第二層：展開完整隱私政策（content_zh/en）

### 實作檢查

#### Frontend: `showConsentModal()` ⚠️
**檔案**: `user-portal-init.js` Line 1722-1763

```javascript
// 顯示摘要
const summary = currentLang === 'zh' ? policy.summary_zh : policy.summary_en;
document.getElementById('consent-summary').textContent = summary;

// 顯示完整內容
const content = currentLang === 'zh' ? policy.content_zh : policy.content_en;
document.getElementById('consent-full-content').innerHTML = 
  DOMPurify.sanitize(content.replace(/\n/g, '<br>'));
```

#### HTML: Consent Modal ⚠️
**檔案**: `user-portal.html` Line 597-660

```html
<!-- Summary -->
<div class="p-4 bg-blue-50 rounded-xl">
  <h4>摘要</h4>
  <p id="consent-summary">載入中...</p>
</div>

<!-- Full Content (直接顯示，無折疊) -->
<div id="consent-full-content" class="prose">載入中...</div>
```

**問題**:
- ❌ 沒有「查看完整條款」連結
- ❌ 摘要和完整內容同時顯示，無分層
- ❌ 蒐集目的代碼未顯示（069, 090, 135, 157）

**符合度**: ⚠️ **60%** (缺少分層機制和目的代碼)

**總評**: ⚠️ **部分符合**

---

## 📋 Scenario 3: 必要同意（不可拒絕）

### Spec 要求
- ✅ 顯示「必要」標籤（紅色）
- ✅ 無法取消勾選
- ⚠️ 說明：「此為服務必要項目，無法拒絕」

### 實作檢查

#### HTML: Consent Modal ⚠️
**檔案**: `user-portal.html` Line 633-640

```html
<div class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
  <input type="checkbox" id="consent-required" disabled checked>
  <div class="flex-1">
    <label class="text-sm font-bold">必要同意（服務使用）</label>
    <p class="text-xs text-slate-600">建立與管理數位名片所必需</p>
  </div>
</div>
```

**問題**:
- ❌ 沒有「必要」標籤（紅色）
- ✅ checkbox disabled + checked（正確）
- ⚠️ 說明文字不夠明確（未說明「無法拒絕」）

**符合度**: ⚠️ **70%** (缺少紅色標籤)

**總評**: ⚠️ **部分符合**

---

## 📋 Scenario 4: 選擇性同意（可拒絕）

### Spec 要求
- ✅ 顯示「選擇性」標籤（藍色）
- ⚠️ 項目：接收系統通知 Email（預設關閉）
- ✅ 項目：匿名使用統計（預設關閉）
- ⚠️ 使用 Switch 元件
- ✅ 可獨立勾選/取消

### 實作檢查

#### HTML: Consent Modal ⚠️
**檔案**: `user-portal.html` Line 641-648

```html
<div class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
  <input type="checkbox" id="consent-optional-analytics">
  <div class="flex-1">
    <label>選擇性同意（匿名統計）</label>
    <p class="text-xs">協助我們改善服務品質，不包含個人識別資訊</p>
  </div>
</div>
```

**問題**:
- ❌ 沒有「選擇性」標籤（藍色）
- ❌ 只有「匿名統計」，缺少「接收系統通知 Email」
- ❌ 使用 checkbox，非 Switch 元件
- ✅ 可勾選/取消（正確）

**符合度**: ⚠️ **50%** (缺少標籤、Email 選項、Switch 元件)

**總評**: ⚠️ **部分符合**

---

## 📋 Scenario 5: 滾動到底部才能同意

### Spec 要求
- ✅ 追蹤滾動進度
- ✅ 未滾動到底部時，「同意」按鈕為 disabled
- ✅ 滾動到底部後，「同意」按鈕啟用
- ✅ 顯示提示：「請閱讀完整條款後同意」

### 實作檢查

#### Frontend: `showConsentModal()` ✅
**檔案**: `user-portal-init.js` Line 1745-1758

```javascript
const checkScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
  
  if (isAtBottom) {
    agreeBtn.disabled = false;
    scrollHint.classList.add('hidden');
  }
};

scrollContainer.addEventListener('scroll', checkScroll);
```

#### HTML: Scroll Hint ✅
**檔案**: `user-portal.html` Line 651-656

```html
<div id="consent-scroll-hint" class="px-6 py-3 bg-amber-50">
  <p class="text-xs text-amber-700">
    <i data-lucide="arrow-down"></i>
    <span data-i18n="consent-scroll-hint">請滾動至底部閱讀完整內容</span>
  </p>
</div>
```

**符合度**: ✅ 100%

**總評**: ✅ **完全符合**

---

## 📋 Scenario 6: 記錄同意

### Spec 要求
- ✅ 插入 consent_records（所有欄位）
- ✅ 若有選擇性同意，分別插入記錄
- ✅ 關閉 Modal，進入 user-portal

### 實作檢查

#### Backend: `handleConsentAccept()` ✅
**檔案**: `workers/src/handlers/consent.ts` Line 187-270

```typescript
// Insert required consent
await env.DB.prepare(`
  INSERT INTO consent_records (
    user_email, consent_version, consent_type, consent_category,
    consent_status, consented_at, ip_address, user_agent, privacy_policy_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  email,
  currentPolicy.version,
  CONSENT_TYPE.REQUIRED,
  CONSENT_CATEGORY.SERVICE,
  CONSENT_STATUS.ACCEPTED,
  now,
  anonymizeIP(ip),
  userAgent,
  privacyPolicyUrl
).run();

// Insert optional analytics consent if provided
if (body.consent_analytics !== undefined) {
  await env.DB.prepare(`...`).bind(...).run();
}
```

**符合度**: ✅ 100%

#### Frontend: `acceptConsent()` ✅
**檔案**: `user-portal-init.js` Line 1765-1791

```javascript
const analyticsConsent = document.getElementById('consent-optional-analytics').checked;

await apiCall('/api/consent/accept', {
  method: 'POST',
  body: JSON.stringify({ consent_analytics: analyticsConsent })
});

document.getElementById('consent-modal').classList.add('hidden');
await fetchUserCards();
showView('selection');
```

**符合度**: ✅ 100%

**總評**: ✅ **完全符合**

---

## 📋 Scenario 7: 撤回同意

### Spec 要求
- ✅ 顯示確認 Modal：「撤回後將無法使用服務，資料將在 30 天後刪除」
- ✅ 更新 consent_records.consent_status = "withdrawn"
- ✅ 設定 withdrawn_at = 當前時間
- ✅ 設定 deletion_scheduled_at = 當前時間 + 30 天
- ✅ 標記所有名片為 soft_deleted (revoked)
- ❌ 發送撤回確認 Email
- ✅ 登出使用者

### 實作檢查

#### Backend: `handleConsentWithdraw()` ⚠️
**檔案**: `workers/src/handlers/consent.ts` Line 285-360

```typescript
await env.DB.batch([
  env.DB.prepare(`
    UPDATE consent_records
    SET consent_status = ?, withdrawn_at = ?, deletion_scheduled_at = ?
    WHERE user_email = ?
  `).bind(CONSENT_STATUS.WITHDRAWN, now, deletionScheduled, email),
  
  env.DB.prepare(`
    UPDATE uuid_bindings
    SET status = 'revoked', revoked_at = ?
    WHERE bound_email = ? AND status = 'bound'
  `).bind(msToSeconds(now), email),
  
  env.DB.prepare(`
    UPDATE read_sessions
    SET revoked_at = ?, revoked_reason = 'admin'
    WHERE card_uuid IN (SELECT uuid FROM uuid_bindings WHERE bound_email = ?)
    AND revoked_at IS NULL
  `).bind(now, email)
]);
```

**問題**:
- ❌ 沒有發送撤回確認 Email（符合 no-email 設計）

**符合度**: ⚠️ **85%** (Email 部分與 no-email 設計衝突)

#### Frontend: `confirmWithdrawConsent()` ✅
**檔案**: `user-portal-init.js` Line 1830-1860

```javascript
await apiCall('/api/consent/withdraw', { method: 'POST' });
closeWithdrawConsentModal();
showToast('同意已撤回，資料將在 30 天後刪除');
setTimeout(() => handleLogout(), 2000);
```

**符合度**: ✅ 100%

**總評**: ⚠️ **部分符合** (Email 與 no-email 設計衝突)

---

## 📋 Scenario 8: 恢復撤回

### Spec 要求
- ✅ 顯示 Modal：「您的資料將在 X 天後刪除，是否恢復？」
- ✅ 更新 consent_status = "accepted"
- ✅ 清除 withdrawn_at 和 deletion_scheduled_at
- ✅ 恢復名片的 soft_deleted 狀態
- ✅ 若不恢復：登出

### 實作檢查

#### Backend: `handleConsentRestore()` ✅
**檔案**: `workers/src/handlers/consent.ts` Line 362-425

```typescript
await env.DB.batch([
  env.DB.prepare(`
    UPDATE consent_records
    SET consent_status = ?, withdrawn_at = NULL, 
        deletion_scheduled_at = NULL, restored_at = ?
    WHERE user_email = ?
  `).bind(CONSENT_STATUS.ACCEPTED, now, email),
  
  env.DB.prepare(`
    UPDATE uuid_bindings
    SET status = 'bound', revoked_at = NULL
    WHERE bound_email = ? AND status = 'revoked'
  `).bind(email)
]);
```

**符合度**: ✅ 100%

#### Frontend: `confirmRestoreConsent()` ✅
**檔案**: `user-portal-init.js` Line 1886-1905

```javascript
await apiCall('/api/consent/restore', { method: 'POST' });
document.getElementById('restore-consent-modal').classList.add('hidden');
showToast('同意已恢復，歡迎回來');
await fetchUserCards();
showView('selection');
```

**符合度**: ✅ 100%

**總評**: ✅ **完全符合**

---

## 📊 總體符合度評分

| Scenario | 符合度 | 評分 | 問題 |
|---------|--------|------|------|
| 1. 首次登入顯示同意介面 | ✅ 完全符合 | 100% | 無 |
| 2. 分層揭露內容 | ⚠️ 部分符合 | 60% | 缺少分層機制、目的代碼 |
| 3. 必要同意 | ⚠️ 部分符合 | 70% | 缺少紅色標籤 |
| 4. 選擇性同意 | ⚠️ 部分符合 | 50% | 缺少標籤、Email 選項、Switch |
| 5. 滾動到底部才能同意 | ✅ 完全符合 | 100% | 無 |
| 6. 記錄同意 | ✅ 完全符合 | 100% | 無 |
| 7. 撤回同意 | ⚠️ 部分符合 | 85% | Email 與 no-email 設計衝突 |
| 8. 恢復撤回 | ✅ 完全符合 | 100% | 無 |

**總體符合度**: **83%** ⚠️

---

## 🔴 需要修正的問題

### 優先級 🔴 高

#### 1. Scenario 2: 分層揭露內容
**問題**:
- 摘要和完整內容同時顯示，無分層
- 缺少「查看完整條款」連結
- 蒐集目的代碼未顯示（069, 090, 135, 157）

**建議修正**:
```html
<!-- 第一層：摘要 + 目的代碼 -->
<div class="p-4 bg-blue-50 rounded-xl">
  <h4>摘要</h4>
  <p id="consent-summary">...</p>
  <div class="mt-2">
    <strong>蒐集目的</strong>: 069, 090, 135, 157
  </div>
  <button onclick="toggleFullContent()" class="mt-2 text-blue-600">
    查看完整條款 ▼
  </button>
</div>

<!-- 第二層：完整內容（預設隱藏） -->
<div id="consent-full-content" class="hidden prose">...</div>
```

---

#### 2. Scenario 3 & 4: 標籤顯示
**問題**:
- 必要同意缺少紅色「必要」標籤
- 選擇性同意缺少藍色「選擇性」標籤

**建議修正**:
```html
<!-- 必要同意 -->
<div class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
  <input type="checkbox" id="consent-required" disabled checked>
  <div class="flex-1">
    <div class="flex items-center gap-2">
      <span class="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">必要</span>
      <label class="text-sm font-bold">服務使用</label>
    </div>
    <p class="text-xs text-slate-600">此為服務必要項目，無法拒絕</p>
  </div>
</div>

<!-- 選擇性同意 -->
<div class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
  <input type="checkbox" id="consent-optional-analytics">
  <div class="flex-1">
    <div class="flex items-center gap-2">
      <span class="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded">選擇性</span>
      <label class="text-sm font-bold">匿名統計</label>
    </div>
    <p class="text-xs text-slate-600">協助我們改善服務品質</p>
  </div>
</div>
```

---

### 優先級 🟡 中

#### 3. Scenario 4: 缺少 Email 通知選項
**問題**: Spec 要求「接收系統通知 Email」，但實作中沒有

**說明**: 這與「no-email 設計」衝突，建議更新 Spec 移除此項

---

#### 4. Scenario 4: Switch 元件
**問題**: 使用 checkbox，非 Switch 元件

**建議**: 保持 checkbox（更簡單），或更新 Spec

---

### 優先級 🟢 低

#### 5. Scenario 7: Email 通知
**問題**: Spec 要求「發送撤回確認 Email」，但實作中沒有

**說明**: 這與「no-email 設計」衝突，建議更新 Spec 移除此項

---

## 🎯 結論

### 核心功能
- ✅ 首次登入阻斷機制：完整
- ✅ 滾動到底部驗證：完整
- ✅ 同意記錄：完整
- ✅ 撤回/恢復流程：完整

### UI/UX 問題
- ⚠️ 分層揭露不完整
- ⚠️ 標籤顯示缺失
- ⚠️ 目的代碼未顯示

### Spec 衝突
- ⚠️ Email 通知與 no-email 設計衝突

**建議**:
1. 🔴 立即修正 UI/UX 問題（分層、標籤、目的代碼）
2. 🟡 更新 Spec 移除 Email 相關需求
3. 🟢 Switch 元件可選（checkbox 已足夠）

**總體評價**: ⚠️ **核心功能完整，UI 需優化**
