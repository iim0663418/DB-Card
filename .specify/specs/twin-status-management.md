# BDD Spec: Twin Status Management API

## Feature: 實體孿生狀態管理

作為系統  
我需要自動管理實體孿生的啟用狀態  
以便在資產齊備時自動啟用，資產變更時標記為 stale

---

## Scenario 1: 上傳第一張圖片時自動啟用孿生

**Given** 名片 `abc-123` 存在且有必要欄位（display_name, title）  
**And** 名片尚未啟用實體孿生（twin_status 不存在或 status = 'disabled'）  
**When** 上傳第一張 `twin_front` 圖片成功  
**Then** 應自動創建 `twin_status` 記錄：
```json
{
  "card_uuid": "abc-123",
  "enabled": true,
  "status": "ready",
  "last_rebuild_at": "2026-01-28T13:00:00Z",
  "error_message": null
}
```

---

## Scenario 2: 更新圖片時標記為 stale

**Given** 名片 `abc-123` 的實體孿生狀態為 `ready`  
**When** 上傳新版本的 `twin_front` 圖片  
**Then** 應更新 `twin_status`：
```json
{
  "status": "stale",
  "last_rebuild_at": "2026-01-28T13:05:00Z"
}
```

---

## Scenario 3: 刪除圖片時停用孿生

**Given** 名片 `abc-123` 的實體孿生狀態為 `ready`  
**And** 只有 1 張核心圖片（twin_front）  
**When** 軟刪除該圖片  
**Then** 應更新 `twin_status`：
```json
{
  "enabled": false,
  "status": "disabled"
}
```

---

## Scenario 4: 檢查啟用條件

**Given** 名片 `abc-123` 存在  
**When** 檢查是否可啟用實體孿生  
**Then** 應驗證：
- ✅ 必要欄位：display_name, title
- ✅ 至少 1 張核心圖片：avatar 或 twin_front 或 twin_back
- ✅ 圖片狀態為 ready（非 soft_deleted）

---

## Scenario 5: 自動重建邏輯（未來擴展）

**Given** 名片 `abc-123` 的實體孿生狀態為 `stale`  
**When** 觸發重建（手動或自動）  
**Then** 應更新 `twin_status`：
```json
{
  "status": "ready",
  "last_rebuild_at": "2026-01-28T13:10:00Z",
  "error_message": null
}
```

---

## Implementation Notes

### 狀態機
```
disabled → ready → stale → error
   ↓         ↓       ↓       ↓
  手動     自動    資產變更  重建失敗
```

### 啟用條件
```typescript
function canEnableTwin(card: Card, assets: Asset[]): boolean {
  // 必要欄位
  if (!card.display_name || !card.title) return false;
  
  // 至少 1 張核心圖片
  const coreAssets = assets.filter(a => 
    ['avatar', 'twin_front', 'twin_back'].includes(a.asset_type) &&
    a.status === 'ready'
  );
  
  return coreAssets.length > 0;
}
```

### 自動觸發時機
1. **上傳圖片後** - 檢查是否可啟用
2. **更新圖片後** - 標記為 stale
3. **刪除圖片後** - 檢查是否需停用
