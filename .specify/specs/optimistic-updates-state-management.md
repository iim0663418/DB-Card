# BDD Specification: Optimistic Updates with State Management

## Feature: 樂觀更新與狀態管理重構

### Background
當前創建名片流程存在時序競爭問題，導致資料不一致和錯誤訊息顯示問題。需要實作樂觀更新機制以改善使用者體驗。

### Scenario 1: 樂觀創建名片
**Given** 使用者填寫完名片表單並提交
**When** 點擊提交按鈕
**Then** UI 立即更新顯示新名片（樂觀更新）
**And** 背景發送 API 請求
**And** API 成功後確認更新
**And** 顯示成功 Modal

### Scenario 2: 創建失敗回滾
**Given** 使用者提交名片表單
**And** UI 已樂觀更新
**When** API 請求失敗
**Then** 回滾到提交前的狀態
**And** 顯示錯誤訊息
**And** UI 恢復到原始狀態

### Scenario 3: 統一錯誤處理
**Given** 任何 API 請求失敗
**When** 錯誤發生
**Then** 使用統一的錯誤處理器
**And** 顯示格式化的錯誤訊息
**And** 不再顯示 [object Object]

### Scenario 4: 背景同步
**Given** 樂觀更新已完成
**And** API 請求成功
**When** 確認更新後
**Then** 將同步任務加入隊列
**And** 背景執行同步（不阻塞 UI）
**And** 確保最終資料一致性

### Scenario 5: 狀態不可變更新
**Given** 需要更新狀態
**When** 執行狀態更新
**Then** 使用不可變更新模式
**And** 不直接修改原始物件
**And** 返回新的狀態物件

## Technical Requirements

### 1. CardStateManager 類別

```javascript
class CardStateManager {
  constructor() {
    this.state = { cards: [] };
    this.snapshots = [];
    this.syncQueue = [];
    this.isSyncing = false;
  }
  
  // 初始化狀態
  initialize(cards) {
    this.state.cards = cards.map(card => ({ ...card }));
  }
  
  // 獲取當前狀態
  getState() {
    return this.state;
  }
  
  // 快照當前狀態
  snapshot() {
    this.snapshots.push(JSON.parse(JSON.stringify(this.state)));
  }
  
  // 樂觀創建
  optimisticCreate(type, cardData) {
    this.snapshot();
    
    const tempId = `temp_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    this.state.cards = this.state.cards.map(card =>
      card.type === type
        ? {
            ...card,
            uuid: tempId,
            status: 'bound',
            name_zh: cardData.name_zh,
            name_en: cardData.name_en,
            updated_at: timestamp,
            _optimistic: true
          }
        : card
    );
    
    return tempId;
  }
  
  // 確認創建
  confirmCreate(tempId, realUuid, serverData) {
    this.state.cards = this.state.cards.map(card =>
      card.uuid === tempId
        ? {
            uuid: realUuid,
            type: card.type,
            status: 'bound',
            name_zh: serverData.name_zh || card.name_zh,
            name_en: serverData.name_en || card.name_en,
            updated_at: serverData.updated_at || card.updated_at,
            _optimistic: false
          }
        : card
    );
    
    this.snapshots = [];
  }
  
  // 回滾
  rollback() {
    if (this.snapshots.length > 0) {
      this.state = this.snapshots.pop();
      return true;
    }
    return false;
  }
  
  // 加入同步隊列
  queueSync(task) {
    this.syncQueue.push(task);
    this.processSyncQueue();
  }
  
  // 處理同步隊列
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;
    
    this.isSyncing = true;
    
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      try {
        await task();
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
    
    this.isSyncing = false;
  }
}
```

### 2. ErrorHandler 類別

```javascript
class ErrorHandler {
  constructor() {
    this.handlers = new Map([
      ['CARD_NOT_FOUND', '名片不存在，請重新創建'],
      ['NETWORK_ERROR', '網路連線失敗，請檢查網路'],
      ['VALIDATION_ERROR', '資料格式錯誤，請檢查輸入'],
      ['UNAUTHORIZED', '登入已過期，請重新登入'],
      ['FORBIDDEN', '權限不足'],
      ['SERVER_ERROR', '伺服器錯誤，請稍後再試'],
      [401, '登入已過期，請重新登入'],
      [403, '權限不足'],
      [404, '資源不存在'],
      [500, '伺服器錯誤，請稍後再試'],
      [0, '網路連線失敗']
    ]);
  }
  
  handle(error) {
    // 優先處理 code
    if (error?.code && this.handlers.has(error.code)) {
      return this.handlers.get(error.code);
    }
    
    // 其次處理 status
    if (error?.status && this.handlers.has(error.status)) {
      return this.handlers.get(error.status);
    }
    
    // 最後處理 message
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      return error.error;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return '未知錯誤';
  }
  
  register(code, message) {
    this.handlers.set(code, message);
  }
}
```

### 3. 整合到 user-portal.html

#### 初始化
```javascript
// 全局實例
const stateManager = new CardStateManager();
const errorHandler = new ErrorHandler();
```

#### 修改 fetchUserCards
```javascript
async function fetchUserCards() {
  try {
    const response = await apiCall('/api/user/cards', { method: 'GET' });
    const cards = response.data?.cards || [];
    
    // 初始化狀態管理器
    state.cards = ['personal', 'event', 'sensitive'].map(type => {
      const card = cards.find(c => c.type === type);
      if (card) {
        return { ...card, status: card.status || 'bound' };
      }
      return { type, status: 'empty' };
    });
    
    stateManager.initialize(state.cards);
    renderSelectionPage();
  } catch (err) {
    handleError(err);
  }
}
```

#### 修改 handleFormSubmit
```javascript
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {};
  
  // 收集表單資料
  ['type', 'name_zh', 'name_en', 'title_zh', 'title_en',
   'department', 'email', 'phone', 'address_zh', 'address_en',
   'mobile', 'avatar_url', 'greetings_zh', 'greetings_en',
   'social_github', 'social_linkedin', 'social_facebook',
   'social_instagram', 'social_twitter', 'social_youtube'].forEach(key => {
    const val = formData.get(key);
    if (val !== null && val !== undefined) data[key] = val;
  });
  
  const uuid = formData.get('form-uuid');
  const type = formData.get('form-type');
  
  try {
    if (uuid) {
      // 編輯：使用 Toast
      await apiCall(`/api/user/cards/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('名片更新成功');
      await fetchUserCards();
      showView('selection');
    } else {
      // 創建：使用樂觀更新
      
      // 1. 樂觀更新（立即反應）
      const tempId = stateManager.optimisticCreate(type, data);
      state.cards = stateManager.getState().cards;
      renderSelectionPage();
      
      // 2. API 請求
      const response = await apiCall('/api/user/cards', {
        method: 'POST',
        body: JSON.stringify({ ...data, type })
      });
      
      const realUuid = response.data?.uuid;
      
      if (!realUuid) {
        throw new Error('API 未返回 UUID');
      }
      
      // 3. 確認更新
      stateManager.confirmCreate(tempId, realUuid, {
        name_zh: data.name_zh,
        name_en: data.name_en,
        updated_at: new Date().toISOString()
      });
      state.cards = stateManager.getState().cards;
      
      // 4. 顯示 Modal
      showSuccessModal(realUuid, type);
      
      // 5. 背景同步
      stateManager.queueSync(async () => {
        await fetchUserCards();
      });
    }
  } catch (err) {
    // 6. 失敗回滾
    if (!uuid) {
      const rolled = stateManager.rollback();
      if (rolled) {
        state.cards = stateManager.getState().cards;
        renderSelectionPage();
      }
    }
    
    // 7. 統一錯誤處理
    const errorMsg = errorHandler.handle(err);
    showToast(errorMsg);
    handleError(err);
  }
}
```

#### 修改 viewCard 錯誤處理
```javascript
async function viewCard(uuid) {
  toggleLoading(true);
  try {
    const response = await apiCall('/api/nfc/tap', {
      method: 'POST',
      body: JSON.stringify({ card_uuid: uuid })
    });
    
    const sessionId = response.session_id || response.data?.session_id;
    
    if (!sessionId) {
      throw { code: 'SESSION_ERROR', message: '無法獲取查看授權' };
    }
    
    const url = `${window.location.origin}/card-display.html?uuid=${uuid}&session=${sessionId}`;
    window.open(url, '_blank');
    
    toggleLoading(false);
  } catch (error) {
    toggleLoading(false);
    const errorMsg = errorHandler.handle(error);
    showToast('查看失敗: ' + errorMsg);
  }
}
```

## Acceptance Criteria
- [ ] 創建名片立即更新 UI
- [ ] API 失敗時正確回滾
- [ ] 錯誤訊息統一格式
- [ ] 不再顯示 [object Object]
- [ ] 背景同步不阻塞 UI
- [ ] 狀態使用不可變更新
- [ ] updated_at 正確顯示
- [ ] 查看功能正常運作

## Code Size Estimate
- CardStateManager: ~100 行
- ErrorHandler: ~50 行
- Integration: ~150 行
- Total: ~300 行

## Implementation Time
約 2-3 小時
