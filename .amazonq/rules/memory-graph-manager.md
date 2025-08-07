---
name: memory-graph-manager
description: Amazon Q 記憶體圖譜管理規則，結合 Claude Sonnet 4 與 Memory MCP，透過圖形操作 API 壓縮長期上下文，維持回應精準度與可追溯性。
version: 1.0
mcp_profile: memory-optimized
context_policy:
  max_tokens_per_call: 400          # 每次呼叫最多保留 400 token
  compress_old_nodes: true          # 對過期觀察值進行語義摘要壓縮
  eviction_strategy: LRU            # 低權重節點優先淘汰
  audit_log: s3://q-memory-logs      # 所有變更寫入稽核桶
secure_principles: ["Secure by Default", "Least Privilege", "Integrity First", "Auditable Actions"]
cognitive_principles: ["Minimal Payload", "Active Voice Relations", "Structured Updates", "Human-Readable IDs"]
operations:
  create_entities:        "批次建立實體節點；必附 type 與唯一名稱"
  create_relations:       "批次新增主動語態關係（A **owns** B）"
  add_observations:       "向既有實體追加觀察值；自動時間戳"
  delete_entities:        "刪除實體與其所有關係；高風險操作需 double-confirm"
  delete_observations:    "精確刪除觀察值（依 id）"
  delete_relations:       "批次移除關係；需指定雙向端點"
  read_graph:             "讀取完整圖譜（僅限稽核或備份）"
  search_nodes:           "語意查詢節點或屬性；支援布林運算"
  open_nodes:             "依名稱打開節點詳細內容（含觀察值與關係）"
---

## 運作角色
- **Memory Curator**：自動在對話中判斷將低階訊息轉換為圖譜實體與關係來維持長期記憶，監控 /compact 事件來精準判斷 CTX 不足的時機。
- **Memory Janitor**：定期根據 `context_policy.eviction_strategy` 清理或壓縮冷資料。
- **Audit Guard**：監控所有 `delete_*` 操作，確保稽核日誌完整並觸發告警。

## 操作流程
1. **輸入解析**  
   - 將自然語句轉為 `{op, payload}`；映射至 `operations`。  
2. **衝突檢查**  
   - `create_*` 前驗證全域唯一鍵；`delete_*` 前確認是否存在依賴。  
3. **MCP 呼叫**  
   - 依 `mcp_profile` 以最小必要 payload 執行存取；自動附 `trace-id`。  
4. **上下文壓縮**  
   - 實體觀察值超過 `max_tokens_per_call` 時，觸發語義摘要並以 `add_observations` 覆寫舊值。  
5. **稽核與回饋**  
   - 所有成功操作寫入 `audit_log`；若發生失敗，回傳結構化錯誤（含建議修復步驟）。

## Payload 範式
```json
{
  "op": "create_entities",
  "payload": [
    {"id": "User_123", "type": "Person", "props": {"name": "Alice", "tier": "gold"}},
    {"id": "Acc_456", "type": "Account", "props": {"opened": "2025-08-07"}}
  ],
  "trace_id": "bmn-2025-08-07-001"
}
````

## 錯誤處理

| Code                  | 說明         | 修復建議                                     |
| --------------------- | ---------- | ---------------------------------------- |
| `E_DUPLICATE_ID`      | 嘗試建立已存在的節點 | 使用 `open_nodes` 檢查名稱後重新命名                |
| `E_RELATION_UNBOUND`  | 關係端點不存在    | 先 `create_entities` 再 `create_relations` |
| `E_DELETE_CONSTRAINT` | 刪除受限節點     | 解除或轉移依賴後重試                               |

## 使用範例

1. **建立實體 + 關係**

   ```json
   {"op":"create_entities","payload":[{"id":"Proj_A","type":"Project"}]}
   {"op":"create_relations","payload":[{"from":"User_123","rel":"owns","to":"Proj_A"}]}
   ```
2. **新增觀察值**

   ```json
   {"op":"add_observations","payload":[{"id":"Proj_A","note":"Kickoff 完成"}]}
   ```
3. **檢索節點**

   ```json
   {"op":"search_nodes","payload":{"query":"Project AND status:kickoff"}}
   ```

> **備註**：所有關係語句採「主詞-動詞-受詞」主動語態；避免被動詞形如 “owned by”。
> **CTX 緩解**：舊觀察內容將自動摘要後保留關鍵指標，以降低 Claude Sonnet 4 上下文負荷，確保推理品質。