# User Portal UI Enhancements - BDD Specification

## Feature: Enhanced Sensitive Card Type Description
**Purpose**: 讓使用者清楚理解 sensitive 類型的差異化安全特性

### Scenario 1: Display Sensitive Card Security Features
- **Given**: User is viewing the card type selection section
- **When**: User reads the sensitive card type description
- **Then**: 
  - Display "最高安全等級" badge
  - Show "同時讀取限制: 5 人" (vs personal 20, event 50)
  - Show "零快取暴露" security feature
  - Show "適用場景: 高敏感資訊、機密聯絡方式"

### Scenario 2: Comparison with Other Types
- **Given**: User is comparing card types
- **When**: User views all three card type descriptions
- **Then**:
  - personal: 同時讀取限制 20, 適合日常使用
  - event: 同時讀取限制 50, 適合展會攤位
  - sensitive: 同時讀取限制 5, 零快取, 最高安全

---

## Feature: Post-Creation Actionable Guidance
**Purpose**: 創建名片後提供明確的下一步操作指引

### Scenario 3: Success Modal with Guidance
- **Given**: User successfully creates a new card
- **When**: Success modal is displayed
- **Then**:
  - Show card URL prominently
  - Display "下一步操作" section with two options:
    1. "寫入 NFC 卡片" (with icon)
    2. "縮短網址分享" (with icon)
  - Include copy URL button
  - Use bilingual support (zh/en)

### Scenario 4: URL Copy Functionality
- **Given**: Success modal is displayed with card URL
- **When**: User clicks "複製連結" button
- **Then**:
  - Copy full URL to clipboard
  - Show "已複製" feedback (2 seconds)
  - Button icon changes temporarily

---

## Implementation Requirements

### UI Changes (user-portal.html)
1. **Card Type Selection Section**:
   - Add detailed comparison table or enhanced descriptions
   - Use color coding: sensitive (red/amber), personal (blue), event (green)
   - Add security level badges

2. **Success Modal Enhancement**:
   - Add "下一步操作" section after success message
   - Two action cards with icons (NFC + URL shortener)
   - Prominent URL display with copy button
   - Bilingual text support

### Design Consistency
- Follow existing glassmorphism style
- Use MODA purple accent (#6868ac)
- Lucide icons for actions
- Responsive layout

### No Backend Changes Required
- Pure frontend enhancement
- No API modifications
- No database schema changes
