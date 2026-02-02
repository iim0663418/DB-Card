# KEK 監控系統改進規劃

## 目標
將 KEK 功能從「操作按鈕」改為「監控儀表板」

## 優先級
**P0 - 立即實作**

---

## 變更摘要

### 1. API 變更

#### 保留（系統管理員專用）
- `POST /api/admin/kek/rotate` - 保留但不從前端呼叫
- 用途：系統管理員在更新環境變數後，手動觸發 DEK 重新包裝
- 文檔：標記為「系統管理員專用 API」

#### 新增（監控用）
- `GET /api/admin/kek/status` - KEK 狀態監控

---

## Feature 1: KEK 狀態監控 API

### Scenario 1: 取得 KEK 狀態
- **Given**: 管理員已登入
- **When**: 呼叫 GET /api/admin/kek/status
- **Then**: 
  - ✅ 回傳當前 KEK 版本
  - ✅ 回傳啟用時間
  - ✅ 計算已使用天數
  - ✅ 計算狀態等級（normal/reminder/warning/urgent）
  - ✅ 提供輪替建議

### Scenario 2: 狀態等級計算
- **Given**: KEK 已使用 X 天
- **When**: 計算狀態
- **Then**: 
  - 0-60 天 → normal
  - 61-90 天 → reminder
  - 91-120 天 → warning
  - 120+ 天 → urgent

### Scenario 3: 輪替建議
- **Given**: KEK 已使用 X 天
- **When**: 計算建議
- **Then**: 
  - 建議週期：90 天
  - 距離建議輪替：90 - X 天
  - 是否應輪替：X >= 90

---

## Feature 2: 前端監控儀表板

### Scenario 4: 顯示 KEK 狀態
- **Given**: 管理員開啟 Admin Dashboard
- **When**: 載入 KEK 監控區塊
- **Then**: 
  - ✅ 顯示當前版本
  - ✅ 顯示啟用時間
  - ✅ 顯示已使用天數
  - ✅ 顯示狀態標記（正常/提醒/警告/緊急）
  - ✅ 顯示距離建議輪替天數

### Scenario 5: 移除輪替按鈕
- **Given**: Admin Dashboard 有「KEK 輪替」按鈕
- **When**: 重新設計 UI
- **Then**: 
  - ❌ 移除「KEK 輪替」按鈕
  - ✅ 新增「查看輪替指引」按鈕
  - ✅ 新增「查看輪替歷史」按鈕（未來）

### Scenario 6: 輪替指引 Modal
- **Given**: 管理員點擊「查看輪替指引」
- **When**: 開啟 Modal
- **Then**: 
  - ✅ 顯示警告：需要系統管理員權限
  - ✅ 顯示 5 步驟 SOP
  - ✅ 顯示聯絡資訊

---

## Feature 3: 警告提示

### Scenario 7: 狀態提醒
- **Given**: KEK 狀態為 reminder/warning/urgent
- **When**: Dashboard 載入
- **Then**: 
  - ✅ 顯示 Toast 提示
  - ✅ 提示內容根據狀態等級

---

## Implementation Requirements

### 後端

#### 新增檔案
1. `workers/src/handlers/admin/kek-status.ts` - KEK 狀態 API

#### 修改檔案
1. `workers/src/index.ts` - 新增路由
2. `workers/src/handlers/admin/kek.ts` - 添加註解（系統管理員專用）

#### API Response 格式
```typescript
interface KekStatusResponse {
  current_version: number;
  activated_at: string; // ISO 8601
  days_active: number;
  status: 'normal' | 'reminder' | 'warning' | 'urgent';
  recommendation: {
    rotation_cycle_days: number;
    days_until_recommended: number;
    should_rotate: boolean;
  };
}
```

---

### 前端

#### 修改檔案
1. `workers/public/admin-dashboard.html` - 重新設計 KEK 區塊

#### UI 變更
```html
<!-- ❌ 移除 -->
<button onclick="rotateKek()">KEK 輪替</button>

<!-- ✅ 新增 -->
<div class="kek-monitor">
  <div class="kek-status">
    <span class="status-badge">正常</span>
    <span>已使用 9 天 / 建議 90 天</span>
  </div>
  <div class="kek-info">
    <p>當前版本: v3</p>
    <p>啟用時間: 2026-01-15</p>
    <p>距離建議輪替: 81 天</p>
  </div>
  <div class="kek-actions">
    <button onclick="showRotationGuide()">查看輪替指引</button>
  </div>
</div>
```

---

## 輪替指引內容

### KEK 輪替標準作業程序（SOP）

**警告**：KEK 輪替需要系統管理員權限

**步驟**：
1. 生成新 KEK
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. 更新環境變數
   ```bash
   wrangler secret put KEK
   wrangler secret put OLD_KEK
   ```

3. 重新部署
   ```bash
   wrangler deploy
   ```

4. 觸發 DEK 重新包裝
   ```bash
   curl -X POST https://your-domain/api/admin/kek/rotate \
     -H "Authorization: Bearer $SETUP_TOKEN"
   ```

5. 清理舊密鑰
   ```bash
   wrangler secret delete OLD_KEK
   ```

**需要協助？**
請聯絡系統管理員：admin@example.com

---

## 測試清單

### 後端測試
- [ ] GET /api/admin/kek/status 回傳正確資料
- [ ] 天數計算正確
- [ ] 狀態等級計算正確
- [ ] 輪替建議計算正確

### 前端測試
- [ ] KEK 監控區塊顯示正確
- [ ] 狀態標記顏色正確
- [ ] 輪替指引 Modal 顯示
- [ ] 警告提示正常運作
- [ ] 「KEK 輪替」按鈕已移除

---

## 成功標準

1. ✅ 所有 7 個 BDD scenarios 通過
2. ✅ 前端不再有「KEK 輪替」按鈕
3. ✅ KEK 狀態監控正常顯示
4. ✅ 輪替指引清晰易懂
5. ✅ POST /api/admin/kek/rotate 保留但標記為系統管理員專用

---

## 預估工期
**2 小時** (後端 1 小時 + 前端 1 小時)

---

## 文檔更新

### 需要更新的文檔
1. API 文檔：標記 POST /api/admin/kek/rotate 為「系統管理員專用」
2. 運維文檔：新增 KEK 輪替 SOP
3. README：更新 KEK 管理說明

---

## 參考資料
- 當前實作：workers/src/handlers/admin/kek.ts
- KEK 版本表：migrations/0002_kek_versions.sql
- Admin Dashboard：workers/public/admin-dashboard.html
