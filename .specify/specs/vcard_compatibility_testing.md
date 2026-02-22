# BDD Spec: vCard Compatibility Testing

## Feature: vCard 相容性測試 - 確保跨平台正常運作

### Background
目標：
- 驗證 vCard 3.0 格式正確性
- 測試特殊字元轉義
- 驗證跨平台相容性
- 確保租戶隔離

---

## Scenario 1: 基本 vCard 格式驗證

### Given: 一張簡單的名片
```javascript
{
  uuid: "test-uuid-001",
  full_name: "測試使用者",
  user_email: "test@example.com"
}
```

### When: 呼叫 vCard API
```bash
GET /api/user/received-cards/test-uuid-001/vcard
```

### Then: 回傳正確的 vCard 格式
- Status: 200
- Content-Type: text/vcard; charset=utf-8
- Content-Disposition: attachment; filename="測試使用者.vcf"
- Body 包含：
  ```
  BEGIN:VCARD
  VERSION:3.0
  FN:測試使用者
  N:測試使用者;;;;
  END:VCARD
  ```

---

## Scenario 2: 特殊字元轉義測試

### Given: 名片包含特殊字元
```javascript
{
  full_name: "Test, User; Name\\Test",
  organization: "Company, Inc.",
  note: "Line 1\nLine 2\nLine 3"
}
```

### When: 生成 vCard
### Then: 特殊字元正確轉義
```
FN:Test\, User\; Name\\Test
ORG:Company\, Inc.
NOTE:Line 1\\nLine 2\\nLine 3
```

**驗證點**：
- `,` → `\,`
- `;` → `\;`
- `\` → `\\`
- `\n` → `\\n`

---

## Scenario 3: 完整欄位測試

### Given: 名片包含所有欄位
```javascript
{
  full_name: "吳勝繙",
  organization: "數位發展部",
  title: "科長",
  phone: "+886-912-345-678",
  email: "user@example.com",
  website: "https://moda.gov.tw",
  address: "台北市中正區寶慶路3號",
  note: "展會交換的名片"
}
```

### When: 生成 vCard
### Then: 所有欄位正確包含
- ✅ FN (必填)
- ✅ N (必填)
- ✅ ORG
- ✅ TITLE
- ✅ TEL;TYPE=CELL
- ✅ EMAIL
- ✅ URL
- ✅ ADR
- ✅ NOTE

---

## Scenario 4: 缺值欄位測試

### Given: 名片只有必填欄位
```javascript
{
  full_name: "簡單名片"
}
```

### When: 生成 vCard
### Then: 只包含必填欄位
```
BEGIN:VCARD
VERSION:3.0
FN:簡單名片
N:簡單名片;;;;
END:VCARD
```

**驗證點**：
- 不應包含空的可選欄位
- 格式簡潔

---

## Scenario 5: 租戶隔離測試

### Given: 使用者 A 登入
### When: 嘗試存取使用者 B 的名片
```bash
GET /api/user/received-cards/{user_b_card_uuid}/vcard
```

### Then: 回傳 404
- Status: 404
- Body: { "error": "CARD_NOT_FOUND", "message": "Card not found" }

**驗證點**：
- 不洩漏名片存在性
- 資源隱匿策略

---

## Scenario 6: CRLF 換行符驗證

### Given: 生成的 vCard 字串
### When: 檢查換行符
### Then: 所有換行符應為 CRLF (`\r\n`)

**驗證方法**：
```javascript
const lines = vcard.split('\r\n');
assert(lines.length > 0);
assert(!vcard.includes('\n\n')); // 不應有單獨的 LF
```

---

## Scenario 7: UTF-8 BOM 驗證

### Given: vCard 回應
### When: 檢查 Content-Type
### Then: 應包含 `charset=utf-8`

**驗證點**：
- Content-Type: text/vcard; charset=utf-8
- 支援中文字元

---

## Acceptance Criteria

### 自動化測試
- [ ] 基本格式測試通過
- [ ] 特殊字元轉義測試通過
- [ ] 完整欄位測試通過
- [ ] 缺值欄位測試通過
- [ ] 租戶隔離測試通過
- [ ] CRLF 換行符測試通過
- [ ] UTF-8 編碼測試通過

### 手動測試（跨平台）
- [ ] iOS 聯絡人 App 匯入成功
- [ ] Android Google 聯絡人匯入成功
- [ ] Windows Outlook 匯入成功
- [ ] macOS 聯絡人 App 匯入成功

---

## Test Implementation

### 測試檔案位置
- **新增**：`workers/tests/vcard.test.ts`

### 測試框架
- Vitest（已在專案中使用）

### 測試結構
```typescript
describe('vCard Generation', () => {
  test('should generate basic vCard', () => {
    const card = { full_name: '測試使用者' };
    const vcard = generateVCard(card);
    
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:測試使用者');
    expect(vcard).toContain('END:VCARD');
  });
  
  test('should escape special characters', () => {
    const card = { full_name: 'Test, User; Name\\Test' };
    const vcard = generateVCard(card);
    
    expect(vcard).toContain('FN:Test\\, User\\; Name\\\\Test');
  });
  
  test('should use CRLF line endings', () => {
    const card = { full_name: '測試' };
    const vcard = generateVCard(card);
    
    expect(vcard.split('\r\n').length).toBeGreaterThan(1);
    expect(vcard).not.toMatch(/\n(?!\r)/); // 不應有單獨的 LF
  });
});

describe('vCard API', () => {
  test('should return 404 for unauthorized access', async () => {
    // 租戶隔離測試
  });
});
```

---

## Manual Testing Checklist

### iOS 測試步驟
1. 下載 .vcf 檔案到 iPhone
2. 點擊檔案
3. 選擇「加入聯絡人」
4. 驗證所有欄位正確顯示
5. 驗證中文字元正確顯示

### Android 測試步驟
1. 下載 .vcf 檔案到 Android
2. 開啟 Google 聯絡人 App
3. 匯入 vCard
4. 驗證所有欄位正確顯示

### Windows 測試步驟
1. 下載 .vcf 檔案
2. 使用 Outlook 開啟
3. 驗證所有欄位正確顯示

### macOS 測試步驟
1. 下載 .vcf 檔案
2. 雙擊開啟（聯絡人 App）
3. 驗證所有欄位正確顯示

---

## Non-Goals (本階段不做)

- ❌ 效能測試（Phase 2）
- ❌ 壓力測試（Phase 2）
- ❌ vCard 4.0 測試（Phase 2）

---

## Estimated Time: 2 hours

- 自動化測試撰寫：1 小時
- 手動測試（跨平台）：1 小時
