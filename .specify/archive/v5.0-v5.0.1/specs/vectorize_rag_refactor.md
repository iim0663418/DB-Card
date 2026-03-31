# BDD Spec: Vectorize RAG 最佳實踐重構

## 背景
當前 Vectorize 使用方式不符合 RAG 最佳實踐：
1. Embedding 內容不一致（sync 13 欄位 vs deduplicate 4 欄位）
2. 重複呼叫 Gemini API 生成已存在的 embedding
3. Metadata 設計過於簡單
4. 缺乏結構化 context template

## Scenario 1: 統一 Embedding 生成函式
**Given**: 名片資料包含 13 個欄位
**When**: 任何模組需要生成 embedding 時
**Then**: 
- 使用統一的 `generateCardText()` 函式
- 採用結構化 template（欄位標籤 + 換行）
- 所有模組（sync/deduplicate/search）使用相同邏輯

**Acceptance Criteria**:
```typescript
// src/utils/embedding.ts
export function generateCardText(card: CardData): string {
  // 結構化 template
  const sections = [
    `姓名: ${card.full_name}`,
    card.organization && `公司: ${card.organization}${card.organization_en ? ` (${card.organization_en})` : ''}`,
    card.title && `職稱: ${card.title}`,
    card.department && `部門: ${card.department}`,
    card.company_summary && `公司簡介: ${card.company_summary}`,
    card.personal_summary && `個人簡介: ${card.personal_summary}`,
    (card.email || card.phone) && `聯絡方式: ${[card.email, card.phone].filter(Boolean).join(', ')}`,
    card.address && `地址: ${card.address}`,
    card.website && `網站: ${card.website}`,
    card.note && `備註: ${card.note}`
  ].filter(Boolean);
  
  return sections.join('\n');
}
```

---

## Scenario 2: 本地 Cosine Similarity 計算
**Given**: 兩張名片的 UUID (uuidA, uuidB)
**When**: 需要計算相似度時
**Then**:
- 使用 `VECTORIZE.getByIds([uuidA, uuidB])` 取得已存在的向量
- 本地計算 cosine similarity
- **零 Gemini API 呼叫**

**Acceptance Criteria**:
```typescript
// src/utils/vector-similarity.ts
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// deduplicate-cards.ts
async function queryVectorizeSimilarity(
  env: Env,
  uuidA: string,
  uuidB: string
): Promise<{ score: number; reason: string }> {
  const vectors = await env.VECTORIZE.getByIds([uuidA, uuidB]);
  
  if (vectors.length !== 2) {
    return { score: 0, reason: 'Vector not found in Vectorize' };
  }
  
  const similarity = cosineSimilarity(vectors[0].values, vectors[1].values);
  
  return {
    score: similarity,
    reason: `Local cosine: ${similarity.toFixed(3)}`
  };
}
```

---

## Scenario 3: 豐富 Metadata 結構
**Given**: 名片資料
**When**: 同步到 Vectorize 時
**Then**:
- Metadata 包含 3 層：Filter / Display / Timestamp
- 支援 pre-filtering（降低延遲 30-50%）
- 支援 faceted search（industry, location）

**Acceptance Criteria**:
```typescript
// types.ts
export interface VectorMetadata {
  // Filter 層 (用於 pre-filtering)
  user_email: string;
  organization_normalized: string;
  industry?: string;
  location?: string;
  
  // Display 層 (用於結果顯示)
  full_name: string;
  organization: string;
  title: string;
  department?: string;
  
  // Timestamp 層 (用於 recency filtering)
  created_at: number;
  updated_at: number;
}

// sync-card-embeddings.ts
metadata: {
  user_email: card.user_email,
  organization_normalized: card.organization_normalized || card.organization,
  industry: extractIndustry(card),
  location: extractLocation(card),
  full_name: card.full_name,
  organization: card.organization,
  title: card.title,
  department: card.department,
  created_at: card.created_at,
  updated_at: card.updated_at
}
```

---

## Scenario 4: 移除重複 API 呼叫
**Given**: `deduplicate-cards.ts` 中的 `getCardEmbedding()` 和 `generateTextEmbedding()`
**When**: 重構後
**Then**:
- 完全移除這兩個函式
- 所有相似度計算使用 `getByIds()` + 本地計算
- Gemini API 呼叫僅在 sync 階段發生

**Acceptance Criteria**:
- `getCardEmbedding()` 函式被刪除
- `generateTextEmbedding()` 函式被刪除
- `checkCompanyRelationship()` 使用 Vectorize query + metadata filter
- `checkPersonIdentity()` 使用 getByIds() + 本地計算

---

## Scenario 5: Hybrid Search (Semantic + Keyword)
**Given**: 使用者搜尋查詢
**When**: 執行搜尋時
**Then**:
- Semantic Search: Vectorize query (top 50)
- Keyword Search: D1 FTS (top 50)
- Merge + Re-rank 結果

**Acceptance Criteria**:
```typescript
// search.ts
async function hybridSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // 1. Semantic Search
  const semanticResults = await semanticSearch(env, userEmail, query, 50);
  
  // 2. Keyword Search (D1 FTS)
  const keywordResults = await keywordSearch(env, userEmail, query, 50);
  
  // 3. Merge + Re-rank (RRF - Reciprocal Rank Fusion)
  const merged = mergeAndRerank(semanticResults, keywordResults);
  
  return merged.slice(0, limit);
}
```

---

## Scenario 6: D1 FTS 支援
**Given**: 需要 keyword search
**When**: 創建 FTS 虛擬表
**Then**:
- Migration 0036: 創建 `received_cards_fts` 虛擬表
- 索引欄位: full_name, organization, title, department, note

**Acceptance Criteria**:
```sql
-- migrations/0036_received_cards_fts.sql
CREATE VIRTUAL TABLE received_cards_fts USING fts5(
  uuid UNINDEXED,
  full_name,
  organization,
  title,
  department,
  note,
  content='received_cards',
  content_rowid='rowid'
);

-- Trigger: 自動同步
CREATE TRIGGER received_cards_fts_insert AFTER INSERT ON received_cards BEGIN
  INSERT INTO received_cards_fts(rowid, uuid, full_name, organization, title, department, note)
  VALUES (new.rowid, new.uuid, new.full_name, new.organization, new.title, new.department, new.note);
END;
```

---

## 效能目標
- **API 呼叫減少**: 去重階段從 N 次降至 0 次
- **延遲降低**: 相似度計算從 200ms 降至 5ms
- **搜尋準確度**: Hybrid Search 提升 20-30%
- **成本節省**: Gemini API quota 節省 80%+

---

## 實作順序
1. Phase 1: 基礎設施 (`embedding.ts`, `vector-similarity.ts`)
2. Phase 2: Sync 優化 (豐富 metadata)
3. Phase 3: Deduplicate 重構 (移除 API 呼叫)
4. Phase 4: Search 增強 (Hybrid Search)
5. Phase 5: Migration (FTS 虛擬表)
6. Phase 6: 重新同步所有 embeddings

---

## 驗收標準
- [ ] TypeScript 零錯誤
- [ ] 所有模組使用統一的 `generateCardText()`
- [ ] Deduplicate 階段零 Gemini API 呼叫
- [ ] Metadata 包含 3 層結構
- [ ] Hybrid Search 實作完成
- [ ] D1 FTS 虛擬表創建
- [ ] 重新同步後，搜尋結果更準確
