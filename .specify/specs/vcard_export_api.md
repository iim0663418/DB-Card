# BDD Spec: vCard Export API

## Feature: vCard 匯出 - 讓使用者能將名片匯入手機通訊錄

### Background
當前問題：
- 使用者無法將名片匯出到手機通訊錄
- 缺少標準化的聯絡人交換格式

目標：
- 支援 vCard 3.0 格式（RFC 2426）
- 一鍵下載 .vcf 檔案
- 相容 iOS、Android、Windows、macOS

---

## Scenario 1: vCard 生成邏輯

### Given: 一張完整的名片資料
### When: 呼叫 `generateVCard(card)`
### Then: 回傳符合 RFC 2426 的 vCard 3.0 字串

**欄位映射**：
```
FN: full_name (必填)
N: last_name;first_name;;; (若無則用 full_name)
ORG: organization (可選)
TITLE: title (可選)
TEL;TYPE=CELL: phone (可選)
EMAIL: email (可選)
URL: website (可選)
ADR: ;;address;;;; (可選)
NOTE: note (可選)
```

**特殊字元轉義**：
- `\` → `\\`
- `,` → `\,`
- `;` → `\;`
- `\n` → `\\n`

**換行符**：CRLF (`\r\n`)

**編碼**：UTF-8 with BOM

---

## Scenario 2: vCard API 端點

### Given: 使用者已登入且擁有名片
### When: GET /api/user/received-cards/:uuid/vcard
### Then:
- 驗證使用者權限（租戶隔離）
- 生成 vCard 字串
- 回傳檔案下載

**Response Headers**：
```
Content-Type: text/vcard; charset=utf-8
Content-Disposition: attachment; filename="{full_name}.vcf"
Cache-Control: no-cache
```

**錯誤處理**：
- 404: Card not found or not authorized (租戶隔離)
- 500: Server error

---

## Scenario 3: 特殊字元轉義測試

### Given: 名片包含特殊字元
```javascript
{
  full_name: "Test, User; Name\\Test",
  organization: "Company, Inc.",
  note: "Line 1\nLine 2"
}
```

### When: 生成 vCard
### Then: 特殊字元應正確轉義
```
FN:Test\, User\; Name\\Test
ORG:Company\, Inc.
NOTE:Line 1\\nLine 2
```

---

## Scenario 4: 缺值欄位處理

### Given: 名片只有必填欄位
```javascript
{
  full_name: "吳勝繙"
}
```

### When: 生成 vCard
### Then: 只包含必填欄位，其他欄位省略
```
BEGIN:VCARD
VERSION:3.0
FN:吳勝繙
N:吳勝繙;;;;
END:VCARD
```

---

## Scenario 5: 完整名片範例

### Given: 名片包含所有欄位
```javascript
{
  full_name: "吳勝繙",
  organization: "數位發展部",
  title: "資訊處共用系統科科長",
  phone: "+886-912-345-678",
  email: "user@example.com",
  website: "https://moda.gov.tw",
  address: "台北市中正區寶慶路3號",
  note: "展會交換的名片"
}
```

### When: 生成 vCard
### Then: 完整的 vCard 3.0 格式
```
BEGIN:VCARD
VERSION:3.0
FN:吳勝繙
N:吳;勝繙;;;
ORG:數位發展部
TITLE:資訊處共用系統科科長
TEL;TYPE=CELL:+886-912-345-678
EMAIL:user@example.com
URL:https://moda.gov.tw
ADR:;;台北市中正區寶慶路3號;;;;
NOTE:展會交換的名片
END:VCARD
```

---

## Scenario 6: 租戶隔離驗證

### Given: 使用者 A 嘗試存取使用者 B 的名片
### When: GET /api/user/received-cards/{user_b_card_uuid}/vcard
### Then:
- 回傳 404 Not Found（資源隱匿）
- 不洩漏名片存在性

---

## Acceptance Criteria

### 後端
- [ ] `generateVCard()` 函式已實作
- [ ] 特殊字元轉義正確
- [ ] 換行符使用 CRLF
- [ ] UTF-8 with BOM 編碼
- [ ] `handleGetVCard()` API 已實作
- [ ] 租戶隔離驗證
- [ ] 路由註冊：`GET /api/user/received-cards/:uuid/vcard`

### 測試
- [ ] TypeScript 編譯通過
- [ ] 特殊字元測試通過
- [ ] 缺值欄位測試通過
- [ ] 完整名片測試通過
- [ ] 租戶隔離測試通過

---

## Implementation Details

### 檔案位置
- **新增**：`workers/src/handlers/user/received-cards/vcard.ts`
- **修改**：`workers/src/index.ts`（路由註冊）

### 函式簽名
```typescript
// 生成 vCard 字串
function generateVCard(card: ReceivedCard): string

// API 處理函式
export async function handleGetVCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response>
```

### vCard 模板
```typescript
const vcard = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  `FN:${escapeVCardValue(card.full_name)}`,
  `N:${generateNameField(card)}`,
  card.organization ? `ORG:${escapeVCardValue(card.organization)}` : null,
  card.title ? `TITLE:${escapeVCardValue(card.title)}` : null,
  card.phone ? `TEL;TYPE=CELL:${card.phone}` : null,
  card.email ? `EMAIL:${card.email}` : null,
  card.website ? `URL:${card.website}` : null,
  card.address ? `ADR:;;${escapeVCardValue(card.address)};;;;` : null,
  card.note ? `NOTE:${escapeVCardValue(card.note)}` : null,
  'END:VCARD'
].filter(Boolean).join('\r\n');
```

### 轉義函式
```typescript
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')    // \ → \\
    .replace(/,/g, '\\,')      // , → \,
    .replace(/;/g, '\\;')      // ; → \;
    .replace(/\r\n/g, '\\n')   // CRLF → \n
    .replace(/\n/g, '\\n');    // LF → \n
}
```

### 姓名欄位處理
```typescript
function generateNameField(card: ReceivedCard): string {
  // 若有 first_name 和 last_name，使用分隔格式
  if (card.last_name && card.first_name) {
    return `${escapeVCardValue(card.last_name)};${escapeVCardValue(card.first_name)};;;`;
  }
  // 否則使用 full_name
  return `${escapeVCardValue(card.full_name)};;;;`;
}
```

---

## Non-Goals (本階段不做)

- ❌ QR Code 顯示（Week 2）
- ❌ 批次匯出（Phase 2）
- ❌ vCard 4.0 支援（Phase 2）
- ❌ 照片欄位（Phase 2）

---

## Technical Notes

1. **RFC 2426 合規**：
   - 必須使用 CRLF (`\r\n`) 作為換行符
   - 特殊字元必須轉義
   - UTF-8 編碼

2. **相容性**：
   - iOS 聯絡人 App：✅
   - Android Google 聯絡人：✅
   - Windows Outlook：✅
   - macOS 聯絡人 App：✅

3. **檔名處理**：
   - 使用 `full_name` 作為檔名
   - 移除特殊字元（避免檔案系統問題）
   - 範例：`吳勝繙.vcf`

4. **快取策略**：
   - `Cache-Control: no-cache`（名片可能更新）
   - 不使用 ETag（簡化實作）

---

## Estimated Time: 4 hours

- vCard 生成邏輯：2 小時
- API 實作：1 小時
- 測試與驗證：1 小時
