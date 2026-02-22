# BDD Spec: Post-Enrichment Feature (Week 2 Day 6)

## Feature: 「回家後補齊」功能 - 補齊已儲存名片的資訊

### Background
當前問題：
- 展會現場快速歸檔（跳過 AI）
- 回家後想補齊重要聯絡人的資訊
- 當前無法觸發 Web Search

目標：
- 在卡片詳情頁加入「補齊名片資訊」按鈕
- 支援已儲存名片的 Web Search
- 更新 ai_status 為 'completed'

---

## Scenario 1: 顯示 AI 狀態

### Given: 名片已儲存
### When: 查看卡片詳情
### Then: 顯示 AI 狀態 badge

**實作**：
```javascript
function renderAIStatus(card) {
  const statusContainer = document.getElementById('ai-status-container');
  
  if (card.ai_status === 'skipped') {
    statusContainer.innerHTML = `
      <span class="badge badge-gray">
        <i data-lucide="info"></i>
        <span>未使用 AI 分析</span>
      </span>
    `;
  } else if (card.ai_status === 'completed') {
    statusContainer.innerHTML = `
      <span class="badge badge-green">
        <i data-lucide="check"></i>
        <span>AI 分析完成</span>
      </span>
    `;
  } else if (card.ai_status === 'pending') {
    statusContainer.innerHTML = `
      <span class="badge badge-blue">
        <i data-lucide="loader"></i>
        <span>AI 分析中...</span>
      </span>
    `;
  } else if (card.ai_status === 'failed') {
    statusContainer.innerHTML = `
      <span class="badge badge-red">
        <i data-lucide="x"></i>
        <span>AI 分析失敗</span>
      </span>
    `;
  }
}
```

---

## Scenario 2: 顯示「補齊名片資訊」按鈕

### Given: 名片 ai_status 為 'skipped' 或 'failed'
### When: 查看卡片詳情
### Then: 顯示「補齊名片資訊」按鈕

**實作**：
```javascript
function renderEnrichButton(card) {
  const enrichBtn = document.getElementById('enrich-btn');
  
  if (card.ai_status === 'skipped' || card.ai_status === 'failed') {
    enrichBtn.style.display = 'block';
    enrichBtn.onclick = () => enrichCardInfo(card.uuid);
  } else {
    enrichBtn.style.display = 'none';
  }
}
```

**HTML**：
```html
<button 
  id="enrich-btn"
  class="btn-secondary mt-4"
  style="display: none;"
>
  <i data-lucide="sparkles"></i>
  <span>補齊名片資訊</span>
  <span class="text-xs text-slate-500">(約需 10-30 秒)</span>
</button>
```

---

## Scenario 3: 觸發補齊名片資訊

### Given: 使用者點擊「補齊名片資訊」按鈕
### When: 呼叫 Enrich API
### Then: 顯示載入狀態

**實作**：
```javascript
async function enrichCardInfo(uuid) {
  try {
    // 1. 顯示載入狀態
    showLoading('正在補齊名片資訊...');
    
    // 2. 取得卡片資料
    const card = await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`);
    
    // 3. 呼叫 Enrich API
    const enrichResult = await ReceivedCardsAPI.call('/api/user/received-cards/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_uuid: uuid,  // 新增：支援已儲存的卡片
        organization: card.organization,
        full_name: card.full_name,
        title: card.title
      })
    });
    
    // 4. 更新卡片（PATCH）
    await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_summary: enrichResult.company_summary,
        personal_summary: enrichResult.personal_summary,
        ai_sources_json: JSON.stringify(enrichResult.sources),
        ai_status: 'completed'
      })
    });
    
    hideLoading();
    showToast('名片資訊已補齊', 'success');
    
    // 5. 重新載入卡片詳情
    loadCardDetail(uuid);
    
  } catch (error) {
    hideLoading();
    console.error('[EnrichCardInfo] Error:', error);
    showToast('補齊失敗，請稍後再試', 'error');
  }
}
```

---

## Scenario 4: 修改 Enrich API（支援 card_uuid）

### Given: Enrich API 只支援 upload_id
### When: 修改為支援 card_uuid
### Then: 可以補齊已儲存的名片

**實作**：
```typescript
// POST /api/user/received-cards/enrich
interface EnrichRequest {
  upload_id?: string;      // 原有：上傳流程
  card_uuid?: string;      // 新增：回家後補充
  organization: string;
  full_name: string;
  title?: string;
}

export async function handleEnrich(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json() as EnrichRequest;
  
  // 驗證：upload_id 或 card_uuid 必須提供其一
  if (!body.upload_id && !body.card_uuid) {
    return errorResponse('INVALID_REQUEST', 'upload_id or card_uuid is required', 400);
  }
  
  // 若提供 card_uuid，驗證所有權（含軟刪除）
  if (body.card_uuid) {
    const card = await env.DB.prepare(`
      SELECT uuid FROM received_cards 
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(body.card_uuid, user.email).first();
    
    if (!card) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }
  }
  
  // 若提供 upload_id，驗證（原有邏輯）
  if (body.upload_id) {
    const upload = await env.DB.prepare(`
      SELECT upload_id FROM temp_uploads 
      WHERE upload_id = ? AND user_email = ?
    `).bind(body.upload_id, user.email).first();
    
    if (!upload) {
      return errorResponse('UPLOAD_NOT_FOUND', 'Upload not found', 404);
    }
  }
  
  // 呼叫 Gemini Web Search（原有邏輯）
  const enrichResult = await callGeminiWebSearch(body, env);
  
  return jsonResponse(enrichResult);
}
```

---

## Scenario 5: 新增 PATCH API

### Given: 需要更新 ai_status 和 company_summary
### When: 呼叫 PATCH API
### Then: 部分更新名片

**實作**：
```typescript
// PATCH /api/user/received-cards/:uuid
export async function handlePatchCard(request: Request, env: Env, uuid: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json();
  
  // 驗證所有權（含軟刪除條件）
  const card = await env.DB.prepare(`
    SELECT uuid FROM received_cards 
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(uuid, user.email).first();
  
  if (!card) {
    return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
  }
  
  // 動態構建 UPDATE 語句
  const updates = [];
  const values = [];
  
  if (body.company_summary !== undefined) {
    updates.push('company_summary = ?');
    values.push(body.company_summary);
  }
  if (body.personal_summary !== undefined) {
    updates.push('personal_summary = ?');
    values.push(body.personal_summary);
  }
  if (body.ai_sources_json !== undefined) {
    updates.push('ai_sources_json = ?');
    values.push(body.ai_sources_json);
  }
  if (body.ai_status !== undefined) {
    updates.push('ai_status = ?');
    values.push(body.ai_status);
  }
  
  // 其他欄位（與 PUT 共用）
  if (body.full_name !== undefined) {
    updates.push('full_name = ?');
    values.push(body.full_name);
  }
  if (body.organization !== undefined) {
    updates.push('organization = ?');
    values.push(body.organization);
  }
  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }
  if (body.phone !== undefined) {
    updates.push('phone = ?');
    values.push(body.phone);
  }
  if (body.email !== undefined) {
    updates.push('email = ?');
    values.push(body.email);
  }
  if (body.website !== undefined) {
    updates.push('website = ?');
    values.push(body.website);
  }
  if (body.address !== undefined) {
    updates.push('address = ?');
    values.push(body.address);
  }
  if (body.note !== undefined) {
    updates.push('note = ?');
    values.push(body.note);
  }
  
  updates.push('updated_at = ?');
  values.push(Date.now().toString());
  
  // 租戶隔離與軟刪除條件
  values.push(uuid);
  values.push(user.email);
  
  const result = await env.DB.prepare(`
    UPDATE received_cards 
    SET ${updates.join(', ')}
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(...values).run();
  
  if (result.meta.changes === 0) {
    return errorResponse('CARD_NOT_FOUND', 'Card not found or already deleted', 404);
  }
  
  return jsonResponse({ message: 'Card updated' });
}
```

---

## Scenario 6: 路由註冊

### Given: 需要支援 PATCH 方法
### When: 修改 index.ts
### Then: 註冊 PATCH 路由

**實作**：
```typescript
// src/index.ts
if (url.pathname.startsWith('/api/user/received-cards/')) {
  const match = url.pathname.match(/^\/api\/user\/received-cards\/([^\/]+)$/);
  if (match) {
    const uuid = match[1];
    
    if (request.method === 'GET') {
      return handleGetCard(request, env, uuid);
    }
    if (request.method === 'PUT') {
      return handleUpdateCard(request, env, uuid);
    }
    if (request.method === 'PATCH') {  // 新增
      return handlePatchCard(request, env, uuid);
    }
    if (request.method === 'DELETE') {
      return handleDeleteCard(request, env, uuid);
    }
  }
}
```

---

## Scenario 7: 顯示公司摘要

### Given: 名片有 company_summary
### When: 查看卡片詳情
### Then: 顯示公司摘要

**實作**：
```javascript
function renderCompanySummary(card) {
  if (card.company_summary) {
    const container = document.getElementById('company-summary-container');
    container.style.display = 'block';
    
    const text = document.getElementById('company-summary-text');
    text.textContent = card.company_summary;
    
    // 參考來源（安全渲染）
    if (card.sources && card.sources.length > 0) {
      const sourcesList = document.getElementById('sources-list');
      sourcesList.innerHTML = ''; // 清空
      
      card.sources.forEach(s => {
        // 驗證 URL scheme（只允許 https）
        let url = s.uri;
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:') {
            url = '#'; // 不安全的 URL 改為 #
          }
        } catch {
          url = '#'; // 無效 URL 改為 #
        }
        
        // 使用 createElement 避免 XSS
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer'; // 安全屬性
        a.textContent = s.title; // textContent 自動轉義
        li.appendChild(a);
        sourcesList.appendChild(li);
      });
      
      document.getElementById('sources-container').style.display = 'block';
    }
  }
}
```

**HTML**：
```html
<!-- 公司摘要 -->
<div id="company-summary-container" class="company-summary mt-6" style="display: none;">
  <h3 class="font-bold">公司摘要</h3>
  <p class="text-slate-700" id="company-summary-text"></p>
  
  <!-- 參考來源 -->
  <div id="sources-container" class="sources mt-2" style="display: none;">
    <p class="text-xs text-slate-500">參考來源：</p>
    <ul class="text-xs" id="sources-list"></ul>
  </div>
</div>
```

---

## Scenario 8: 卡片詳情頁整合

### Given: 使用者點擊名片
### When: 開啟卡片詳情 Modal
### Then: 顯示完整資訊

**實作**：
```javascript
async function openCardDetail(uuid) {
  try {
    // 1. 取得卡片資料
    const card = await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`);
    
    // 2. 渲染基本資訊
    document.getElementById('detail-name').textContent = card.full_name;
    document.getElementById('detail-org').textContent = card.organization || '';
    document.getElementById('detail-title').textContent = card.title || '';
    document.getElementById('detail-phone').textContent = card.phone || '';
    document.getElementById('detail-email').textContent = card.email || '';
    document.getElementById('detail-website').textContent = card.website || '';
    document.getElementById('detail-address').textContent = card.address || '';
    document.getElementById('detail-note').textContent = card.note || '';
    
    // 3. 渲染 AI 狀態
    renderAIStatus(card);
    
    // 4. 渲染補齊按鈕
    renderEnrichButton(card);
    
    // 5. 渲染公司摘要
    renderCompanySummary(card);
    
    // 6. 顯示 Modal
    document.getElementById('card-detail-modal').classList.remove('hidden');
    
    // 7. 初始化 Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
  } catch (error) {
    console.error('[OpenCardDetail] Error:', error);
    showToast('載入失敗', 'error');
  }
}
```

---

## Scenario 9: 關閉卡片詳情 Modal

### Given: 卡片詳情 Modal 已開啟
### When: 使用者點擊關閉或背景
### Then: 關閉 Modal

**實作**：
```javascript
function closeCardDetailModal() {
  document.getElementById('card-detail-modal').classList.add('hidden');
}

// 關閉按鈕
document.getElementById('close-detail-btn').addEventListener('click', closeCardDetailModal);

// 點擊背景關閉
document.getElementById('card-detail-modal').addEventListener('click', (e) => {
  if (e.target.id === 'card-detail-modal') {
    closeCardDetailModal();
  }
});

// ESC 鍵關閉
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('card-detail-modal');
    if (!modal.classList.contains('hidden')) {
      closeCardDetailModal();
    }
  }
});
```

---

## Acceptance Criteria

### 前端實作
- [ ] AI 狀態 badge（4 種狀態）
- [ ] 「補齊名片資訊」按鈕
- [ ] 補齊邏輯（呼叫 Enrich API + PATCH API）
- [ ] 公司摘要顯示
- [ ] 參考來源顯示（安全渲染）
- [ ] 卡片詳情 Modal

### 後端實作
- [ ] Enrich API 支援 card_uuid
- [ ] PATCH API 實作
- [ ] 路由註冊（PATCH）

### UX 優化
- [ ] 載入狀態顯示
- [ ] 成功/錯誤 Toast 訊息
- [ ] ESC 鍵關閉 Modal
- [ ] 點擊背景關閉 Modal

---

## Implementation Details

### 檔案位置
- **修改**：`workers/src/handlers/user/received-cards/enrich.ts`（支援 card_uuid）
- **新增**：`workers/src/handlers/user/received-cards/crud.ts`（handlePatchCard）
- **修改**：`workers/src/index.ts`（PATCH 路由）
- **修改**：`workers/public/user-portal.html`（卡片詳情 Modal）
- **修改**：`workers/public/js/received-cards.js`（補齊邏輯）

### 依賴
- 現有的 Enrich API
- 現有的 Web Search 功能

---

## Non-Goals (本階段不做)

- ❌ 批次補齊
- ❌ 自動補齊（定時任務）
- ❌ 補齊進度條（單張名片不需要）

---

## Technical Notes

1. **Enrich API**：
   - 支援 upload_id（上傳流程）
   - 支援 card_uuid（回家後補充）
   - 驗證所有權（租戶隔離）

2. **PATCH API**：
   - 部分更新（只更新提供的欄位）
   - 支援 ai_status、company_summary、personal_summary
   - 租戶隔離 + 軟刪除

3. **安全**：
   - URL scheme 驗證（只允許 https）
   - 使用 createElement 避免 XSS
   - textContent 自動轉義

4. **UX**：
   - 載入狀態（10-30 秒）
   - 成功/錯誤 Toast
   - 自動重新載入卡片詳情

---

## Estimated Time: 2 hours

- 後端 API 修改：0.5 小時
- 前端 UI 實作：1 小時
- 測試與優化：0.5 小時
