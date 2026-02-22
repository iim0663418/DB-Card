# BDD Spec: Received Cards Full Schema Utilization

## Scenario 1: Display AI-Generated Summaries
**Given**: 
- received_cards 有 company_summary 和 personal_summary
- ai_status = 'completed'

**When**: 
- 使用者查看名片詳情

**Then**:
- 顯示「公司簡介」區塊 (company_summary)
- 顯示「個人簡介」區塊 (personal_summary)
- 顯示 AI 來源標記 (ai_sources_json)

## Scenario 2: Display Bilingual Organization
**Given**:
- received_cards 有 organization_en 或 organization_alias

**When**:
- 使用者查看名片列表或詳情

**Then**:
- 顯示中文名稱 (organization)
- 顯示英文名稱 (organization_en) - 如存在
- 顯示別名 (organization_alias) - 如存在

## Scenario 3: Display Update Timestamp
**Given**:
- received_cards 有 updated_at

**When**:
- 使用者查看名片詳情

**Then**:
- 顯示「最後更新」時間
- 格式：YYYY-MM-DD HH:mm

## Scenario 4: Display Name Components
**Given**:
- received_cards 有 first_name, last_name, name_prefix, name_suffix

**When**:
- 使用者查看名片詳情

**Then**:
- 顯示完整姓名結構
- 格式：[prefix] first_name last_name [suffix]

## Technical Requirements
- 最小化 HTML 變更
- 使用現有 CSS 樣式
- 保持響應式設計
- 空值不顯示（避免空白區塊）

## Files to Modify
1. `public/js/received-cards.js` - renderCardHTML() 和 openCardDetail()
2. 不需要修改 API（已回傳所有欄位）
