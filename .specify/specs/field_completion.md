# BDD Spec: 名片欄位補全 (Field Completion)

## Feature: 使用 Web Search 補齊名片欄位
作為使用者，我想在編輯名片時使用 AI 補齊缺失的欄位，讓名片資料更完整。

## Scenario 1: 補齊名片上沒有的欄位
**Given** 使用者正在編輯一張名片
**And** 名片有基本資訊（姓名、公司、職稱）
**And** 某些欄位是空的（網站、地址、別名）
**When** 使用者點擊「補充名片資訊」按鈕
**Then** 系統使用 Web Search 查詢相關資訊
**And** 自動填入以下欄位（如果找到）：
  - `name_prefix`: 稱謂（Dr., Mr., Mrs.）
  - `name_suffix`: 頭銜後綴（Ph.D., Jr., M.D.）
  - `website`: 公司網站
  - `address`: 公司地址
  - `department`: 部門（如果名片上沒有）
**And** 不覆蓋已有資料的欄位
**And** 顯示成功訊息

## Scenario 2: 標準化現有欄位
**Given** 名片已有部分資訊
**When** 使用 Web Search 補齊
**Then** 標準化以下欄位：
  - `organization`: 完整公司名稱（如果只有簡稱）
  - `title`: 標準化職稱格式
**And** 保留使用者手動輸入的資料優先權

## API Endpoint
```
POST /api/user/received-cards/:uuid/complete-fields
```

## Request Body
```json
{
  "full_name": "吳勝繙",
  "organization": "數位發展部",
  "title": "科長"
}
```

## Response
```json
{
  "success": true,
  "data": {
    "name_prefix": null,
    "name_suffix": null,
    "organization": "數位發展部",
    "department": "資訊處",
    "website": "https://moda.gov.tw",
    "address": "100057臺北市中正區延平南路143號",
    "title": "資訊處共用系統科科長"
  }
}
```

## 與現有 enrich API 的差異
| 功能 | enrich API | complete-fields API |
|------|-----------|---------------------|
| 用途 | 生成摘要 | 補齊欄位 |
| 回傳 | company_summary, personal_summary, sources | 具體欄位值 |
| 使用場景 | 回家後補齊（查看詳情） | 編輯時補齊（編輯表單） |
| 更新方式 | PATCH 更新 ai_status | 填入表單欄位 |

## Security
- ✅ OAuth 驗證
- ✅ Tenant isolation (user_email)
- ✅ Rate limiting (每張卡片 5 分鐘內只能補齊一次)
- ✅ 只允許 HTTPS URLs

## Implementation Notes
- 使用 Gemini API 的 Web Search 功能
- Prompt 設計：只回傳欄位值，不生成摘要
- 不覆蓋已有資料（前端判斷）
- 回傳 null 表示找不到該欄位
