# 多語言支援設計方案

## 方案 A：語言自動偵測 + 動態 Prompt（推薦）

### 實作步驟

#### 1. 前端語言偵測（可選）
```javascript
// 使用 Tesseract.js 快速偵測語言（輕量級）
import Tesseract from 'tesseract.js';

async function detectLanguage(imageFile) {
  const result = await Tesseract.recognize(imageFile, 'jpn+kor+chi_tra+eng', {
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
  });
  
  // 返回主要語言
  return result.data.text.match(/[\u3040-\u309F\u30A0-\u30FF]/) ? 'ja' :
         result.data.text.match(/[\uAC00-\uD7AF]/) ? 'ko' :
         result.data.text.match(/[\u4E00-\u9FFF]/) ? 'zh' : 'en';
}
```

#### 2. 後端多語言 Prompt
```typescript
// unified-extract.ts

const PROMPTS = {
  zh: `你是專業的名片辨識與資訊補全系統...（當前 prompt）`,
  
  ja: `あなたはプロの名刺認識および情報補完システムです。以下のタスクを完了してください：

**タスク1：OCR認識**
名刺画像からすべての可視情報（氏名、会社、部署、役職、連絡先など）を正確に認識してください。

**タスク2：情報補完**
Google検索を使用して以下の情報を補完してください：
- 組織の正式名称、英語名、一般的な略称
- 組織概要（業界、事業内容、規模、運営状況）
- 部署名がある場合、その部署の組織内での役割を説明
- 個人概要（**厳密に30-50文字**：この人の専門性や代表的な実績を一文で要約）
- 名刺に公式サイトや住所がない場合、公式ソースから補完

**検索戦略**：
- 「氏名 + 組織/部署」を検索キーワードとして使用可能
- company_summaryは組織と部署のみを記述
- personal_summaryは簡潔に、一文で十分
- 公式ソース（組織の公式サイト、政府登録、専門プロフィール）を優先`,

  ko: `당신은 전문 명함 인식 및 정보 보완 시스템입니다. 다음 작업을 완료하세요:

**작업 1: OCR 인식**
명함 이미지에서 모든 가시 정보(이름, 회사, 부서, 직함, 연락처 등)를 정확하게 인식하세요.

**작업 2: 정보 보완**
Google 검색을 사용하여 다음 정보를 보완하세요:
- 조직의 정식 명칭, 영문명, 일반적인 약칭
- 조직 개요(산업, 주요 사업, 규모, 운영 현황)
- 부서명이 있는 경우 해당 부서의 조직 내 역할 설명
- 개인 개요(**엄격히 30-50자**: 이 사람의 전문성이나 대표적인 성과를 한 문장으로 요약)
- 명함에 공식 웹사이트나 주소가 없는 경우 공식 출처에서 보완

**검색 전략**:
- "이름 + 조직/부서"를 검색 키워드로 사용 가능
- company_summary는 조직과 부서만 설명
- personal_summary는 간결하게, 한 문장이면 충분
- 공식 출처(조직 공식 사이트, 정부 등록, 전문 프로필) 우선`,

  en: `You are a professional business card recognition and information enrichment system. Complete the following tasks:

**Task 1: OCR Recognition**
Accurately recognize all visible information from the business card image (name, company, department, title, contact details, etc.).

**Task 2: Information Enrichment**
Use Google Search to enrich the following information:
- Organization's full name, English name, common abbreviations
- Organization summary (industry, main business, scale, operational status)
- If department name exists, explain the department's function within the organization
- Personal summary (**strictly 30-50 characters**: summarize this person's expertise or representative achievements in one sentence)
- If the card lacks official website or address, supplement from official sources

**Search Strategy**:
- Can use "name + organization/department" as search keywords
- company_summary describes only the organization and department
- personal_summary must be concise, one sentence is sufficient
- Prioritize official sources (organization website, government registration, professional profiles)`
};

function getPrompt(language: string = 'zh'): string {
  return PROMPTS[language] || PROMPTS.zh;
}

// 修改 performUnifiedExtract 函數
async function performUnifiedExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  language: string = 'zh'  // 新增參數
): Promise<UnifiedExtractResult> {
  const prompt = getPrompt(language);
  // ... 其餘邏輯不變
}
```

#### 3. API 端點修改
```typescript
// Handler 中接收語言參數
interface UnifiedExtractRequest {
  upload_id: string;
  language?: 'zh' | 'ja' | 'ko' | 'en';  // 新增
}

// 自動偵測或使用用戶指定
const language = body.language || 'zh';
const result = await performUnifiedExtract(imageBase64, mimeType, apiKey, language);
```

### 優點
- ✅ 無需修改資料庫 schema
- ✅ 無需修改 JSON Schema
- ✅ Gemini 原生支援多語言
- ✅ 可選的前端語言偵測（成本低）

### 缺點
- ⚠️ 需要維護 4 種語言的 prompt
- ⚠️ 前端語言偵測增加 ~2 秒處理時間（可選）

---

## 方案 B：通用英文 Prompt（最簡單）

### 實作
```typescript
const prompt = `You are a professional business card OCR system. Extract all information and use Google Search to enrich company/personal details. Output in the original language of the card.`;
```

### 優點
- ✅ 單一 prompt，維護成本最低
- ✅ Gemini 會自動保留原始語言

### 缺點
- ⚠️ 對中文名片的理解可能不如中文 prompt 精確
- ⚠️ 搜尋結果可能偏向英文來源

---

## 方案 C：混合語言欄位（複雜）

### 資料庫 Schema 擴充
```sql
ALTER TABLE received_cards ADD COLUMN full_name_ja TEXT;
ALTER TABLE received_cards ADD COLUMN full_name_ko TEXT;
ALTER TABLE received_cards ADD COLUMN organization_ja TEXT;
ALTER TABLE received_cards ADD COLUMN organization_ko TEXT;
```

### 優點
- ✅ 支援多語言並存（例如：日文名片同時儲存日文和英文）

### 缺點
- ❌ 資料庫欄位爆炸（每個欄位 x 4 語言）
- ❌ 前端顯示邏輯複雜
- ❌ 不推薦

---

## 推薦實作順序

### Phase 1: 最小可行方案（1 小時）
1. 修改 prompt 為英文（方案 B）
2. 測試日文、韓文名片
3. 驗證 Gemini 是否保留原始語言

### Phase 2: 語言偵測（4 小時）
1. 前端加入語言選擇器（手動選擇）
2. 後端支援多語言 prompt（方案 A）
3. 測試 4 種語言的準確度

### Phase 3: 自動偵測（8 小時）
1. 整合 Tesseract.js 或使用 Gemini 預處理
2. 自動選擇最佳 prompt 語言
3. 效能優化

---

## 測試計畫

### 測試案例
1. **日文名片**：日本企業名片（漢字 + 假名）
2. **韓文名片**：韓國企業名片（韓文 + 英文）
3. **混合語言**：中英日混合名片
4. **特殊字符**：日文長音符號、韓文複合字

### 驗證指標
- OCR 準確率 > 95%
- 公司資訊補全成功率 > 80%
- 處理時間 < 5 秒

---

## 成本分析

| 方案 | 開發時間 | API 成本 | 維護成本 |
|------|---------|---------|---------|
| 方案 A | 4-8 小時 | 無變化 | 中（4 語言 prompt） |
| 方案 B | 1 小時 | 無變化 | 低（單一 prompt） |
| 方案 C | 16+ 小時 | 無變化 | 高（複雜 schema） |

**建議**：先實作方案 B（1 小時），收集真實日韓文名片數據後，再決定是否升級到方案 A。
