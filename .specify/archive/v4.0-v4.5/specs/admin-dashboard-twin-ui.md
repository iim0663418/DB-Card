# BDD Spec: Admin Dashboard 實體孿生 UI

## Feature: 管理員上傳實體名片圖片

作為管理員  
我需要在 Admin Dashboard 上傳實體名片圖片  
以便啟用實體孿生功能

---

## Scenario 1: 顯示「實體孿生」Tab

**Given** 我已登入 Admin Dashboard  
**When** 我查看 Tab 列表  
**Then** 應顯示「實體孿生」Tab  
**And** Tab 圖示為 `image` (Lucide icon)

---

## Scenario 2: 選擇名片並上傳圖片

**Given** 我在「實體孿生」Tab  
**When** 我從下拉選單選擇名片 `abc-123`  
**And** 我選擇圖片類型為 `twin_front`  
**And** 我拖放一張圖片（2 MB, JPEG）  
**Then** 應顯示圖片預覽  
**And** 應顯示檔案資訊（名稱、大小、尺寸）  
**And** 應啟用「上傳」按鈕

---

## Scenario 3: 成功上傳圖片

**Given** 我已選擇名片和圖片  
**When** 我點擊「上傳」按鈕  
**Then** 應顯示上傳進度條  
**And** 應調用 `POST /api/admin/assets/upload`  
**And** 上傳成功後應顯示成功訊息  
**And** 應顯示已上傳的圖片列表  
**And** 應清空表單

---

## Scenario 4: 顯示已上傳的圖片

**Given** 名片 `abc-123` 已有上傳的圖片  
**When** 我選擇該名片  
**Then** 應顯示圖片列表：
- 圖片類型（twin_front/twin_back/avatar）
- 縮圖預覽
- 版本號
- 上傳時間
- 操作按鈕（查看/刪除）

---

## Scenario 5: 錯誤處理

**Given** 我選擇一張 6 MB 的圖片  
**When** 我點擊「上傳」按鈕  
**Then** 應顯示錯誤訊息「檔案大小超過 5 MB 限制」  
**And** 不應調用 API  
**And** 應保持表單狀態

---

## UI 設計要求

### Layout
```
┌─────────────────────────────────────────────────────┐
│ 實體孿生                                              │
├─────────────────────────────────────────────────────┤
│                                                       │
│ 選擇名片: [下拉選單 ▼]                                │
│                                                       │
│ 圖片類型: ○ 正面 (twin_front)                         │
│          ○ 背面 (twin_back)                          │
│          ○ 大頭貼 (avatar)                            │
│                                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │  拖放圖片到此處                                    │ │
│ │  或點擊選擇檔案                                    │ │
│ │                                                   │ │
│ │  支援格式: JPEG, PNG, WebP                        │ │
│ │  最大大小: 5 MB                                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [上傳] [取消]                                         │
│                                                       │
├─────────────────────────────────────────────────────┤
│ 已上傳的圖片                                          │
│                                                       │
│ ┌──────┬──────────┬────────┬──────────┬────────┐   │
│ │ 縮圖  │ 類型      │ 版本   │ 上傳時間  │ 操作   │   │
│ ├──────┼──────────┼────────┼──────────┼────────┤   │
│ │ [圖] │ 正面      │ v2     │ 2026-01  │ [查看] │   │
│ │ [圖] │ 背面      │ v1     │ 2026-01  │ [查看] │   │
│ └──────┴──────────┴────────┴──────────┴────────┘   │
└─────────────────────────────────────────────────────┘
```

### 樣式要求
- 使用 Glassmorphism 設計
- 主色：#6868ac (MODA Purple)
- 拖放區域：虛線邊框，hover 時高亮
- 進度條：漸層動畫
- 成功訊息：綠色，3 秒後自動消失
- 錯誤訊息：紅色，需手動關閉

### 互動要求
- 拖放上傳
- 點擊上傳
- 即時預覽
- 檔案驗證（前端 + 後端）
- 上傳進度顯示
- 成功/錯誤提示

---

## Implementation Notes

### API 調用
```javascript
// 上傳圖片
const formData = new FormData();
formData.append('card_uuid', selectedCardUuid);
formData.append('asset_type', assetType);
formData.append('file', file);

const response = await fetch('/api/admin/assets/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData
});
```

### 前端驗證
```javascript
function validateFile(file) {
  // 檔案大小
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: '檔案大小超過 5 MB 限制' };
  }
  
  // 檔案格式
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '不支援的檔案格式' };
  }
  
  return { valid: true };
}
```

### 圖片預覽
```javascript
function previewImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 顯示尺寸資訊
      console.log(`${img.width} x ${img.height}`);
    };
    img.src = e.target.result;
    // 顯示預覽
    document.getElementById('preview').src = e.target.result;
  };
  reader.readAsDataURL(file);
}
```
