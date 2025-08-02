# PWA 按鈕水平對齊修復

## 問題描述
用戶反映 PWA 儲存按鈕與「加入聯絡人」按鈕在一般模式下無法完美水平對齊，出現「一高一低」的問題。

## 修復方案
將 `.button-group` 的 `align-items` 屬性從 `center` 改為 `stretch`，並為 `.pwa-save-btn` 添加 `vertical-align: top` 屬性。

## 修復的文件
- `index.html` (機關版中文延平大樓)
- `index1.html` (機關版中文新光大樓)
- `index-en.html` (機關版英文延平大樓)
- `index1-en.html` (機關版英文新光大樓)
- `index-personal.html` (個人版中文)
- `index-personal-en.html` (個人版英文)
- `index-bilingual.html` (雙語版延平大樓)
- `index1-bilingual.html` (雙語版新光大樓)
- `index-bilingual-personal.html` (雙語版個人)

## 技術細節
```css
.button-group {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: stretch; /* 從 center 改為 stretch */
}

.pwa-save-btn {
    /* 其他屬性保持不變 */
    vertical-align: top; /* 新增此屬性 */
}
```

## 測試建議
- 在桌面瀏覽器中測試按鈕對齊效果
- 在移動設備上測試響應式佈局
- 確認所有 9 個名片模板的按鈕都能正確對齊

## 修復日期
2025-01-02