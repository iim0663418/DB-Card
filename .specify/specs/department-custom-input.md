# Department Custom Input Module - BDD Specification

## Feature: Add Custom Department Input Option
**Purpose**: Allow users to input custom department names beyond predefined MODA departments
**Pattern**: Follow existing address-preset custom input pattern

---

## Background
- Current: Fixed dropdown with 16 MODA departments
- Issue: Users from other organizations or non-standard departments cannot input their department
- Solution: Add "自訂部門" option that reveals a text input field

---

## Scenario 1: Select Predefined Department
- **Given**: User is creating/editing a card
- **When**: User selects a predefined department (e.g., "數位策略司")
- **Then**:
  - Department value is set to selected option
  - Custom input field remains hidden
  - Form validation passes

## Scenario 2: Select Custom Department Option
- **Given**: User is on the department selection dropdown
- **When**: User selects "自訂部門" option
- **Then**:
  - Custom department input field becomes visible
  - Input field is focused automatically
  - Placeholder text: "請輸入部門名稱"
  - Custom input field is required when "自訂部門" is selected

## Scenario 3: Enter Custom Department Name
- **Given**: User has selected "自訂部門"
- **When**: User types "產品開發部" in the custom input field
- **Then**:
  - Custom input value is captured
  - Form submission uses custom input value as department
  - Value is saved to database correctly

## Scenario 4: Switch from Custom to Predefined
- **Given**: User has entered custom department "產品開發部"
- **When**: User switches dropdown back to "數位策略司"
- **Then**:
  - Custom input field becomes hidden
  - Custom input value is cleared
  - Predefined department value is used

## Scenario 5: Edit Card with Custom Department
- **Given**: Card has custom department "產品開發部" saved
- **When**: User opens edit form
- **Then**:
  - Dropdown shows "自訂部門" selected
  - Custom input field is visible
  - Custom input field contains "產品開發部"

## Scenario 6: Edit Card with Predefined Department
- **Given**: Card has predefined department "數位策略司" saved
- **When**: User opens edit form
- **Then**:
  - Dropdown shows "數位策略司" selected
  - Custom input field remains hidden

---

## Implementation Requirements

### HTML Structure (Both user-portal.html & admin-dashboard.html)

**Before**:
```html
<select id="department">
    <option value="">請選擇部門</option>
    <option value="數位策略司">數位策略司</option>
    <!-- ... 15 more options ... -->
</select>
```

**After**:
```html
<select id="department-preset">
    <option value="">請選擇部門</option>
    <option value="數位策略司">數位策略司</option>
    <!-- ... 15 more options ... -->
    <option value="custom">自訂部門</option>
</select>

<div id="custom-department-field" class="hidden mt-2">
    <input 
        type="text" 
        id="department-custom" 
        placeholder="請輸入部門名稱"
        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
    />
</div>
```

### JavaScript Logic

**1. Toggle Custom Field Visibility**:
```javascript
document.getElementById('department-preset').addEventListener('change', (e) => {
    const customField = document.getElementById('custom-department-field');
    if (e.target.value === 'custom') {
        customField.classList.remove('hidden');
        document.getElementById('department-custom').focus();
    } else {
        customField.classList.add('hidden');
        document.getElementById('department-custom').value = '';
    }
});
```

**2. Form Submission Logic**:
```javascript
function getDepartmentValue() {
    const preset = document.getElementById('department-preset').value;
    if (preset === 'custom') {
        return document.getElementById('department-custom').value.trim();
    }
    return preset;
}
```

**3. Edit Form Prefill Logic**:
```javascript
function prefillDepartment(departmentValue) {
    const presetOptions = ['數位策略司', '數位政府司', /* ... */];
    
    if (presetOptions.includes(departmentValue)) {
        document.getElementById('department-preset').value = departmentValue;
        document.getElementById('custom-department-field').classList.add('hidden');
    } else if (departmentValue) {
        document.getElementById('department-preset').value = 'custom';
        document.getElementById('custom-department-field').classList.remove('hidden');
        document.getElementById('department-custom').value = departmentValue;
    }
}
```

### Files to Modify

**1. user-portal.html**
- Update department dropdown HTML (add "自訂部門" option)
- Add custom input field HTML
- Add event listener for dropdown change
- Update form submission logic (getDepartmentValue)
- Update edit form prefill logic

**2. admin-dashboard.html**
- Same changes as user-portal.html
- Ensure consistency with existing address-preset pattern

### Design Consistency

**user-portal.html**:
- Input class: `w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl`
- Match existing form field styling

**admin-dashboard.html**:
- Input class: `w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl`
- Match existing form field styling

### Validation

- Custom department input is required when "自訂部門" is selected
- Trim whitespace from custom input
- Minimum length: 2 characters
- Maximum length: 50 characters

---

## Testing Checklist

### User Portal
- [ ] Select predefined department → saves correctly
- [ ] Select "自訂部門" → custom field appears
- [ ] Enter custom department → saves correctly
- [ ] Switch from custom to predefined → custom field hides
- [ ] Edit card with custom department → prefills correctly
- [ ] Edit card with predefined department → prefills correctly

### Admin Dashboard
- [ ] Same 6 tests as User Portal
- [ ] Preview card → department displays correctly

### Edge Cases
- [ ] Empty custom input → validation error
- [ ] Very long custom input (>50 chars) → truncated or error
- [ ] Special characters in custom input → handled correctly
- [ ] Whitespace-only custom input → validation error
