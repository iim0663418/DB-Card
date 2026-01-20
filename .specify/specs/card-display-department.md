# Card Display - Department Field Display - BDD Specification

## Feature: Display Department Field on Card Display Page
**Purpose**: Show department information below title for better professional context
**Additional**: Handle empty title gracefully

---

## Scenario 1: Display Department (Title Present)
- **Given**: Card has title "數位策略司司長" and department "數位策略司"
- **When**: Card is rendered
- **Then**:
  - Title is displayed
  - Department is displayed below title
  - Department has briefcase icon
  - Department text is muted (text-slate-500)
  - Department is smaller than title (text-sm)

## Scenario 2: Display Custom Department
- **Given**: Card has custom department "產品開發部"
- **When**: Card is rendered
- **Then**:
  - Department "產品開發部" is displayed
  - No translation applied (custom departments show as-is)

## Scenario 3: Hide Department When Empty
- **Given**: Card has no department (empty or null)
- **When**: Card is rendered
- **Then**:
  - Department element is hidden (display: none)
  - No empty space or placeholder shown

## Scenario 4: Department Translation (English)
- **Given**: Card has department "數位策略司" and language is English
- **When**: Card is rendered
- **Then**:
  - Department displays "Department of Digital Strategy"
  - Translation from ORG_DEPT_MAPPING is used

## Scenario 5: Custom Department (English)
- **Given**: Card has custom department "產品開發部" and language is English
- **When**: Card is rendered
- **Then**:
  - Department displays "產品開發部" (no translation)
  - Custom departments show original text in all languages

## Scenario 6: Language Switch with Department
- **Given**: Card is displayed with department "數位策略司" in Chinese
- **When**: User switches to English
- **Then**:
  - Department updates to "Department of Digital Strategy"
  - Icon remains unchanged

## Scenario 7: Empty Title Handling
- **Given**: Card has no title (empty or null) but has department
- **When**: Card is rendered
- **Then**:
  - Title element is hidden (display: none)
  - Department is still displayed
  - No awkward empty space for title

## Scenario 8: Both Title and Department Empty
- **Given**: Card has no title and no department
- **When**: Card is rendered
- **Then**:
  - Both title and department elements are hidden
  - Name is displayed normally
  - No empty space below name

---

## Implementation Requirements

### HTML Changes (card-display.html)

**Add department element after title**:
```html
<p id="user-title" class="text-sm text-slate-500 mt-1" style="display:none;">---</p>
<p id="user-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1" style="display:none;">
    <i data-lucide="briefcase" class="w-3 h-3"></i>
    <span id="user-department-text">---</span>
</p>
```

### JavaScript Changes (main.js)

**1. Update renderCard() - Title Handling**:
```javascript
// Title (conditional display)
const title = cardData.title || '';
if (title) {
    document.getElementById('user-title').style.display = 'block';
    document.getElementById('user-title').textContent = title;
} else {
    document.getElementById('user-title').style.display = 'none';
}
```

**2. Update renderCard() - Department Handling**:
```javascript
// Department (conditional display with translation)
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

**3. Update updateLanguage() - Department Translation**:
```javascript
// Update department translation on language switch
const dept = cardData.department || '';
if (dept) {
    const deptTranslated = currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
        ? ORG_DEPT_MAPPING.departments[dept]
        : dept;
    document.getElementById('user-department-text').textContent = deptTranslated;
}
```

### Design Specifications

**Icon**: `briefcase` (Lucide)
**Size**: `text-sm` (same as title)
**Color**: `text-slate-500` (muted, same as title)
**Layout**: `flex items-center gap-1` (icon + text)
**Icon Size**: `w-3 h-3` (small, subtle)
**Display**: Conditional (hidden when empty)

### Responsive Behavior
- Same responsive behavior as title
- Truncate long department names if needed
- Maintain visual hierarchy: Name > Title > Department

---

## Testing Checklist

### Display Tests
- [ ] Department displays correctly with title
- [ ] Department displays correctly without title
- [ ] Department hides when empty
- [ ] Custom department displays correctly
- [ ] Icon renders correctly

### Translation Tests
- [ ] MODA departments translate to English
- [ ] Custom departments show original text in English
- [ ] Language switch updates department text
- [ ] Chinese display shows original department

### Edge Cases
- [ ] Empty title + empty department (both hidden)
- [ ] Empty title + has department (department shows)
- [ ] Has title + empty department (title shows)
- [ ] Very long department name (truncation)

### Visual Tests
- [ ] Department doesn't compete with title for attention
- [ ] Icon aligns properly with text
- [ ] Spacing is consistent
- [ ] Responsive layout works on mobile
