# Preview Department Display - BDD Specification

## Feature: Align Preview with Card Display Logic
**Purpose**: Ensure preview in admin-dashboard and user-portal matches card-display.html display conditions

---

## Current Issues

### ❌ Issue 1: Missing Department in Preview
- Preview shows: Name + Title
- Card display shows: Name + Title + Department
- **Gap**: Department not shown in preview

### ❌ Issue 2: Title Always Visible
- Preview: Title always shown (even if empty)
- Card display: Title conditionally shown (hidden if empty)
- **Gap**: Inconsistent display logic

### ❌ Issue 3: No Bilingual Support in Preview
- Preview: No department field at all
- Card display: Supports bilingual department (string or { zh, en })
- **Gap**: Cannot preview bilingual departments

---

## Scenario 1: Preview with Preset Department
- **Given**: User selects preset department "數位策略司"
- **When**: Preview updates
- **Then**:
  - Department element is visible
  - Chinese mode: Shows "數位策略司"
  - English mode: Shows "Department of Digital Strategy" (via ORG_DEPT_MAPPING)

## Scenario 2: Preview with Custom Bilingual Department
- **Given**: User fills custom department:
  - Chinese: "產品開發部"
  - English: "Product Development"
- **When**: Preview updates
- **Then**:
  - Department element is visible
  - Chinese mode: Shows "產品開發部"
  - English mode: Shows "Product Development"

## Scenario 3: Preview with Custom Chinese-Only Department
- **Given**: User fills only Chinese: "產品開發部"
- **When**: Preview updates
- **Then**:
  - Department element is visible
  - Both modes: Show "產品開發部" (fallback)

## Scenario 4: Preview with Empty Department
- **Given**: User leaves department empty
- **When**: Preview updates
- **Then**:
  - Department element is hidden (display: none)
  - Consistent with card-display.html

## Scenario 5: Preview with Empty Title
- **Given**: User leaves title empty
- **When**: Preview updates
- **Then**:
  - Title element is hidden (display: none)
  - Consistent with card-display.html

## Scenario 6: Preview Language Switch
- **Given**: Preview shows bilingual department
- **When**: User clicks language toggle
- **Then**:
  - Department text updates to correct language
  - Preset departments use ORG_DEPT_MAPPING
  - Custom departments use zh/en from object

---

## Implementation Requirements

### 1. Add Department Element to Preview HTML

**File**: `workers/public/admin-dashboard.html` (Line ~516, after prev-title)

**Add**:
```html
<p id="prev-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center" style="display:none;">
    <i data-lucide="briefcase" class="w-3 h-3 flex-shrink-0"></i>
    <span id="prev-department-text" class="truncate max-w-[200px]">---</span>
</p>
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 2. Update Preview Function

**File**: `workers/public/admin-dashboard.html` (Line ~2114, in updatePreview())

**Add after title processing**:
```javascript
// Title (conditional display - align with card-display)
const titleElement = document.getElementById('prev-title');
if (title && title !== "部長" && title !== "Minister") {
    titleElement.style.display = 'block';
    titleElement.innerText = title;
} else if (!document.getElementById('title_zh').value && !document.getElementById('title_en').value) {
    titleElement.style.display = 'none';
} else {
    titleElement.style.display = 'block';
    titleElement.innerText = title;
}

// Department (conditional display with bilingual support)
const departmentPreset = document.getElementById('department-preset').value;
let deptValue;

if (departmentPreset === 'custom') {
    const zh = document.getElementById('department-custom-zh').value.trim();
    const en = document.getElementById('department-custom-en').value.trim();
    
    if (zh && en) {
        deptValue = { zh, en };
    } else if (zh) {
        deptValue = zh;
    } else if (en) {
        deptValue = en;
    }
} else if (departmentPreset) {
    deptValue = departmentPreset;
}

const deptElement = document.getElementById('prev-department');
if (deptValue) {
    let deptText;
    
    // Handle bilingual object
    if (typeof deptValue === 'object' && deptValue !== null) {
        deptText = isEn ? (deptValue.en || deptValue.zh || '') : (deptValue.zh || deptValue.en || '');
    }
    // Handle string (preset or single language)
    else if (typeof deptValue === 'string') {
        // Use ORG_DEPT_MAPPING for preset departments
        if (isEn && ORG_DEPT_MAPPING.departments[deptValue]) {
            deptText = ORG_DEPT_MAPPING.departments[deptValue];
        } else {
            deptText = deptValue;
        }
    }
    
    if (deptText) {
        deptElement.style.display = 'flex';
        document.getElementById('prev-department-text').innerText = deptText;
    } else {
        deptElement.style.display = 'none';
    }
} else {
    deptElement.style.display = 'none';
}
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 3. Add ORG_DEPT_MAPPING to Preview Context

**File**: `workers/public/admin-dashboard.html` (before updatePreview function)

**Add**:
```javascript
// Department mapping for preview (same as main.js)
const ORG_DEPT_MAPPING = {
    departments: {
        '數位策略司': 'Department of Digital Strategy',
        '數位政府司': 'Department of Digital Government',
        '資源管理司': 'Department of Resource Management',
        '韌性建設司': 'Department of Communications and Cyber Resilience',
        '數位國際司': 'Department of International Digital Affairs',
        '資料創新司': 'Department of Data Innovation',
        '秘書處': 'Secretariat',
        '人事處': 'Department of Personnel',
        '政風處': 'Department of Civil Service Ethics',
        '主計處': 'Department of Accounting',
        '資訊處': 'Department of Information',
        '法制處': 'Department of Legal Affairs',
        '部長室': "Minister's Office",
        '政務次長室': "Political Deputy Minister's Office",
        '常務次長室': "Administrative Deputy Minister's Office",
        '主任秘書室': "Secretary-General's Office"
    }
};
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 4. Update Language Toggle Handler

**File**: `workers/public/admin-dashboard.html` (language toggle button handler)

**Ensure**:
```javascript
document.getElementById('toggle-preview-lang').addEventListener('click', function() {
    previewLang = previewLang === 'zh' ? 'en' : 'zh';
    this.innerText = previewLang === 'zh' ? 'EN' : '中';
    updatePreview();  // This will now update department text
});
```

---

## Testing Requirements

### Manual Testing
- [ ] Preview with preset department → shows correctly in both languages
- [ ] Preview with custom zh+en → shows correct language
- [ ] Preview with custom zh only → shows zh in both modes
- [ ] Preview with empty department → element hidden
- [ ] Preview with empty title → element hidden
- [ ] Language toggle → department text updates
- [ ] Form input change → preview updates immediately

### Visual Checks
- [ ] Department icon (briefcase) displays correctly
- [ ] Department text truncates if too long (max-w-[200px])
- [ ] Department alignment matches title (centered)
- [ ] Spacing consistent with card-display.html

### Edge Cases
- [ ] Switch between preset and custom → preview updates
- [ ] Clear department fields → element hides
- [ ] Very long department name → truncates with ellipsis

---

## Alignment with card-display.html

### Display Conditions (Must Match)

**Title**:
- card-display: `if (title) { show } else { hide }`
- preview: `if (title) { show } else { hide }`

**Department**:
- card-display: `if (dept && deptText) { show } else { hide }`
- preview: `if (deptValue && deptText) { show } else { hide }`

### Bilingual Logic (Must Match)

**Object Format**:
- card-display: `currentLanguage === 'en' ? (dept.en || dept.zh) : (dept.zh || dept.en)`
- preview: `isEn ? (deptValue.en || deptValue.zh) : (deptValue.zh || deptValue.en)`

**String Format with Mapping**:
- card-display: `ORG_DEPT_MAPPING.departments[dept] || dept`
- preview: `ORG_DEPT_MAPPING.departments[deptValue] || deptValue`

---

## Files to Modify

1. **workers/public/admin-dashboard.html** (3 locations)
   - Line ~516: Add prev-department HTML element
   - Line ~2100: Add ORG_DEPT_MAPPING constant
   - Line ~2114: Update updatePreview() function

2. **workers/public/user-portal.html** (3 locations)
   - Similar changes as admin-dashboard.html

**Total**: 2 files, 6 code blocks

---

## Acceptance Criteria

- ✅ Preview shows department field (when not empty)
- ✅ Preview hides department field (when empty)
- ✅ Preview supports bilingual departments (string or { zh, en })
- ✅ Preview uses ORG_DEPT_MAPPING for preset departments
- ✅ Language toggle updates department text
- ✅ Display logic matches card-display.html exactly
- ✅ Title conditional display matches card-display.html
- ✅ Visual consistency with card-display.html

---

## No Backend Changes Required

- ✅ Pure frontend preview enhancement
- ✅ No API changes
- ✅ No database changes
- ✅ Aligns with existing bilingual implementation
