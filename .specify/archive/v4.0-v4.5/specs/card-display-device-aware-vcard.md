# Card Display - Device-Aware vCard Button - BDD Specification

## Feature: Device-Aware vCard Button Text and Icon
**Purpose**: 根據設備類型顯示正確的按鈕文字（Mobile: 加入聯絡人, Desktop: 下載名片）

### Scenario 1: Mobile Device Detection
- **Given**: User opens card-display.html on mobile device (iOS/Android)
- **When**: Page renders the save-vcard button
- **Then**: 
  - Button text: "加入聯絡人" (zh) / "Add to Contacts" (en)
  - Icon: user-plus
  - data-i18n: "add_to_contacts"

### Scenario 2: Desktop Device Detection
- **Given**: User opens card-display.html on desktop (Windows/Mac/Linux)
- **When**: Page renders the save-vcard button
- **Then**:
  - Button text: "下載名片" (zh) / "Download vCard" (en)
  - Icon: download
  - data-i18n: "download_vcard"

### Scenario 3: Tablet Device Handling
- **Given**: User opens card-display.html on tablet (iPad/Android tablet)
- **When**: Page renders the save-vcard button
- **Then**: Treat as mobile device (加入聯絡人)

### Scenario 4: Bilingual Support
- **Given**: Device type is detected
- **When**: User switches language (zh ↔ en)
- **Then**: Button text updates correctly based on device type

---

## Implementation Requirements

### Device Detection Logic
```javascript
function isMobileDevice() {
  // Method 1: User Agent detection
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|mobile/i.test(ua);
  
  // Method 2: Touch capability + screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
  
  return isMobile || (hasTouch && isSmallScreen);
}
```

### Button Rendering Logic (in renderCard function)
```javascript
const isMobile = isMobileDevice();
const vCardButtonConfig = isMobile 
  ? { i18nKey: 'add_to_contacts', icon: 'user-plus' }
  : { i18nKey: 'download_vcard', icon: 'download' };

// Update button HTML
<button id="save-vcard" data-i18n="${vCardButtonConfig.i18nKey}">
  <i data-lucide="${vCardButtonConfig.icon}"></i>
  ${isMobile ? '加入聯絡人' : '下載名片'}
</button>
```

### I18N Keys Update
Add to existing i18n object:
```javascript
const i18n = {
  zh: {
    // ... existing keys
    add_to_contacts: '加入聯絡人',
    download_vcard: '下載名片'
  },
  en: {
    // ... existing keys
    add_to_contacts: 'Add to Contacts',
    download_vcard: 'Download vCard'
  }
};
```

### Files to Modify
- `workers/public/card-display.html`
  - Add `isMobileDevice()` function
  - Update `renderCard()` button rendering logic
  - Add new i18n keys
  - Ensure `updateLanguage()` updates button text correctly

### Design Consistency
- Keep existing button styling
- Icon size and spacing unchanged
- Smooth transition when language switches

### No Functional Changes
- vCard generation logic remains the same
- Download mechanism unchanged
- Only UI text and icon differ
