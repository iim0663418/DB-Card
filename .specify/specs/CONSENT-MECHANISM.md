# 同意機制設計規格 (Consent Mechanism Design)

**Spec ID**: PRIVACY-001  
**Version**: 1.0.0  
**Related**: ARCH-001 Backend Migration  
**Created**: 2026-01-18

---

## 1. 同意機制需求

### 1.1 法律要求
- **GDPR Article 7**: 同意的條件
  - 明確且積極的行為
  - 可自由撤回
  - 與其他事項分離
  - 清楚易懂的語言

- **台灣個資法 第 7 條**: 告知義務
  - 蒐集之目的
  - 資料類別
  - 利用期間、地區、對象及方式
  - 當事人權利及行使方式

### 1.2 實作位置
- **NFC 生成器頁面** (`nfc-generator.html`)
- **首次訪問名片頁面** (彈出式同意視窗)
- **管理後台** (管理員創建名片時)

---

## 2. UI/UX 設計

### 2.1 NFC 生成器同意流程

#### Scenario: 使用者首次創建名片
**Given**: 使用者開啟 NFC 生成器頁面  
**When**: 使用者填寫完名片資料並點擊「生成 NFC 連結」  
**Then**: 
1. 顯示隱私權政策摘要彈窗
2. 提供「閱讀完整政策」連結
3. 提供「我同意」和「我不同意」按鈕
4. 僅在點擊「我同意」後才呼叫 API 創建名片
5. 記錄同意時間戳與 IP (匿名化)

#### 彈窗內容範例 (中文)
```html
<div class="consent-modal">
  <h2>📋 隱私權政策同意</h2>
  
  <div class="consent-summary">
    <p><strong>資料收集說明：</strong></p>
    <ul>
      <li>✅ 您的名片資料將儲存於 Cloudflare 伺服器</li>
      <li>✅ 資料將以 AES-256 加密保護</li>
      <li>✅ 僅用於數位名片展示與交換服務</li>
      <li>✅ 您可隨時要求刪除資料</li>
    </ul>
    
    <p><strong>您的權利：</strong></p>
    <ul>
      <li>🔍 存取權：查看您的資料</li>
      <li>✏️ 更正權：修改您的資料</li>
      <li>🗑️ 刪除權：要求刪除資料</li>
      <li>📤 可攜權：匯出您的資料</li>
    </ul>
  </div>
  
  <div class="consent-actions">
    <label>
      <input type="checkbox" id="consent-checkbox" required>
      我已閱讀並同意 <a href="/privacy-policy.html" target="_blank">隱私權政策</a>
    </label>
    
    <div class="button-group">
      <button id="consent-decline" class="btn-secondary">我不同意</button>
      <button id="consent-accept" class="btn-primary" disabled>我同意並繼續</button>
    </div>
  </div>
  
  <p class="consent-note">
    ⚠️ 點擊「我同意」即表示您授權我們依據隱私權政策處理您的個人資料。
  </p>
</div>
```

#### JavaScript 邏輯
```javascript
// 同意機制控制
const consentCheckbox = document.getElementById('consent-checkbox');
const consentAcceptBtn = document.getElementById('consent-accept');
const consentDeclineBtn = document.getElementById('consent-decline');

// 勾選後才能點擊同意按鈕
consentCheckbox.addEventListener('change', (e) => {
  consentAcceptBtn.disabled = !e.target.checked;
});

// 點擊同意
consentAcceptBtn.addEventListener('click', async () => {
  const consentData = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    ip: await getAnonymizedIP(), // 僅前 3 段
    userAgent: navigator.userAgent
  };
  
  // 儲存同意記錄到 localStorage (前端備份)
  localStorage.setItem('db-card-consent', JSON.stringify(consentData));
  
  // 關閉彈窗，繼續創建名片
  closeConsentModal();
  createCard(consentData);
});

// 點擊不同意
consentDeclineBtn.addEventListener('click', () => {
  alert('您必須同意隱私權政策才能使用本服務。');
  closeConsentModal();
  // 清空表單或返回首頁
});
```

---

### 2.2 名片頁面首次訪問同意

#### Scenario: 訪客首次掃描 NFC 卡片
**Given**: 訪客從未訪問過此名片系統  
**When**: 訪客掃描 NFC 卡片並開啟名片頁面  
**Then**:
1. 顯示簡化版隱私聲明橫幅 (Banner)
2. 提供「接受」和「了解更多」按鈕
3. 接受後才載入完整名片資料
4. 記錄訪客同意 (Cookie 或 LocalStorage)

#### 橫幅內容範例
```html
<div class="privacy-banner">
  <p>
    🔒 本網站使用 Cookie 與本地儲存以提供離線功能。
    我們重視您的隱私，不會追蹤您的個人行為。
    <a href="/privacy-policy.html" target="_blank">了解更多</a>
  </p>
  <button id="accept-privacy" class="btn-primary">接受</button>
</div>
```

---

## 3. API 整合

### 3.1 同意記錄儲存

#### POST /api/consent/record
**Purpose**: 記錄使用者同意

**Request Body**:
```json
{
  "card_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "consent_version": "2.0.0",
  "consent_timestamp": "2026-01-18T00:41:48.676Z",
  "ip_address": "203.69.123.xxx", // 匿名化
  "user_agent": "Mozilla/5.0..."
}
```

**Response**:
```json
{
  "success": true,
  "consent_id": "consent_abc123",
  "message": "同意記錄已儲存"
}
```

---

### 3.2 同意撤回

#### DELETE /api/consent/:card_uuid
**Purpose**: 撤回同意並刪除資料

**Given**: 使用者已同意並創建名片  
**When**: 使用者要求撤回同意  
**Then**:
1. 軟刪除名片資料 (is_active = 0)
2. 撤銷所有 NFC Token
3. 記錄撤回日誌
4. 90 天後永久刪除

---

## 4. 資料庫 Schema 擴充

```sql
-- 同意記錄表
CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL,
  consent_version TEXT NOT NULL,        -- 隱私政策版本
  consent_timestamp INTEGER NOT NULL,   -- 同意時間
  ip_address TEXT,                      -- 匿名化 IP
  user_agent TEXT,
  is_revoked BOOLEAN DEFAULT 0,         -- 是否已撤回
  revoked_at INTEGER,                   -- 撤回時間
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_consent_card_uuid ON consent_records(card_uuid);
CREATE INDEX idx_consent_timestamp ON consent_records(consent_timestamp);
```

---

## 5. 合規檢查清單

### 5.1 GDPR 合規
- ✅ **Article 7(1)**: 明確且積極的同意行為 (勾選框 + 按鈕)
- ✅ **Article 7(2)**: 清楚易懂的語言 (中英文雙語)
- ✅ **Article 7(3)**: 可自由撤回 (DELETE API)
- ✅ **Article 7(4)**: 同意記錄可證明 (consent_records 表)

### 5.2 台灣個資法合規
- ✅ **第 7 條**: 告知義務 (隱私政策完整說明)
- ✅ **第 8 條**: 書面同意 (電子同意記錄)
- ✅ **第 11 條**: 當事人權利 (存取、更正、刪除 API)

---

## 6. 測試案例

### Test Case 1: 同意流程正常運作
**Given**: 使用者開啟 NFC 生成器  
**When**: 勾選同意框並點擊「我同意」  
**Then**: 
- 同意記錄儲存到資料庫
- 名片創建成功
- 回傳 NFC Token

### Test Case 2: 未同意無法創建
**Given**: 使用者開啟 NFC 生成器  
**When**: 未勾選同意框直接點擊「生成」  
**Then**:
- 顯示錯誤訊息
- API 回傳 403 Forbidden
- 不創建名片

### Test Case 3: 撤回同意
**Given**: 使用者已創建名片  
**When**: 使用者要求刪除資料  
**Then**:
- 名片軟刪除 (is_active = 0)
- consent_records.is_revoked = 1
- 90 天後永久刪除

---

## 7. 實作優先級

| 階段 | 任務 | 優先級 |
|------|------|--------|
| Phase 1 | 隱私政策頁面 (HTML) | P0 |
| Phase 2 | NFC 生成器同意彈窗 | P0 |
| Phase 3 | 同意記錄 API | P0 |
| Phase 4 | 名片頁面隱私橫幅 | P1 |
| Phase 5 | 撤回同意 API | P1 |

---

**[END OF CONSENT MECHANISM SPEC]**
