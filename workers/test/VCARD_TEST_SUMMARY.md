# vCard 測試摘要

## 測試檔案位置
- **自動化測試**: `workers/test/vcard.test.ts`
- **實作檔案**: `workers/src/handlers/user/received-cards/vcard.ts`

## 執行測試

### 自動化測試
```bash
cd workers
npm test vcard.test.ts
```

或從專案根目錄：
```bash
npm test --prefix workers vcard.test.ts
```

## 測試涵蓋範圍

### ✅ Scenario 1: 基本 vCard 格式驗證
- [x] 生成包含必填欄位的基本 vCard
- [x] 驗證 BEGIN:VCARD 和 END:VCARD
- [x] 驗證 VERSION:3.0
- [x] 驗證 FN 和 N 欄位
- [x] 支援中日韓 (CJK) 字元

**測試數量**: 3 個測試

### ✅ Scenario 2: 特殊字元轉義測試
- [x] 逗號 (`,`) 轉義為 `\,`
- [x] 分號 (`;`) 轉義為 `\;`
- [x] 反斜線 (`\`) 轉義為 `\\`
- [x] 換行符 (`\n`) 轉義為 `\\n`
- [x] CRLF (`\r\n`) 轉義為 `\\n`
- [x] 多重特殊字元組合測試

**測試數量**: 6 個測試

### ✅ Scenario 3: 完整欄位測試
- [x] 所有欄位都存在時正確包含
- [x] FN, N, ORG, TITLE, TEL, EMAIL, URL, ADR, NOTE
- [x] 結構化姓名 (first_name + last_name)
- [x] 完整 vCard 欄位數量驗證

**測試數量**: 3 個測試

### ✅ Scenario 4: 缺值欄位測試
- [x] 只包含必填欄位 (null 值)
- [x] 只包含必填欄位 (undefined 值)
- [x] 部分選填欄位測試
- [x] 不應包含空的選填欄位

**測試數量**: 3 個測試

### ✅ Scenario 5: 租戶隔離測試
- [x] 無權存取他人名片時回傳 404
- [x] 不洩漏名片存在性 (資源隱匿策略)
- [x] 有權存取自己的名片時成功回傳
- [x] 驗證資料庫查詢包含租戶隔離條件

**測試數量**: 3 個測試

### ✅ Scenario 6: CRLF 換行符驗證
- [x] 使用 CRLF (`\r\n`) 換行符
- [x] 不包含單獨的 LF (`\n`)
- [x] 所有行一致使用 CRLF
- [x] 特殊字元轉義後維持 CRLF

**測試數量**: 4 個測試

### ✅ Scenario 7: UTF-8 BOM 驗證
- [x] Content-Type 包含 `charset=utf-8`
- [x] 回應開頭包含 UTF-8 BOM (0xEF 0xBB 0xBF)
- [x] CJK 字元正確編碼
- [x] Content-Disposition 包含 .vcf 檔名

**測試數量**: 4 個測試

## 總計

**總測試數**: 26 個測試
**涵蓋場景**: 7 個 BDD Scenario

## 測試架構

```
workers/test/vcard.test.ts
├── Scenario 1: Basic vCard Format Validation (3 tests)
├── Scenario 2: Special Character Escaping (6 tests)
├── Scenario 3: Complete Field Validation (3 tests)
├── Scenario 4: Missing Optional Fields (3 tests)
├── Scenario 5: Tenant Isolation (3 tests)
├── Scenario 6: CRLF Line Endings Validation (4 tests)
└── Scenario 7: UTF-8 BOM Validation (4 tests)
```

## 手動測試 Checklist

### iOS 測試
- [ ] 下載 .vcf 檔案到 iPhone
- [ ] 點擊檔案選擇「加入聯絡人」
- [ ] 驗證所有欄位正確顯示
- [ ] 驗證中文字元正確顯示

### Android 測試
- [ ] 下載 .vcf 檔案到 Android
- [ ] 開啟 Google 聯絡人 App
- [ ] 匯入 vCard
- [ ] 驗證所有欄位正確顯示

### Windows 測試
- [ ] 下載 .vcf 檔案
- [ ] 使用 Outlook 開啟
- [ ] 驗證所有欄位正確顯示

### macOS 測試
- [ ] 下載 .vcf 檔案
- [ ] 雙擊開啟 (聯絡人 App)
- [ ] 驗證所有欄位正確顯示

## 驗證重點

### 格式正確性
- ✅ vCard 3.0 格式
- ✅ CRLF 換行符
- ✅ UTF-8 編碼 with BOM

### 特殊字元處理
- ✅ `,` → `\,`
- ✅ `;` → `\;`
- ✅ `\` → `\\`
- ✅ `\n` → `\\n`

### 安全性
- ✅ 租戶隔離
- ✅ 資源隱匿策略
- ✅ 404 不洩漏資訊

### 跨平台相容性
- ⏳ iOS 聯絡人 App (需手動測試)
- ⏳ Android Google 聯絡人 (需手動測試)
- ⏳ Windows Outlook (需手動測試)
- ⏳ macOS 聯絡人 App (需手動測試)

## 下一步

1. 執行自動化測試確認全部通過
2. 進行跨平台手動測試
3. 記錄手動測試結果
4. 如有問題，更新實作並重新測試

## 預估時間

- ✅ 自動化測試撰寫: 1 小時 (已完成)
- ⏳ 手動跨平台測試: 1 小時 (待進行)

## 測試框架

- **框架**: Vitest 3.2.0
- **執行器**: @cloudflare/vitest-pool-workers
- **語言**: TypeScript 5.5.2

## 依賴關係

測試使用以下 mock:
- `verifyOAuth` (OAuth 中介層)
- `DB.prepare` (Cloudflare D1 資料庫)

測試導入:
- `generateVCard` - vCard 字串生成函式
- `handleGetVCard` - vCard API 處理函式
