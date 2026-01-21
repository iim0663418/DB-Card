# Department Field Bilingual Support - BDD Specification

## Feature: Custom Department Bilingual Input
**Purpose**: Enable users to input custom department names in both Chinese and English

---

## Scenario 1: Create Card with Preset Department
- **Given**: User selects preset department "數位策略司"
- **When**: Form is submitted
- **Then**:
  - `department` is stored as string: `"數位策略司"`
  - Display shows "數位策略司" (zh) or "Department of Digital Strategy" (en) via ORG_DEPT_MAPPING
  - No change from current behavior

## Scenario 2: Create Card with Custom Bilingual Department
- **Given**: User selects "自訂部門" and fills both fields:
  - Chinese: "產品開發部"
  - English: "Product Development"
- **When**: Form is submitted
- **Then**:
  - `department` is stored as object: `{ zh: "產品開發部", en: "Product Development" }`
  - Display shows "產品開發部" (zh) or "Product Development" (en)

## Scenario 3: Create Card with Custom Chinese-Only Department
- **Given**: User selects "自訂部門" and fills only Chinese:
  - Chinese: "產品開發部"
  - English: (empty)
- **When**: Form is submitted
- **Then**:
  - `department` is stored as string: `"產品開發部"`
  - Display shows "產品開發部" in both languages (fallback)
  - Backward compatible with old data

## Scenario 4: Create Card with Custom English-Only Department
- **Given**: User selects "自訂部門" and fills only English:
  - Chinese: (empty)
  - English: "Product Development"
- **When**: Form is submitted
- **Then**:
  - `department` is stored as string: `"Product Development"`
  - Display shows "Product Development" in both languages (fallback)

## Scenario 5: Edit Old Card with String Department
- **Given**: Existing card has `department: "產品開發部"` (string)
- **When**: User opens edit form
- **Then**:
  - Department preset shows "自訂部門"
  - Chinese field prefilled: "產品開發部"
  - English field empty
  - User can add English translation

## Scenario 6: Edit New Card with Bilingual Department
- **Given**: Existing card has `department: { zh: "產品開發部", en: "Product Development" }`
- **When**: User opens edit form
- **Then**:
  - Department preset shows "自訂部門"
  - Chinese field prefilled: "產品開發部"
  - English field prefilled: "Product Development"
  - User can edit both fields

## Scenario 7: Display Old Card with String Department
- **Given**: Card has `department: "產品開發部"` (string)
- **When**: Card is displayed
- **Then**:
  - Chinese mode: Shows "產品開發部"
  - English mode: Shows "產品開發部" (no translation available)
  - No error, graceful fallback

## Scenario 8: Display New Card with Bilingual Department
- **Given**: Card has `department: { zh: "產品開發部", en: "Product Development" }`
- **When**: Card is displayed
- **Then**:
  - Chinese mode: Shows "產品開發部"
  - English mode: Shows "Product Development"
  - Correct localization

## Scenario 9: Display Preset Department
- **Given**: Card has `department: "數位策略司"` (string)
- **When**: Card is displayed
- **Then**:
  - Chinese mode: Shows "數位策略司"
  - English mode: Shows "Department of Digital Strategy" (via ORG_DEPT_MAPPING)
  - Translation works correctly

---

## Implementation Requirements

### 1. Form HTML Changes

**File**: `workers/public/admin-dashboard.html` (Line ~335)

**Before**:
```html
<div id="custom-department-field" class="hidden">
    <input type="text" id="department-custom" 
           class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-moda text-sm" 
           placeholder="請輸入部門名稱">
</div>
```

**After**:
```html
<div id="custom-department-field" class="hidden space-y-2">
    <input type="text" id="department-custom-zh" 
           class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-moda text-sm" 
           placeholder="請輸入部門名稱（中文）">
    <input type="text" id="department-custom-en" 
           class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-moda text-sm" 
           placeholder="Department Name (English)">
</div>
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 2. Submit Logic Changes

**File**: `workers/public/admin-dashboard.html` (Line ~1483-1486)

**Before**:
```javascript
const departmentPreset = document.getElementById('department-preset').value;
const departmentValue = departmentPreset === 'custom'
    ? document.getElementById('department-custom').value.trim()
    : departmentPreset;
```

**After**:
```javascript
const departmentPreset = document.getElementById('department-preset').value;
let departmentValue;

if (departmentPreset === 'custom') {
    const zh = document.getElementById('department-custom-zh').value.trim();
    const en = document.getElementById('department-custom-en').value.trim();
    
    if (zh && en) {
        departmentValue = { zh, en };
    } else if (zh) {
        departmentValue = zh;
    } else if (en) {
        departmentValue = en;
    } else {
        departmentValue = '';
    }
} else {
    departmentValue = departmentPreset;
}
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 3. Edit Prefill Logic Changes

**File**: `workers/public/admin-dashboard.html` (Line ~1933-1941)

**Before**:
```javascript
if (data.department) {
    if (PRESET_DEPARTMENTS.includes(data.department)) {
        document.getElementById('department-preset').value = data.department;
        document.getElementById('custom-department-field').classList.add('hidden');
    } else {
        document.getElementById('department-preset').value = 'custom';
        document.getElementById('department-custom').value = data.department;
        document.getElementById('custom-department-field').classList.remove('hidden');
    }
}
```

**After**:
```javascript
if (data.department) {
    if (PRESET_DEPARTMENTS.includes(data.department)) {
        document.getElementById('department-preset').value = data.department;
        document.getElementById('custom-department-field').classList.add('hidden');
    } else {
        document.getElementById('department-preset').value = 'custom';
        document.getElementById('custom-department-field').classList.remove('hidden');
        
        if (typeof data.department === 'string') {
            document.getElementById('department-custom-zh').value = data.department;
            document.getElementById('department-custom-en').value = '';
        } else if (data.department && typeof data.department === 'object') {
            document.getElementById('department-custom-zh').value = data.department.zh || '';
            document.getElementById('department-custom-en').value = data.department.en || '';
        }
    }
}
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

### 4. Display Logic Changes

**File**: `workers/public/js/main.js` (Line ~320-339)

**Before**:
```javascript
const dept = cardData.department || '';
if (dept) {
    const deptTranslated = currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
        ? ORG_DEPT_MAPPING.departments[dept]
        : dept;
    
    document.getElementById('user-department').style.display = 'flex';
    document.getElementById('user-department-text').textContent = deptTranslated;
} else {
    document.getElementById('user-department').style.display = 'none';
}
```

**After**:
```javascript
const dept = cardData.department || '';
if (dept) {
    let deptText;
    
    if (typeof dept === 'object' && dept !== null) {
        deptText = currentLanguage === 'en' ? (dept.en || dept.zh || '') : (dept.zh || dept.en || '');
    } else if (typeof dept === 'string') {
        deptText = currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
            ? ORG_DEPT_MAPPING.departments[dept]
            : dept;
    } else {
        deptText = '';
    }
    
    if (deptText) {
        document.getElementById('user-department').style.display = 'flex';
        document.getElementById('user-department-text').textContent = deptText;
    } else {
        document.getElementById('user-department').style.display = 'none';
    }
} else {
    document.getElementById('user-department').style.display = 'none';
}
```

---

### 5. Dropdown Change Handler

**File**: `workers/public/admin-dashboard.html` (existing handler)

**Update**:
```javascript
document.getElementById('department-preset').addEventListener('change', function() {
    const customField = document.getElementById('custom-department-field');
    if (this.value === 'custom') {
        customField.classList.remove('hidden');
        document.getElementById('department-custom-zh').focus();
    } else {
        customField.classList.add('hidden');
    }
});
```

**File**: `workers/public/user-portal.html` (similar location)
- Apply same changes

---

## Testing Requirements

### Manual Testing
- [ ] Create card with preset department → displays correctly
- [ ] Create card with custom zh+en → displays correctly in both languages
- [ ] Create card with custom zh only → displays zh in both languages
- [ ] Create card with custom en only → displays en in both languages
- [ ] Edit old card (string) → prefills zh field, en field empty
- [ ] Edit new card (object) → prefills both fields
- [ ] Switch language on card display → shows correct text
- [ ] Empty department → element hidden

### Edge Cases
- [ ] Very long department name → truncates correctly (RWD fix applied)
- [ ] Special characters in department name → displays correctly
- [ ] Both fields empty → department not saved
- [ ] Edit and clear both fields → department removed

---

## Backward Compatibility

### Old Data (string)
- ✅ Display: Works (shows string in both languages)
- ✅ Edit: Works (prefills zh field, en field empty)
- ✅ Submit: Works (can upgrade to bilingual or keep as string)

### New Data ({ zh, en })
- ✅ Display: Works (shows localized text)
- ✅ Edit: Works (prefills both fields)
- ✅ Submit: Works (maintains bilingual format)

### Preset Departments
- ✅ Display: Works (uses ORG_DEPT_MAPPING)
- ✅ Edit: Works (shows in dropdown)
- ✅ Submit: Works (stores as string)

---

## No Backend Changes Required

- ✅ Type system already supports `BilingualString`
- ✅ Database already supports JSON objects
- ✅ APIs already accept both formats
- ✅ No migration needed

---

## Files to Modify

1. `workers/public/admin-dashboard.html` (3 locations)
2. `workers/public/user-portal.html` (3 locations)
3. `workers/public/js/main.js` (1 location)

**Total**: 3 files, 7 code blocks

---

## Acceptance Criteria

- ✅ Custom department supports bilingual input (zh + en)
- ✅ Preset departments unchanged (string format)
- ✅ Old data (string) displays and edits correctly
- ✅ New data (object) displays and edits correctly
- ✅ Language switching works correctly
- ✅ Form validation allows either zh or en (at least one)
- ✅ No backend changes required
- ✅ No database migration required
- ✅ Backward compatible with existing data
