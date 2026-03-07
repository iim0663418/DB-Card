# ADR-005: 雙標籤系統設計

## 狀態
已接受 (2026-02-26)

## 背景
系統目前有兩套標籤系統：
1. **關鍵字標籤** (auto_keyword): 基於規則的即時標籤
2. **智慧標籤** (auto): 基於 AI 的定時標籤

## 決策
保持雙標籤系統，兩者互補使用。

## 理由

### 關鍵字標籤 (auto_keyword)
- **用途**: 組織類型分類
- **標籤**: `government`, `listed`, `startup`, `ngo`
- **觸發**: 儲存名片時即時生成
- **準確度**: 100% (規則匹配)
- **成本**: 零
- **前端**: 標籤篩選器

### 智慧標籤 (auto)
- **用途**: 產業與地區分類
- **標籤**: `industry:會計`, `location:台北`, `expertise:稅務`
- **觸發**: Cron job 每日 18:00
- **準確度**: 90%+ (AI 推論)
- **成本**: Gemini API
- **前端**: 搜尋結果增強

## 優勢
1. **互補性**: 組織類型 + 產業地區，覆蓋不同維度
2. **即時性**: 關鍵字標籤即時可用，智慧標籤延遲生成
3. **成本控制**: 關鍵字標籤零成本，智慧標籤按需使用
4. **準確度**: 關鍵字標籤 100% 準確，智慧標籤提供更多資訊

## 劣勢
1. **複雜度**: 兩套系統需要分別維護
2. **用戶理解**: 可能需要說明兩種標籤的差異

## 替代方案

### 方案 A: 統一為智慧標籤
- **優點**: 系統簡化
- **缺點**: 成本增加、即時性降低、準確度可能下降
- **結論**: 不採用

### 方案 B: 只用關鍵字標籤
- **優點**: 零成本、100% 準確
- **缺點**: 標籤維度有限、無法提供產業/地區資訊
- **結論**: 不採用

## 實作細節

### 資料庫結構
```sql
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_source TEXT NOT NULL, -- 'auto_keyword' or 'auto'
  created_at INTEGER NOT NULL
);
```

### 前端使用
- **標籤篩選**: 使用關鍵字標籤 (`government`, `listed`, `startup`, `ngo`)
- **搜尋結果**: 顯示智慧標籤 (`industry:`, `location:`)

### 未來擴展
- 可新增手動標籤 (tag_source: 'manual')
- 可整合顯示兩種標籤
- 可支援標籤編輯功能

## 參考
- `src/utils/tags.ts` - 關鍵字標籤提取
- `src/cron/auto-tag-cards.ts` - 智慧標籤生成
- `src/handlers/user/received-cards/search.ts` - 搜尋增強

## 決策者
Kiro (AWS AI Assistant) + User

## 決策日期
2026-02-26
