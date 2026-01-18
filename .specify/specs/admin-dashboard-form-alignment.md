# BDD Spec: Admin Dashboard 表單對齊 nfc-generator

## Scenario 1: 表單欄位完整對齊
**Given**: Admin Dashboard 當前表單缺少多個欄位
**When**: 用戶需要創建完整的數位名片
**Then**: 表單應包含與 nfc-generator.html 相同的所有欄位

### 必須實作的欄位：
1. ✅ 姓名（雙語）- 已存在
2. ✅ 職稱（雙語）- 已存在但位置錯誤（應在基本資訊區）
3. ✅ Email - 已存在
4. ✅ 部門 - 已存在但選項不完整
5. ❌ 公務電話 (phone) - **缺少**
6. ❌ 手機號碼 (mobile) - **缺少**
7. ❌ 大頭貼 URL (avatar_url) - **缺少**
8. ❌ 問候語（雙語）(greetings_zh, greetings_en) - **缺少**
9. ❌ 地址（預設選項 + 自訂雙語）- **缺少**
10. ✅ 社群備註 (social_note) - 已存在
11. ✅ 名片類型 (card_type) - 已存在

## Scenario 2: 表單結構對齊
**Given**: nfc-generator.html 有清晰的區塊劃分
**When**: 用戶填寫表單
**Then**: Admin Dashboard 應採用相同的結構

### 區塊結構：
```
1. 基本身分資訊（雙語必填）
   - 姓名（雙語）
   - 職稱（雙語）
   - Email
   - 部門

2. 聯絡資訊
   - 公務電話
   - 地址（預設選項 + 自訂）

3. 進階與社群資訊（details 折疊）
   - 手機號碼
   - 大頭貼 URL
   - 問候語（雙語）
   - 社群備註

4. 名片設定
   - 名片安全性等級
   - 簽發按鈕
```

## Scenario 3: 部門選項完整性
**Given**: nfc-generator.html 有完整的 16 個部門選項
**When**: 用戶選擇部門
**Then**: Admin Dashboard 應包含所有部門選項

### 完整部門清單：
- 數位策略司
- 數位政府司
- 資源管理司
- 韌性建設司
- 數位國際司
- 資料創新司
- 秘書處
- 人事處
- 政風處
- 主計處
- 資訊處
- 法制處
- 部長室
- 政務次長室
- 常務次長室
- 主任秘書室

## Scenario 4: 地址欄位實作
**Given**: nfc-generator.html 有預設地址選項
**When**: 用戶選擇地址
**Then**: 應提供預設選項並支援自訂

### 地址預設選項：
```javascript
const ADDRESS_PRESETS = {
    yanping: {
        zh: '10058 台北市中正區延平南路143號',
        en: 'No. 143, Yanping S. Rd., Zhongzheng Dist., Taipei City 10058'
    },
    shinkong: {
        zh: '11073 台北市信義區信義路三段206號',
        en: 'No. 206, Sec. 3, Xinyi Rd., Xinyi Dist., Taipei City 11073'
    }
};
```

### UI 行為：
- 下拉選單：空白 / 延平大樓 / 新光大樓 / 自訂地址
- 選擇「自訂地址」時顯示雙語輸入框
- 選擇預設地址時隱藏自訂輸入框

## Scenario 5: 表單資料收集對齊
**Given**: nfc-generator.html 的 formData 結構
**When**: 用戶提交表單
**Then**: Admin Dashboard 應收集相同格式的資料

### 完整 formData 結構：
```javascript
{
    name_zh: string,
    name_en: string,
    title_zh: string,
    title_en: string,
    email: string,
    phone: string,           // 新增
    department: string,
    mobile: string,          // 新增
    avatar_url: string,      // 新增
    greetings_zh: string,    // 新增
    greetings_en: string,    // 新增
    social_note: string,
    cardType: string,
    address: {               // 新增
        zh: string,
        en: string
    } | null
}
```

## Scenario 6: 預覽功能增強
**Given**: nfc-generator.html 有完整的即時預覽
**When**: 用戶輸入資料
**Then**: 預覽應顯示所有欄位

### 預覽應包含：
- 大頭貼
- 姓名
- 職稱
- 問候語（條件顯示）
- Email
- 公務電話
- 地址
- 社群圖標

## Scenario 7: getAddressData() 函數
**Given**: 需要處理地址選項
**When**: 收集表單資料
**Then**: 應實作 getAddressData() 函數

```javascript
function getAddressData() {
    const preset = document.getElementById('address-preset').value;
    
    if (preset === 'yanping') {
        return ADDRESS_PRESETS.yanping;
    } else if (preset === 'shinkong') {
        return ADDRESS_PRESETS.shinkong;
    } else if (preset === 'custom') {
        const zh = document.getElementById('address_zh').value.trim();
        const en = document.getElementById('address_en').value.trim();
        if (zh || en) {
            return { zh: zh || '', en: en || '' };
        }
    }
    
    return null;
}
```

## Scenario 8: 樣式一致性
**Given**: nfc-generator.html 的樣式設計
**When**: 用戶查看表單
**Then**: Admin Dashboard 應保持相同的視覺風格

### 樣式要求：
- 使用 `.bilingual-field` 網格佈局
- 使用 `.lang-indicator` 標籤
- 使用 `details` 元素折疊進階資訊
- 保持相同的 input/textarea 樣式
- 保持相同的按鈕樣式

## Implementation Notes:
1. 保留所有現有功能（API 整合、通知系統、Tab 切換）
2. 只修改「創建名片」Tab 的表單結構
3. 不影響「列表」和「系統工具」Tab
4. 保留所有 Three.js 背景和設計樣式
5. 確保 API 呼叫時使用正確的資料格式
6. 預覽功能應即時更新所有新增欄位
