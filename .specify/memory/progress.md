# DB-Card Project Progress
## Current Phase: PREVIEW_ALIGNMENT_COMPLETE ✅
- Status: 已部署到 develop branch
- Commit: cb45922
- Version: v4.2.1
- Last Update: 2026-01-21T13:15:00+08:00
- Next Action: 完整測試所有功能

## 完成功能
### Preview Display Alignment (2026-01-21)
- ✅ 新增 prev-department HTML 元素（briefcase icon + truncation）
- ✅ 新增 ORG_DEPT_MAPPING 常數（16 個 MODA 部門翻譯）
- ✅ 更新 updatePreview() 函數（title + department 條件顯示）
- ✅ 雙語支援（string 和 { zh, en } 物件）
- ✅ 預設部門翻譯（使用 ORG_DEPT_MAPPING）
- ✅ 語言切換更新部門文字
- ✅ 對齊 card-display.html 顯示邏輯

### Department Field Bilingual Support (2026-01-21)
- ✅ 新增第二個輸入框（英文部門名稱）
- ✅ 智慧儲存邏輯（兩者都填 → object，單一 → string）
- ✅ 編輯預填處理（string 和 object 兩種格式）
- ✅ 顯示邏輯更新（支援雙語物件和字串）
- ✅ 向下相容（舊資料繼續運作）
- ✅ 無需後端變更或資料庫遷移

### Department Field RWD Fix (2026-01-21)
- ✅ 修復 Mobile 對齊問題（置中對齊）
- ✅ 新增文字截斷（max-w-[250px] on mobile）
- ✅ 圖示穩定性（flex-shrink-0）

### KV Optimization Phase 1 (2026-01-21)
- ✅ 移除 Deduplication Layer (-2 KV ops/tap)
- ✅ 簡化 Rate Limiting 為 Hour-Only (-4 KV ops/tap)
- ✅ 更新 Rate Limits (card: 50/hour, ip: 60/hour)
- ✅ KV 用量降至 20% (200 writes/day)

## 修改文件
### Preview Alignment
- workers/public/admin-dashboard.html (3 處)
- workers/public/user-portal.html (3 處)
- .specify/specs/preview-department-display.md (BDD spec)

### Bilingual Support
- workers/public/admin-dashboard.html (4 處)
- workers/public/user-portal.html (4 處)
- workers/public/js/main.js (1 處)
- .specify/specs/department-bilingual-support.md (BDD spec)
- .specify/analysis/department-bilingual-implementation-analysis.md

### RWD Fix
- workers/public/card-display.html (1 處)
- .specify/specs/department-rwd-fix.md (BDD spec)
- .specify/analysis/department-rwd-evaluation.md

## 完整測試檢查清單

### 預覽功能測試
- [ ] 預覽：預設部門 → 顯示翻譯（中英文）
- [ ] 預覽：自訂雙語 (zh+en) → 顯示正確語言
- [ ] 預覽：自訂單語 (zh only) → 顯示中文
- [ ] 預覽：空部門 → 元素隱藏
- [ ] 預覽：空職稱 → 元素隱藏
- [ ] 預覽：語言切換 → 部門文字更新
- [ ] 預覽：表單輸入變更 → 即時更新

### 創建名片測試
- [ ] 創建：預設部門 → 儲存為 string
- [ ] 創建：自訂雙語 (zh+en) → 儲存為 { zh, en }
- [ ] 創建：自訂單語 (zh only) → 儲存為 string
- [ ] 創建：自訂單語 (en only) → 儲存為 string
- [ ] 創建：空部門 → 不儲存 department 欄位

### 編輯名片測試
- [ ] 編輯：舊名片 (string) → 預填中文欄位
- [ ] 編輯：新名片 (object) → 預填兩個欄位
- [ ] 編輯：預設部門 → 顯示在下拉選單
- [ ] 編輯：切換預設/自訂 → 表單正確更新

### 顯示名片測試
- [ ] 顯示：舊名片 (string) → 正確顯示
- [ ] 顯示：新名片 (object) → 正確本地化
- [ ] 顯示：預設部門 → 使用 ORG_DEPT_MAPPING 翻譯
- [ ] 顯示：空部門 → 元素隱藏
- [ ] 顯示：空職稱 → 元素隱藏
- [ ] 顯示：語言切換 → 部門文字更新

### RWD 測試
- [ ] Mobile (375px) → 部門置中對齊 + 截斷
- [ ] Tablet (768px) → 部門置中對齊
- [ ] Desktop (1024px) → 部門靠左對齊 + 完整顯示
- [ ] 長部門名稱 → Mobile 截斷，Desktop 完整顯示

### 向下相容性測試
- [ ] 舊資料 (string) → 顯示正確
- [ ] 舊資料 (string) → 編輯正確
- [ ] 新資料 (object) → 顯示正確
- [ ] 新資料 (object) → 編輯正確
- [ ] 預設部門 → 翻譯正確

## 技術債務
- 無

## 下一步
1. 完整測試所有功能（預覽、創建、編輯、顯示、RWD）
2. 驗證向下相容性（舊資料和新資料）
3. 確認語言切換功能正常
4. 部署到 Staging 環境
5. 監控使用者反饋
