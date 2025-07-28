# PWA 名片收藏服務技術設計

## 1. System Architecture Overview

### 系統層級與責任界線
- **PWA Shell**: 應用程式外殼，負責 Service Worker 註冊與離線支援
- **Collection Manager**: 收藏業務邏輯協調層
- **Storage Layer**: IndexedDB 資料持久化層
- **QR Scanner**: 相機存取與 QR 碼解析模組

### 互動模式與整合點
```
PWA Shell ←→ Collection Manager ←→ Storage Layer
     ↓              ↓                    ↓
Service Worker   QR Scanner         IndexedDB
```

### 技術棧建議與取捨理由
- **純 JavaScript**: 維持現有架構一致性，無額外依賴
- **IndexedDB**: 支援複雜查詢與大容量儲存
- **Service Worker**: 提供離線功能與快取管理
- **QuaggaJS**: 輕量級 QR 掃描，瀏覽器相容性佳

## 2. Data Models

### 名片收藏資料結構
```typescript
interface BusinessCard {
  id: string;                    // 唯一識別碼
  timestamp: number;             // 收藏時間戳
  source: 'QR' | 'NFC' | 'MANUAL'; // 來源類型
  data: CardData;                // 名片資訊
  tags: string[];                // 標籤分類
  notes: string;                 // 個人筆記
  lastViewed: number;            // 最後瀏覽時間
  viewCount: number;             // 瀏覽次數
}

interface CardData {
  name: string;
  title: string;
  department: string;
  organization: string;
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  address: string;
  greetings: string[];
  socialLinks: {
    email: string;
    socialNote: string;
  };
}
```

### IndexedDB Schema 設計
```javascript
// Cards ObjectStore
{
  keyPath: 'id',
  indexes: {
    'timestamp': { unique: false },
    'source': { unique: false },
    'name': { keyPath: 'data.name', unique: false },
    'email': { keyPath: 'data.email', unique: false },
    'tags': { multiEntry: true, unique: false }
  }
}
```

## 3. API Design

### PWAStorage 核心介面
```javascript
class PWAStorage {
  async init(): Promise<IDBDatabase>
  async addCard(cardData, source, tags, notes): Promise<BusinessCard>
  async getAllCards(): Promise<BusinessCard[]>
  async getCard(id): Promise<BusinessCard>
  async updateCard(id, updates): Promise<BusinessCard>
  async deleteCard(id): Promise<boolean>
  async searchCards(query): Promise<BusinessCard[]>
  async getCardsByTag(tag): Promise<BusinessCard[]>
  async getStats(): Promise<Statistics>
  async exportData(): Promise<ExportData>
  async importData(data): Promise<ImportResult>
}
```

### CollectionManager 業務邏輯
```javascript
class CollectionManager {
  async init(): Promise<void>
  async loadCards(): Promise<void>
  parseCardFromUrl(url): CardData | null
  async addCard(cardData, source, tags, notes): Promise<Result>
  async addCardFromQR(qrData): Promise<Result>
  async deleteCard(cardId): Promise<Result>
  async updateCard(cardId, updates): Promise<Result>
  async searchCards(query): Promise<void>
  async filterCards(filter): Promise<void>
  sortCards(sortBy): void
  renderCards(): void
}
```

## 4. Process Design

### 名片收藏流程
1. **QR 掃描** → 解析 URL → 驗證格式
2. **資料解析** → 轉換為標準格式 → 重複檢查
3. **儲存處理** → IndexedDB 寫入 → 更新統計
4. **UI 更新** → 重新渲染列表 → 顯示回饋

### 錯誤處理機制
- **解析失敗**: 顯示格式錯誤訊息
- **重複名片**: 提示已存在選項
- **儲存失敗**: 重試機制與降級處理
- **網路離線**: Service Worker 快取支援

## 5. Module Structure

### 檔案組織
```
/
├── doc/
│   └── design.md            # 本技術設計文件
├── manifest.json            # PWA 應用程式配置
├── sw.js                   # Service Worker 離線支援
├── collection.html         # 收藏管理主介面
├── pwa-storage.js         # IndexedDB 儲存層
├── collection-manager.js  # 收藏業務邏輯層
├── assets/
│   ├── icon-192.png       # PWA 圖示 192x192
│   ├── icon-512.png       # PWA 圖示 512x512
│   └── qr-scanner.js      # QR 掃描功能模組
└── index.html             # 主名片頁面 (已整合 PWA)
```

### 依賴注入模式
```javascript
// 全域實例化
window.pwaStorage = new PWAStorage();
window.collectionManager = new CollectionManager();

// 初始化順序
pwaStorage.init() → collectionManager.init() → UI 渲染
```

## 6. Security & Best Practices Appendix

### Secure by Default 具體落實
- **輸入驗證**: QR 碼 URL 格式驗證與淨化
- **XSS 防護**: 使用 textContent 而非 innerHTML
- **資料隔離**: IndexedDB 同源政策保護
- **權限最小化**: 僅請求必要的相機權限

### 效能優化與快取策略
- **Service Worker**: 核心檔案預快取
- **虛擬滾動**: 大量名片列表優化
- **圖片懶載入**: 頭像按需載入與快取
- **IndexedDB 索引**: 搜尋查詢效能優化

### 觀測性建議
- **錯誤追蹤**: console.error 統一錯誤記錄
- **效能監控**: 載入時間與操作回應時間
- **使用統計**: 收藏數量與來源分析

---

**實作對應**: 
- requirements.md: 功能需求規格
- tasks.md: 開發任務分解
- CHANGELOG.md: 版本變更記錄