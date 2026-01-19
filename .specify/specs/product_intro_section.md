# BDD Spec: Product Introduction Section for index.html

## Scenario: Add Product Introduction Between Feature Cards and Core Features

### Given
- index.html exists with complete structure (333 lines)
- Current sections: Hero → Feature Cards (3) → Core Features → Architecture → Footer
- Design system: glassmorphism, MODA accent (#6868ac), Outfit font, Lucide icons

### When
- Insert new section after line 133 (end of feature cards grid)
- Before existing "核心特性" section

### Then

#### Section Structure
```html
<!-- 產品介紹 -->
<section class="mb-16">
  <div class="text-center mb-12">
    <h2 class="text-3xl md:text-4xl font-black mb-4">如何使用</h2>
    <p class="text-slate-600">三步驟開始使用數位名片</p>
  </div>
  
  <!-- 3 Steps Grid -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
    <!-- Step 1: NFC Tap -->
    <!-- Step 2: QR Code -->
    <!-- Step 3: vCard Download -->
  </div>

  <div class="text-center mb-12">
    <h2 class="text-3xl md:text-4xl font-black mb-4">核心特色</h2>
    <p class="text-slate-600">與競品的差異化優勢</p>
  </div>

  <!-- 4 Features Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Feature 1: Privacy First -->
    <!-- Feature 2: No App Required -->
    <!-- Feature 3: Bilingual -->
    <!-- Feature 4: Enterprise Security -->
  </div>
</section>
```

#### Step Cards Content
1. **Step 1 - NFC Tap**
   - Icon: `nfc` (Lucide)
   - Title: 碰觸 NFC 卡片
   - Description: 手機靠近卡片，自動開啟數位名片

2. **Step 2 - QR Code**
   - Icon: `qr-code` (Lucide)
   - Title: 掃描 QR Code
   - Description: 快速分享聯絡資訊，無需實體接觸

3. **Step 3 - vCard**
   - Icon: `download` (Lucide)
   - Title: 下載 vCard
   - Description: 一鍵加入手機通訊錄

#### Feature Cards Content
1. **Privacy First**
   - Icon: `lock` (Lucide)
   - Title: 隱私優先設計
   - Points:
     - 信封加密技術
     - 授權會話機制（24 小時自動過期）
     - 可隨時撤銷授權

2. **No App Required**
   - Icon: `zap` (Lucide)
   - Title: 即用即走
   - Points:
     - 無需安裝 App
     - NFC 一觸即用
     - 離線 QR 碼生成

3. **Bilingual**
   - Icon: `globe` (Lucide)
   - Title: 雙語支援
   - Points:
     - 中英文自動切換
     - 國際化友善

4. **Enterprise Security**
   - Icon: `shield-check` (Lucide)
   - Title: 企業級安全
   - Points:
     - Cloudflare Workers 全球邊緣運算
     - 資料加密儲存
     - 完整審計日誌

#### Design Requirements
- Use existing `.glass-card` class
- Use existing `.feature-icon` class
- Step cards: numbered badge (1, 2, 3) with MODA accent color
- Feature cards: bullet points with checkmark icons
- Responsive: stack on mobile, grid on desktop
- No emoji in text
- Lucide icons only

#### Technical Constraints
- Insert after line 133 (closing `</div>` of feature cards grid)
- Before line 134 (start of existing core features section)
- Maintain existing indentation (12 spaces for section level)
- Do not modify existing sections
- Do not change existing CSS classes

#### Acceptance Criteria
- [ ] Section inserted at correct position
- [ ] 3 step cards with numbered badges
- [ ] 4 feature cards with bullet points
- [ ] All Lucide icons render correctly
- [ ] Responsive layout works on mobile and desktop
- [ ] Glassmorphism styling consistent with rest of page
- [ ] No emoji in text content
- [ ] No breaking changes to existing sections
