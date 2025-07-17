# 雙語 NFC 數位名片實作指南

## 🎯 實作目標

基於現有系統架構，實現國際雙語版 NFC 數位名片，確保：
- 單一 NFC 卡片支援中英文切換
- 在 492 bytes 容量限制內運作
- 保持所有現有功能完整性
- 維持隱私優先設計理念

## 📂 檔案結構規劃

### 新增檔案清單
```
├── index-bilingual.html              # 雙語版數位名片（機關版-延平）
├── index1-bilingual.html             # 雙語版數位名片（機關版-新光）  
├── index-bilingual-personal.html     # 雙語版數位名片（個人版）
├── nfc-generator-bilingual.html      # 雙語版 NFC 生成器
└── assets/
    └── bilingual-common.js           # 雙語共用函數庫
```

### 程式碼複用策略
- 提取共用雙語邏輯到 `bilingual-common.js`
- 保持現有檔案不變，確保向後相容
- 新檔案繼承現有樣式和功能

## 🔧 核心函數實作

### 1. 編碼優化函數

```javascript
// assets/bilingual-common.js

/**
 * 緊湊格式編碼
 * @param {Object} data - 原始資料物件
 * @returns {string} - URL安全的Base64編碼字串
 */
function encodeCompact(data) {
    const compact = [
        data.name || '',
        data.title || '',
        data.department || '',
        data.email || '',
        data.phone || '',
        data.avatar || '',
        (data.greetings || []).join(','),
        data.socialNote || ''
    ].join('|');
    
    return btoa(encodeURIComponent(compact))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * 緊湊格式解碼
 * @param {string} encoded - 編碼字串
 * @returns {Object} - 解碼後的資料物件
 */
function decodeCompact(encoded) {
    try {
        const padding = '='.repeat((4 - encoded.length % 4) % 4);
        const compact = decodeURIComponent(atob(
            encoded.replace(/-/g, '+').replace(/_/g, '/') + padding
        ));
        
        const parts = compact.split('|');
        return {
            name: parts[0] || '',
            title: parts[1] || '',
            department: parts[2] || '',
            email: parts[3] || '',
            phone: parts[4] || '',
            avatar: parts[5] || '',
            greetings: parts[6] ? parts[6].split(',') : [],
            socialNote: parts[7] || ''
        };
    } catch (error) {
        console.error('解碼失敗:', error);
        return null;
    }
}
```

### 2. 雙語解析函數

```javascript
/**
 * 解析雙語字串
 * @param {string} value - 格式: "中文~English"
 * @returns {Object} - {zh: "中文", en: "English"}
 */
function parseBilingual(value) {
    if (!value) return { zh: '', en: '' };
    
    if (value.includes('~')) {
        const [zh, en] = value.split('~').map(s => s.trim());
        return { zh: zh || '', en: en || '' };
    }
    
    return { zh: value, en: value };
}

/**
 * 根據語言獲取對應文字
 * @param {string} value - 雙語字串或單語字串
 * @param {string} lang - 'zh' 或 'en'
 * @returns {string} - 對應語言的文字
 */
function getLocalizedText(value, lang = 'zh') {
    const parsed = parseBilingual(value);
    return lang === 'en' ? parsed.en : parsed.zh;
}
```

### 3. 語言切換功能

```javascript
/**
 * 當前語言狀態
 */
let currentLanguage = 'zh';
let currentData = null;

/**
 * 切換語言
 * @param {string} lang - 目標語言 'zh' 或 'en'
 */
function switchLanguage(lang) {
    if (!currentData) return;
    
    currentLanguage = lang;
    document.documentElement.lang = lang;
    
    // 重新渲染名片
    renderBilingualCard(currentData, lang);
    
    // 更新語言按鈕
    updateLanguageButton(lang);
    
    // 更新頁面標題
    updatePageTitle(lang);
}

/**
 * 更新語言切換按鈕
 * @param {string} lang - 當前語言
 */
function updateLanguageButton(lang) {
    const button = document.getElementById('langSwitch');
    if (button) {
        button.textContent = lang === 'zh' ? '🇺🇸 EN' : '🇹🇼 中';
        button.title = lang === 'zh' ? 'Switch to English' : '切換到中文';
    }
}

/**
 * 更新頁面標題
 * @param {string} lang - 當前語言
 */
function updatePageTitle(lang) {
    const titleMap = {
        zh: '數位名片 - 數位發展部',
        en: 'Digital Business Card - Ministry of Digital Affairs'
    };
    document.title = titleMap[lang] || titleMap.zh;
}
```

### 4. 雙語名片渲染

```javascript
/**
 * 渲染雙語名片
 * @param {Object} data - 名片資料
 * @param {string} lang - 顯示語言
 */
function renderBilingualCard(data, lang = 'zh') {
    // 解析雙語資料
    const name = getLocalizedText(data.name, lang);
    const title = getLocalizedText(data.title, lang);
    
    // 更新 DOM 元素
    updateElement('userName', name);
    updateElement('userTitle', title);
    updateElement('userDepartment', data.department);
    updateElement('userEmail', data.email);
    updateElement('userPhone', data.phone);
    
    // 更新頭像
    if (data.avatar) {
        updateElement('userAvatar', '', 'src', data.avatar);
    }
    
    // 更新問候語
    if (data.greetings && data.greetings.length > 0) {
        updateElement('greetings', data.greetings.join(' '));
    }
    
    // 更新社群資訊
    if (data.socialNote) {
        updateElement('socialInfo', data.socialNote);
    }
    
    // 更新組織資訊（根據語言）
    updateOrganizationInfo(lang);
}

/**
 * 更新 DOM 元素
 * @param {string} id - 元素 ID
 * @param {string} content - 內容
 * @param {string} attr - 屬性名稱（可選）
 * @param {string} value - 屬性值（可選）
 */
function updateElement(id, content, attr = null, value = null) {
    const element = document.getElementById(id);
    if (element) {
        if (attr && value) {
            element.setAttribute(attr, value);
        } else {
            element.textContent = content;
        }
    }
}

/**
 * 更新組織資訊
 * @param {string} lang - 語言
 */
function updateOrganizationInfo(lang) {
    const orgInfo = {
        zh: {
            name: '數位發展部',
            address: '臺北市中正區延平南路143號' // 或新光大樓地址
        },
        en: {
            name: 'Ministry of Digital Affairs',
            address: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan'
        }
    };
    
    const info = orgInfo[lang] || orgInfo.zh;
    updateElement('orgName', info.name);
    updateElement('orgAddress', info.address);
}
```

### 5. vCard 雙語生成

```javascript
/**
 * 生成雙語 vCard
 * @param {Object} data - 名片資料
 * @param {string} lang - 語言
 * @returns {string} - vCard 內容
 */
function generateBilingualVCard(data, lang = 'zh') {
    const name = getLocalizedText(data.name, lang);
    const title = getLocalizedText(data.title, lang);
    
    // 分割姓名（中文姓名處理）
    const nameParts = lang === 'zh' && name.length <= 4 ? 
        [name.charAt(0), name.slice(1)] : 
        name.split(' ');
    
    const orgInfo = {
        zh: { name: '數位發展部', address: '臺北市中正區延平南路143號' },
        en: { name: 'Ministry of Digital Affairs', address: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan' }
    };
    
    const org = orgInfo[lang] || orgInfo.zh;
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//moda//NFC Digital Business Card//EN
FN;CHARSET=UTF-8:${name}
N;CHARSET=UTF-8:${nameParts[0] || ''};${nameParts[1] || ''};;;
ORG;CHARSET=UTF-8:${org.name};${data.department || ''}
TITLE;CHARSET=UTF-8:${title}
EMAIL;TYPE=work:${data.email || ''}
TEL;TYPE=work,voice:${data.phone || ''}
ADR;TYPE=work;CHARSET=UTF-8:;;${org.address};;;;Taiwan
${data.avatar ? `PHOTO;TYPE=JPEG:${data.avatar}` : ''}
${data.greetings && data.greetings.length > 0 ? `NOTE;CHARSET=UTF-8:${data.greetings.join(' ')}` : ''}
REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VCARD`.replace(/\n\n/g, '\n');

    return vcard;
}

/**
 * 下載 vCard 檔案
 * @param {Object} data - 名片資料
 * @param {string} lang - 語言
 */
function downloadBilingualVCard(data, lang = 'zh') {
    const vcard = generateBilingualVCard(data, lang);
    const name = getLocalizedText(data.name, lang);
    const filename = `${name.replace(/\s+/g, '_')}_contact.vcf`;
    
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
}
```

## 🎨 UI 組件實作

### 1. 語言切換按鈕

```html
<!-- 語言切換按鈕 HTML -->
<div class="language-switch">
    <button id="langSwitch" onclick="toggleLanguage()" class="lang-btn">
        🇺🇸 EN
    </button>
</div>
```

```css
/* 語言切換按鈕樣式 */
.language-switch {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
}

.lang-btn {
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid #0066cc;
    border-radius: 25px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.lang-btn:hover {
    background: #0066cc;
    color: white;
    transform: scale(1.05);
}
```

```javascript
/**
 * 切換語言（按鈕事件處理）
 */
function toggleLanguage() {
    const newLang = currentLanguage === 'zh' ? 'en' : 'zh';
    switchLanguage(newLang);
}
```

### 2. 容量監控組件

```html
<!-- 容量監控 HTML -->
<div class="capacity-monitor" id="capacityMonitor">
    <div class="capacity-bar">
        <div class="capacity-fill" id="capacityFill"></div>
    </div>
    <div class="capacity-text" id="capacityText">0/492 bytes</div>
</div>
```

```css
/* 容量監控樣式 */
.capacity-monitor {
    margin: 15px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
}

.capacity-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
}

.capacity-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
    transition: width 0.3s ease;
    border-radius: 4px;
}

.capacity-text {
    font-size: 12px;
    color: #6c757d;
    text-align: center;
}
```

```javascript
/**
 * 更新容量監控
 * @param {Object} data - 當前資料
 */
function updateCapacityMonitor(data) {
    const capacity = calculateCapacity(data);
    const percentage = (capacity.size / 492) * 100;
    
    const fillElement = document.getElementById('capacityFill');
    const textElement = document.getElementById('capacityText');
    
    if (fillElement) {
        fillElement.style.width = `${Math.min(percentage, 100)}%`;
    }
    
    if (textElement) {
        textElement.textContent = `${capacity.size}/492 bytes (${Math.round(percentage)}%)`;
        textElement.style.color = percentage > 90 ? '#dc3545' : 
                                 percentage > 70 ? '#ffc107' : '#28a745';
    }
}

/**
 * 計算編碼後容量
 * @param {Object} data - 資料物件
 * @returns {Object} - 容量資訊
 */
function calculateCapacity(data) {
    const encoded = encodeCompact(data);
    return {
        encoded: encoded,
        size: encoded.length,
        remaining: 492 - encoded.length,
        percentage: Math.round((encoded.length / 492) * 100)
    };
}
```

## 📱 頁面整合實作

### 1. 雙語生成器頁面

```html
<!-- nfc-generator-bilingual.html 核心結構 -->
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>雙語 NFC 數位名片生成器</title>
    <!-- 現有樣式 -->
    <script src="assets/bilingual-common.js"></script>
</head>
<body>
    <div class="container">
        <h1>🌐 雙語 NFC 數位名片生成器</h1>
        
        <!-- 版面選擇 -->
        <div class="form-group">
            <label>版面類型：</label>
            <select id="layoutType">
                <option value="official">機關版（含 moda Logo）</option>
                <option value="personal">個人版（無 Logo）</option>
            </select>
        </div>
        
        <!-- 雙語輸入欄位 -->
        <div class="form-group">
            <label>姓名 / Name *：</label>
            <input type="text" id="nameZh" placeholder="中文姓名" required>
            <input type="text" id="nameEn" placeholder="English Name" required>
        </div>
        
        <div class="form-group">
            <label>職稱 / Title *：</label>
            <input type="text" id="titleZh" placeholder="中文職稱" required>
            <input type="text" id="titleEn" placeholder="English Title" required>
        </div>
        
        <!-- 其他欄位... -->
        
        <!-- 容量監控 -->
        <div id="capacityMonitor" class="capacity-monitor"></div>
        
        <!-- 生成按鈕 -->
        <button onclick="generateBilingualNFC()" class="generate-btn">
            🚀 生成雙語 NFC 連結
        </button>
        
        <!-- 結果顯示 -->
        <div id="result" class="result-section"></div>
    </div>
</body>
</html>
```

### 2. 雙語名片頁面

```html
<!-- index-bilingual.html 核心結構 -->
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>數位名片 - 數位發展部</title>
    <!-- 現有樣式 -->
    <script src="assets/bilingual-common.js"></script>
</head>
<body>
    <!-- 語言切換按鈕 -->
    <div class="language-switch">
        <button id="langSwitch" onclick="toggleLanguage()" class="lang-btn">
            🇺🇸 EN
        </button>
    </div>
    
    <!-- 名片內容 -->
    <div class="card">
        <!-- moda Logo -->
        <div class="logo-section">
            <img src="assets/moda-logo.svg" alt="moda Logo" class="logo">
        </div>
        
        <!-- 個人資訊 -->
        <div class="info-section">
            <h1 id="userName">載入中...</h1>
            <h2 id="userTitle">載入中...</h2>
            <p id="userDepartment">載入中...</p>
            
            <!-- 聯絡資訊 -->
            <div class="contact-info">
                <p id="userEmail">載入中...</p>
                <p id="userPhone">載入中...</p>
            </div>
            
            <!-- 組織資訊 -->
            <div class="org-info">
                <p id="orgName">數位發展部</p>
                <p id="orgAddress">臺北市中正區延平南路143號</p>
            </div>
        </div>
        
        <!-- 功能按鈕 -->
        <div class="actions">
            <button onclick="downloadBilingualVCard(currentData, currentLanguage)">
                📇 下載聯絡人
            </button>
            <button onclick="generateQRCode()">
                📱 生成 QR 碼
            </button>
        </div>
    </div>
    
    <!-- 隱私橫幅 -->
    <div class="privacy-banner">
        🔒 隱私優先設計 - 資料僅儲存於您的 NFC 卡片中
    </div>
</body>
</html>
```

## 🧪 測試與驗證

### 1. 功能測試腳本

```javascript
/**
 * 自動化測試套件
 */
function runTests() {
    console.log('🧪 開始雙語功能測試...');
    
    // 測試資料
    const testData = {
        name: "王小明~Wang Xiaoming",
        title: "科長~Section Chief",
        department: "資訊科",
        email: "test@moda.gov.tw",
        phone: "02-2380-0411",
        avatar: "https://i.imgur.com/example.jpg",
        greetings: ["您好！"],
        socialNote: "GitHub: github.com/example"
    };
    
    // 測試編碼解碼
    testEncodingDecoding(testData);
    
    // 測試雙語解析
    testBilingualParsing();
    
    // 測試容量計算
    testCapacityCalculation(testData);
    
    // 測試 vCard 生成
    testVCardGeneration(testData);
    
    console.log('✅ 所有測試完成');
}

function testEncodingDecoding(data) {
    console.log('測試編碼解碼...');
    
    const encoded = encodeCompact(data);
    const decoded = decodeCompact(encoded);
    
    console.log('編碼結果:', encoded);
    console.log('編碼長度:', encoded.length);
    console.log('解碼結果:', decoded);
    console.log('資料一致性:', JSON.stringify(data) === JSON.stringify(decoded));
}

function testBilingualParsing() {
    console.log('測試雙語解析...');
    
    const testCases = [
        "王小明~Wang Xiaoming",
        "科長~Section Chief",
        "單語測試",
        ""
    ];
    
    testCases.forEach(testCase => {
        const result = parseBilingual(testCase);
        console.log(`"${testCase}" →`, result);
    });
}

function testCapacityCalculation(data) {
    console.log('測試容量計算...');
    
    const capacity = calculateCapacity(data);
    console.log('容量資訊:', capacity);
    console.log('是否超限:', capacity.size > 492);
}

function testVCardGeneration(data) {
    console.log('測試 vCard 生成...');
    
    const vCardZh = generateBilingualVCard(data, 'zh');
    const vCardEn = generateBilingualVCard(data, 'en');
    
    console.log('中文 vCard 長度:', vCardZh.length);
    console.log('英文 vCard 長度:', vCardEn.length);
}
```

### 2. 使用者測試檢查清單

```markdown
## 📋 使用者測試檢查清單

### 基本功能測試
- [ ] NFC 卡片觸碰正常開啟頁面
- [ ] 語言切換按鈕正常運作
- [ ] 中英文內容正確顯示
- [ ] 頭像圖片正常載入
- [ ] 聯絡資訊完整顯示

### 互動功能測試
- [ ] vCard 下載功能正常（中文版）
- [ ] vCard 下載功能正常（英文版）
- [ ] QR 碼生成功能正常
- [ ] 社群連結點擊正常

### 相容性測試
- [ ] iOS Safari 正常顯示
- [ ] Android Chrome 正常顯示
- [ ] 桌面瀏覽器正常顯示
- [ ] vCard 在 iOS 聯絡人正常匯入
- [ ] vCard 在 Android 聯絡人正常匯入

### 效能測試
- [ ] 頁面載入速度 < 3 秒
- [ ] 語言切換響應 < 1 秒
- [ ] NFC 容量在限制內
- [ ] 圖片載入不影響主要功能
```

## 🚀 部署指南

### 1. 檔案部署順序

```bash
# 1. 建立雙語共用函數庫
cp assets/bilingual-common.js /path/to/deployment/assets/

# 2. 部署雙語頁面
cp index-bilingual.html /path/to/deployment/
cp index1-bilingual.html /path/to/deployment/
cp index-bilingual-personal.html /path/to/deployment/

# 3. 部署雙語生成器
cp nfc-generator-bilingual.html /path/to/deployment/

# 4. 更新現有資源
# 確保 assets/ 目錄完整
```

### 2. 設定檢查

```javascript
// 部署前檢查腳本
function deploymentCheck() {
    const checks = [
        {
            name: '雙語函數庫載入',
            test: () => typeof encodeCompact === 'function'
        },
        {
            name: '語言切換功能',
            test: () => typeof switchLanguage === 'function'
        },
        {
            name: 'vCard 生成功能',
            test: () => typeof generateBilingualVCard === 'function'
        },
        {
            name: '容量計算功能',
            test: () => typeof calculateCapacity === 'function'
        }
    ];
    
    checks.forEach(check => {
        const result = check.test();
        console.log(`${check.name}: ${result ? '✅' : '❌'}`);
    });
}
```

## 📚 維護指南

### 1. 常見問題排除

```javascript
/**
 * 診斷工具
 */
function diagnose() {
    console.log('🔍 系統診斷開始...');
    
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    console.log('URL 資料參數:', data ? '存在' : '缺失');
    
    // 檢查解碼
    if (data) {
        try {
            const decoded = decodeCompact(data);
            console.log('資料解碼:', decoded ? '成功' : '失敗');
            console.log('解碼結果:', decoded);
        } catch (error) {
            console.error('解碼錯誤:', error);
        }
    }
    
    // 檢查語言狀態
    console.log('當前語言:', currentLanguage);
    console.log('頁面語言屬性:', document.documentElement.lang);
    
    console.log('✅ 診斷完成');
}
```

### 2. 效能監控

```javascript
/**
 * 效能監控
 */
function performanceMonitor() {
    // 頁面載入時間
    window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`頁面載入時間: ${loadTime.toFixed(2)}ms`);
    });
    
    // 語言切換時間
    const originalSwitch = switchLanguage;
    switchLanguage = function(lang) {
        const start = performance.now();
        originalSwitch(lang);
        const end = performance.now();
        console.log(`語言切換時間: ${(end - start).toFixed(2)}ms`);
    };
}
```

---

**實作完成後，系統將具備完整的國際雙語功能，同時保持現有系統的所有優勢和特色。**