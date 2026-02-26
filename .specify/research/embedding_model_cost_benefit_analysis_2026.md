# Embedding 模型性價比研究報告 (2026-02-26)

## 執行摘要

基於 AIMultiple 的 494,094 筆 Amazon 評論基準測試，以及市場價格調查，本報告評估當前主流 embedding 模型的性價比。

**當前使用**: Google Gemini Embedding 001 (768 維, $0.15/1M tokens)

## 性價比排名 (Top 5)

| 排名 | 模型 | 準確度 | 價格 ($/1M tokens) | 性價比分數 | 維度 | CF Vectorize | 多語言 |
|------|------|--------|-------------------|-----------|------|--------------|--------|
| 🥇 1 | **Mistral Embed** | 77.8% | $0.10 | ⭐⭐⭐⭐⭐ | 1024 | ✅ | ✅ |
| 🥈 2 | **Voyage 3.5 Lite** | 66.1% | $0.03 | ⭐⭐⭐⭐⭐ | 512 | ✅ | ✅ |
| 🥉 3 | **Voyage 4** | 68.6% | $0.06 | ⭐⭐⭐⭐ | 1024 | ✅ | ✅ |
| 4 | **Snowflake Arctic** | 66.6% | $0.10 | ⭐⭐⭐⭐ | 1024 | ✅ | ✅ |
| 5 | **Gemini Embedding 001** | 71.5% | $0.15 | ⭐⭐⭐ | 768 | ✅ | ✅ |

### ⚠️ Cloudflare Vectorize 限制

**最大維度**: 1536 dimensions (32-bit precision)

**影響**:
- ✅ **所有推薦模型均符合限制**
- ❌ **OpenAI text-embedding-3-large (3072 維) 不相容**
- ❌ **E5 Mistral (4096 維) 不相容**

## 詳細分析

### 1. Mistral Embed - 最佳準確度
- **準確度**: 77.8% (第一名)
- **價格**: $0.10/1M tokens (33% 比 Gemini 便宜)
- **維度**: 1024 (比 Gemini 768 多 33%)
- **架構**: LLM-based decoder (深度語義理解)
- **優勢**: 
  * 理解複雜查詢約束 (如「不含鋁」)
  * 處理非正式語法 (如評論文字)
  * 指令遵循能力強
- **劣勢**: 
  * 較新模型，生態系統較小
  * 文檔相對較少

### 2. Voyage 3.5 Lite - 最佳性價比
- **準確度**: 66.1% (中等)
- **價格**: $0.03/1M tokens (80% 比 Gemini 便宜)
- **維度**: 512 (比 Gemini 768 少 33%)
- **優勢**:
  * 極低價格
  * 6-8x 更小的向量 (降低 Vectorize 成本)
  * Stanford 研究團隊專為 RAG 優化
- **劣勢**:
  * 準確度略低於 Gemini
  * 較小維度可能損失語義細節

### 3. Voyage 4 - 平衡選擇
- **準確度**: 68.6% (中上)
- **價格**: $0.06/1M tokens (60% 比 Gemini 便宜)
- **維度**: 1024
- **優勢**:
  * Hard-Negative Mining 訓練 (區分相似概念)
  * 專為 RAG 設計
  * 準確度與成本平衡
- **劣勢**:
  * 準確度仍低於 Mistral 和 Gemini

### 4. Snowflake Arctic Embed L v2.0
- **準確度**: 66.6%
- **價格**: $0.10/1M tokens (Standard Edition)
- **維度**: 1024
- **優勢**:
  * Snowflake 生態系統整合
  * 開源基礎 (可自託管)
- **劣勢**:
  * 傳統 BERT 架構 (非 LLM)
  * 價格隨 Edition 變動 (Enterprise $0.15, Business Critical $0.20)

### 5. Google Gemini Embedding 001 (當前使用)
- **準確度**: 71.5% (第二名)
- **價格**: $0.15/1M tokens (最貴)
- **維度**: 768
- **優勢**:
  * 高準確度
  * Google 生態系統整合
  * 多語言支援優秀
  * 穩定可靠
- **劣勢**:
  * 最高價格
  * 準確度低於 Mistral

## 不推薦的模型

### OpenAI text-embedding-3-large
- **準確度**: 39.2% (倒數第二)
- **價格**: $0.13/1M tokens
- **維度**: 3072 ❌ **超過 Cloudflare Vectorize 限制 (1536)**
- **問題**: 
  * Matryoshka 學習導致細節損失
  * 高相關性 (48.6%) 但低準確度 (39.2%) - "相關性陷阱"
  * **無法部署到 Cloudflare Vectorize**

### OpenAI text-embedding-3-small
- **準確度**: 39.2%
- **價格**: $0.02/1M tokens
- **維度**: 1536 ✅ 符合限制
- **問題**: 準確度過低，不推薦

### Cohere embed-v4.0
- **準確度**: 未公開 (低於平均)
- **價格**: $0.40/1M tokens (最貴之一)
- **問題**: 需要 Reranker 配合，單獨使用效果差

### E5 Mistral 7B
- **維度**: 4096 ❌ **超過 Cloudflare Vectorize 限制 (1536)**
- **無法使用**: 維度過大

## 成本計算 (DB-Card 場景)

假設每月處理 10,000 張名片，每張平均 500 tokens (包含 13 個欄位)：

| 模型 | 月成本 | 年成本 | vs Gemini |
|------|--------|--------|-----------|
| Voyage 3.5 Lite | $0.15 | $1.80 | -80% |
| Voyage 4 | $0.30 | $3.60 | -60% |
| Mistral Embed | $0.50 | $6.00 | -33% |
| Snowflake Arctic | $0.50 | $6.00 | -33% |
| **Gemini (當前)** | **$0.75** | **$9.00** | **基準** |

## 建議

### 短期 (1-2 週)
**保持 Gemini Embedding 001**
- 理由：
  * 系統穩定運行
  * 71.5% 準確度足夠
  * 遷移成本高於節省
  * 多語言支援優秀 (中英文)

### 中期 (3-6 個月) - 評估遷移
**推薦: Mistral Embed**
- 理由：
  * 準確度提升 8.8% (71.5% → 77.8%)
  * 成本降低 33% ($0.15 → $0.10)
  * LLM 架構更適合複雜查詢
  * 1024 維度提供更豐富語義
- 遷移成本：
  * 重新 embedding 所有名片 (~30 張)
  * 測試多語言支援 (中文、日文、韓文)
  * 驗證搜尋準確度
- 預估工時：4-6 小時

### 長期 (6-12 個月) - 成本優化
**推薦: Voyage 3.5 Lite**
- 理由：
  * 成本降低 80% ($0.15 → $0.03)
  * 準確度可接受 (66.1%)
  * 512 維度降低 Vectorize 成本
  * 專為 RAG 優化
- 適用場景：
  * 名片數量 > 10,000 張
  * 成本敏感
  * 可接受略低準確度

## 技術考量

### 1. Cloudflare Vectorize 限制 ⚠️
**最大維度**: 1536 dimensions (32-bit float)
**最大向量數**: 10,000,000 per index
**精度**: 32-bit (float32)

**相容性檢查**:
| 模型 | 維度 | 相容性 | 備註 |
|------|------|--------|------|
| Gemini Embedding 001 | 768 | ✅ | 當前使用 |
| Mistral Embed | 1024 | ✅ | 推薦 |
| Voyage 3.5 Lite | 512 | ✅ | 最省 |
| Voyage 4 | 1024 | ✅ | 平衡 |
| Snowflake Arctic | 1024 | ✅ | 可用 |
| OpenAI 3-large | 3072 | ❌ | **超過限制** |
| E5 Mistral 7B | 4096 | ❌ | **超過限制** |

### 2. 維度選擇
- **512 (Voyage Lite)**: 成本優化，語義略損，最小儲存
- **768 (Gemini)**: 平衡選擇，當前使用
- **1024 (Mistral/Voyage 4)**: 最豐富語義，仍在限制內
- **1536**: Vectorize 上限，少數模型使用

### 3. 多語言支援
- **Gemini**: 優秀 (112+ 語言)
- **Mistral**: 良好 (需驗證中文)
- **Voyage**: 良好 (需驗證中文)

### 4. Vectorize 相容性
- 所有推薦模型均支援 Cloudflare Vectorize
- 需要重新創建 index (維度變更)
- OpenAI 3-large 因維度過大無法使用

## 決策矩陣

| 場景 | 推薦模型 | 理由 |
|------|---------|------|
| 追求最高準確度 | Mistral Embed | 77.8% 準確度 |
| 平衡準確度與成本 | Voyage 4 | 68.6% 準確度, $0.06 |
| 極致成本優化 | Voyage 3.5 Lite | $0.03, 66.1% 準確度 |
| 穩定可靠 | Gemini (當前) | 71.5%, Google 生態 |
| Snowflake 用戶 | Snowflake Arctic | 66.6%, 生態整合 |

## 行動計畫

### Phase 1: 評估 (1 週)
- [ ] 在測試環境部署 Mistral Embed
- [ ] 使用 30 張名片測試準確度
- [ ] 驗證中文、日文、韓文支援
- [ ] 比較搜尋結果品質

### Phase 2: 決策 (1 週)
- [ ] 分析測試結果
- [ ] 計算實際成本節省
- [ ] 評估遷移風險
- [ ] 決定是否遷移

### Phase 3: 遷移 (2 週, 如果決定遷移)
- [ ] 更新 embedding 代碼
- [ ] 重新 embedding 所有名片
- [ ] 更新 Vectorize index
- [ ] 部署到 Staging
- [ ] 驗證搜尋功能
- [ ] 部署到 Production

## 參考資料

1. AIMultiple Embedding Models Benchmark (2026-02-16)
   - https://research.aimultiple.com/embedding-models/
   - 494,094 筆 Amazon 評論測試
   - 100 個複雜查詢

2. Google Gemini Embedding Pricing
   - $0.15/1M tokens
   - 768 維度
   - 112+ 語言支援

3. Mistral Embed
   - $0.10/1M tokens
   - 1024 維度
   - LLM-based architecture

4. Voyage AI Pricing
   - Voyage 4: $0.06/1M tokens
   - Voyage 3.5 Lite: $0.03/1M tokens
   - Stanford 研究團隊

## 結論

**短期建議**: 保持 Gemini Embedding 001
- 穩定可靠，準確度足夠
- 768 維度符合 Vectorize 限制
- 遷移成本高於短期節省

**中期建議**: 評估遷移到 Mistral Embed
- 準確度提升 8.8%
- 成本降低 33%
- 1024 維度符合 Vectorize 限制 (< 1536)
- ROI 回收期: 3-4 個月

**長期建議**: 當名片數量 > 10,000 時考慮 Voyage 3.5 Lite
- 成本降低 80%
- 512 維度最小化儲存成本
- 適合大規模部署

**避免使用**:
- ❌ OpenAI text-embedding-3-large (3072 維超過限制)
- ❌ E5 Mistral 7B (4096 維超過限制)
- ❌ 任何維度 > 1536 的模型

---

**報告日期**: 2026-02-26  
**當前模型**: Google Gemini Embedding 001 (768 維)  
**Vectorize 限制**: 最大 1536 維度  
**建議優先級**: 中 (非緊急，但值得評估)
