# BDD Spec: OCR Preview Modal Full Schema Support

## Scenario: Complete Field Input in OCR Preview
**Given**: 
- OCR 完成辨識
- Preview Modal 顯示

**When**: 
- 使用者編輯名片資訊

**Then**:
- 可輸入 name_prefix (稱謂)
- 可輸入 name_suffix (後綴)
- 可輸入 department (部門)
- 可輸入 organization_en (英文組織名稱)
- 可輸入 organization_alias (組織別名)
- 所有欄位正確儲存到資料庫

## Technical Requirements
- 最小化 HTML 變更
- 保持現有 UI 風格
- 響應式設計（手機友好）
- 欄位順序符合邏輯

## Files to Modify
1. public/user-portal.html - preview-modal section
2. public/js/received-cards.js - showPreviewModal() + saveCard()
