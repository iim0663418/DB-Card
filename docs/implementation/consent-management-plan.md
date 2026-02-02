# 個資同意管理系統 - 實作計畫

## 📋 實作順序

### Phase 1: 資料庫與後端 API (2-3 小時)

#### 1.1 資料庫 Migration
- [x] 創建 `0018_consent_management.sql`
- [ ] 執行 migration（local, staging, production）
- [ ] 驗證表結構

#### 1.2 後端 API 端點
**新增檔案**: `workers/src/handlers/consent.ts`

```typescript
// GET /api/consent/check
// 檢查使用者是否需要同意
export async function handleConsentCheck(request: Request, env: Env): Promise<Response>

// POST /api/consent/accept
// 記錄使用者同意
export async function handleConsentAccept(request: Request, env: Env): Promise<Response>

// POST /api/consent/withdraw
// 撤回同意
export async function handleConsentWithdraw(request: Request, env: Env): Promise<Response>

// POST /api/consent/restore
// 恢復撤回
export async function handleConsentRestore(request: Request, env: Env): Promise<Response>

// GET /api/consent/history
// 查看同意歷史
export async function handleConsentHistory(request: Request, env: Env): Promise<Response>

// POST /api/data/export
// 匯出個人資料
export async function handleDataExport(request: Request, env: Env): Promise<Response>

// GET /api/data/export/:id
// 下載匯出檔案
export async function handleDataExportDownload(request: Request, env: Env): Promise<Response>

// GET /api/privacy-policy/current
// 取得當前隱私政策
export async function handlePrivacyPolicyCurrent(request: Request, env: Env): Promise<Response>
```

#### 1.3 Scheduled Worker
**修改檔案**: `workers/src/scheduled.ts`

```typescript
// 每日 02:00 執行
export async function handleScheduled(event: ScheduledEvent, env: Env) {
  // 1. 檢查並刪除過期資料
  await deleteExpiredData(env);
  
  // 2. 處理待匯出請求
  await processExportRequests(env);
}
```

---

### Phase 2: 前端 UI 元件 (3-4 小時)

#### 2.1 同意 Modal 元件
**新增檔案**: `workers/public/js/consent-modal.js`

**功能**:
- 全螢幕 Modal
- 分層揭露（摘要 + 完整條款）
- 滾動追蹤
- 必要/選擇性同意分開
- 多語言支援（中/英）

**UI 結構**:
```html
<div id="consent-modal" class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm">
  <div class="consent-container">
    <!-- Header -->
    <div class="consent-header">
      <h1>個人資料蒐集同意書</h1>
      <p>Personal Data Collection Consent</p>
    </div>
    
    <!-- Summary (Layer 1) -->
    <div class="consent-summary">
      <h2>摘要</h2>
      <p>我們蒐集您的姓名、Email、職稱等資料...</p>
      <button>查看完整條款</button>
    </div>
    
    <!-- Full Content (Layer 2) -->
    <div class="consent-full-content" style="display:none">
      <div class="scrollable-content">
        <!-- 完整隱私政策 -->
      </div>
      <div class="scroll-indicator">
        請閱讀完整條款後同意
      </div>
    </div>
    
    <!-- Consent Items -->
    <div class="consent-items">
      <!-- 必要同意 -->
      <div class="consent-item required">
        <span class="badge">必要</span>
        <label>
          <input type="checkbox" checked disabled>
          基本資料蒐集與名片服務
        </label>
      </div>
      
      <!-- 選擇性同意 -->
      <div class="consent-item optional">
        <span class="badge">選擇性</span>
        <label>
          <input type="checkbox" id="consent-notification">
          接收系統通知 Email
        </label>
      </div>
      
      <div class="consent-item optional">
        <span class="badge">選擇性</span>
        <label>
          <input type="checkbox" id="consent-analytics">
          匿名使用統計
        </label>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="consent-actions">
      <button id="consent-reject" class="btn-secondary">
        拒絕並登出
      </button>
      <button id="consent-accept" class="btn-primary" disabled>
        我已閱讀並同意
      </button>
    </div>
    
    <!-- Footer -->
    <div class="consent-footer">
      <p>版本：v1.0.0 | 生效日期：2026-02-02</p>
    </div>
  </div>
</div>
```

#### 2.2 設定頁面整合
**修改檔案**: `workers/public/user-portal.html`

**新增區塊**:
```html
<!-- 個資管理區塊 -->
<section id="privacy-settings">
  <h2>個人資料管理</h2>
  
  <!-- 同意狀態 -->
  <div class="privacy-status">
    <p>同意狀態：已同意（v1.0.0）</p>
    <p>同意時間：2026-02-02 18:30:00</p>
  </div>
  
  <!-- 操作按鈕 -->
  <div class="privacy-actions">
    <button id="view-consent-history">查看同意歷史</button>
    <button id="export-my-data">匯出我的資料</button>
    <button id="withdraw-consent" class="btn-danger">撤回個資同意</button>
  </div>
</section>
```

#### 2.3 撤回確認 Modal
**新增元件**: 撤回確認對話框

```html
<div id="withdraw-modal">
  <h2>⚠️ 撤回個資同意</h2>
  <p>撤回後將發生以下情況：</p>
  <ul>
    <li>無法繼續使用數位名片服務</li>
    <li>所有名片將被隱藏</li>
    <li>資料將在 30 天後永久刪除</li>
    <li>30 天內可隨時恢復</li>
  </ul>
  <input type="text" placeholder="輸入「確認撤回」以繼續">
  <button id="confirm-withdraw">確認撤回</button>
</div>
```

---

### Phase 3: 整合與測試 (2 小時)

#### 3.1 user-portal 流程整合
**修改檔案**: `workers/public/js/user-portal-init.js`

```javascript
async function initUserPortal() {
  // 1. 檢查登入狀態
  const user = await checkAuth();
  
  // 2. 檢查同意狀態
  const consentStatus = await checkConsentStatus(user.email);
  
  if (!consentStatus.hasConsent || consentStatus.needsUpdate) {
    // 顯示同意 Modal（阻斷式）
    showConsentModal(consentStatus.currentVersion);
    return; // 阻止進入 portal
  }
  
  // 3. 檢查是否為撤回狀態
  if (consentStatus.isWithdrawn) {
    showRestoreModal(consentStatus.deletionDate);
    return;
  }
  
  // 4. 正常進入 portal
  loadUserPortal();
}
```

#### 3.2 測試項目
- [ ] 首次登入顯示同意 Modal
- [ ] 滾動到底部才能同意
- [ ] 必要/選擇性同意分開記錄
- [ ] 撤回後無法進入 portal
- [ ] 30 天內可恢復
- [ ] 匯出資料功能
- [ ] 版本更新重新同意
- [ ] 多語言切換

---

## 📊 工作量估算

| 階段 | 工作項目 | 預估時間 |
|------|---------|---------|
| Phase 1 | 資料庫 Migration | 0.5 小時 |
| Phase 1 | 後端 API (8 個端點) | 2 小時 |
| Phase 1 | Scheduled Worker | 0.5 小時 |
| Phase 2 | 同意 Modal UI | 2 小時 |
| Phase 2 | 設定頁面整合 | 1 小時 |
| Phase 2 | 撤回/恢復 Modal | 1 小時 |
| Phase 3 | 流程整合 | 1 小時 |
| Phase 3 | 測試與修正 | 1 小時 |
| **總計** | | **9 小時** |

---

## 🎯 下一步

**請確認是否開始實作？**

我將按照以下順序執行：
1. 執行資料庫 migration
2. 實作後端 API
3. 實作前端 UI
4. 整合測試

**或者您希望我先實作特定部分？** 🚀
