# BDD Specification: Admin Dashboard Phase 1 Implementation

**Feature**: Admin Dashboard Basic Integration
**Target File**: workers/public/admin-dashboard.html
**Version**: 1.0.0
**Base**: Design prototype from docs/

---

## Scenario 1: Integrate Real API for Card Creation

**Given**: User is on "創建名片" tab
**When**: User fills form and clicks "簽發並部署"
**Then**: 
- Call POST /api/admin/cards with form data
- Show success notification
- Switch to "名片列表" tab
- Refresh card list

---

## Scenario 2: Integrate Real API for Card Deletion

**Given**: User clicks "刪除" button on a card
**When**: User confirms deletion
**Then**: 
- Call DELETE /api/admin/cards/:uuid
- Show success notification
- Refresh card list

---

## Scenario 3: Integrate Real API for Session Revocation

**Given**: User clicks "撤銷" button on a card
**When**: User confirms revocation
**Then**: 
- Call POST /api/admin/revoke with card_uuid
- Show success notification with sessions_revoked count

---

## Scenario 4: Update API Base URL Configuration

**Given**: Application loads
**When**: Detecting environment
**Then**: 
- Use correct API_BASE_URL
- localhost → staging API
- production → production API

---

## Scenario 5: Integrate generator-api.js

**Given**: Application loads
**When**: User creates a card
**Then**: 
- Use existing generator-api.js functions
- Reuse createCard() logic
- Maintain consistency with nfc-generator.html

---

## Technical Requirements

### 1. API Configuration

```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'https://db-card-api-staging.csw30454.workers.dev'
  : 'https://api.db-card.moda.gov.tw';
```

### 2. Import generator-api.js

```html
<script type="module">
  import { createCard, deleteCard, revokeCard } from './js/generator-api.js';
</script>
```

### 3. Update createCard Function

```javascript
async function handleCreateCard(e) {
  e.preventDefault();
  
  const token = localStorage.getItem('setup_token');
  const formData = {
    name: { 
      zh: document.getElementById('name_zh').value,
      en: document.getElementById('name_en').value
    },
    title: {
      zh: document.getElementById('title_zh').value,
      en: document.getElementById('title_en').value
    },
    department: {
      zh: document.getElementById('department').value,
      en: document.getElementById('department').value
    },
    email: document.getElementById('email').value,
    socialLinks: {
      socialNote: document.getElementById('social_note').value
    }
  };
  
  const cardType = document.getElementById('card_type').value;
  
  try {
    const result = await fetch(`${API_BASE}/api/admin/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cardType, data: formData })
    });
    
    if (!result.ok) throw new Error('創建失敗');
    
    showNotification('名片創建成功！', 'success');
    switchTab('list');
    
  } catch (error) {
    showNotification('創建失敗: ' + error.message, 'error');
  }
}
```

### 4. Update deleteCard Function

```javascript
async function handleDeleteCard(uuid) {
  const token = localStorage.getItem('setup_token');
  
  try {
    const result = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!result.ok) throw new Error('刪除失敗');
    
    showNotification('名片已刪除', 'success');
    loadCards();
    
  } catch (error) {
    showNotification('刪除失敗: ' + error.message, 'error');
  }
}
```

### 5. Update revokeCard Function

```javascript
async function handleRevokeCard(uuid) {
  const token = localStorage.getItem('setup_token');
  
  try {
    const result = await fetch(`${API_BASE}/api/admin/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ card_uuid: uuid })
    });
    
    if (!result.ok) throw new Error('撤銷失敗');
    
    const data = await result.json();
    showNotification(`已撤銷 ${data.sessions_revoked} 個 Session`, 'success');
    
  } catch (error) {
    showNotification('撤銷失敗: ' + error.message, 'error');
  }
}
```

### 6. Add Notification System

```javascript
function showNotification(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-[200] font-bold text-sm ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-amber-500 text-white'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), type === 'error' ? 5000 : 2000);
}
```

### 7. Update Token Verification

```javascript
async function verifyToken() {
  const token = document.getElementById('setup-token').value;
  
  try {
    // Test API call
    const res = await fetch(`${API_BASE}/health`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      localStorage.setItem('setup_token', token);
      isVerified = true;
      // Show UI...
    } else {
      showNotification('授權驗證失敗', 'error');
    }
  } catch (error) {
    showNotification('無法連接到伺服器', 'error');
  }
}
```

---

## Acceptance Criteria

- [ ] API_BASE_URL configured correctly
- [ ] Create card calls real API
- [ ] Delete card calls real API
- [ ] Revoke card calls real API
- [ ] Token stored in localStorage
- [ ] Notification system works
- [ ] Success/error handling works
- [ ] Tab switching after create works
- [ ] Card list refreshes after operations

---

## Implementation Notes

### Keep from Prototype
- ✅ Three.js background
- ✅ Tab switching system
- ✅ Mock data for list (until GET API ready)
- ✅ Confirmation modal
- ✅ All styling

### Update
- ✅ API integration for create/delete/revoke
- ✅ Notification system
- ✅ Token verification
- ✅ Error handling

### Not in Phase 1
- ❌ Edit functionality (needs GET API)
- ❌ Real card list loading (needs GET API)
- ❌ Search/filter
- ❌ Pagination

