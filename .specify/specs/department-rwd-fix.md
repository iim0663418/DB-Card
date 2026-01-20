# Department Field RWD Fix - BDD Specification

## Feature: Fix Department Field Responsive Layout
**Purpose**: Ensure department field aligns correctly and handles long names gracefully across all screen sizes

---

## Scenario 1: Mobile Alignment (< 1024px)
- **Given**: User views card on mobile device
- **When**: Department is displayed
- **Then**:
  - Department is centered (matches name/title alignment)
  - Icon and text are horizontally centered as a unit
  - Visual hierarchy is consistent

## Scenario 2: Desktop Alignment (≥ 1024px)
- **Given**: User views card on desktop
- **When**: Department is displayed
- **Then**:
  - Department is left-aligned (matches name/title alignment)
  - Icon and text are left-aligned as a unit
  - Visual hierarchy is consistent

## Scenario 3: Long Department Name on Mobile
- **Given**: Department name is "產品開發與創新技術研究部門" (13 chars)
- **When**: Viewed on mobile (320px - 768px)
- **Then**:
  - Text is truncated with ellipsis (...)
  - Maximum width is 250px
  - Icon remains visible and aligned
  - No horizontal scrollbar

## Scenario 4: Long Department Name on Desktop
- **Given**: Department name is "Department of Communications and Cyber Resilience"
- **When**: Viewed on desktop (≥ 1024px)
- **Then**:
  - Full text is displayed (no truncation)
  - No maximum width constraint
  - Text wraps naturally if needed

## Scenario 5: Icon Stability
- **Given**: Department has very long name
- **When**: Text is truncated or wraps
- **Then**:
  - Icon size remains w-3 h-3
  - Icon does not shrink or distort
  - Icon stays aligned with text

---

## Implementation

### HTML Changes (card-display.html)

**Before**:
```html
<p id="user-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1" style="display:none;">
    <i data-lucide="briefcase" class="w-3 h-3"></i>
    <span id="user-department-text">---</span>
</p>
```

**After**:
```html
<p id="user-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center lg:justify-start" style="display:none;">
    <i data-lucide="briefcase" class="w-3 h-3 flex-shrink-0"></i>
    <span id="user-department-text" class="truncate max-w-[250px] lg:max-w-none">---</span>
</p>
```

### CSS Classes Added

**Container (`<p>`)**:
- `justify-center`: Center content on mobile
- `lg:justify-start`: Left-align content on desktop (≥1024px)

**Icon (`<i>`)**:
- `flex-shrink-0`: Prevent icon from shrinking

**Text (`<span>`)**:
- `truncate`: Add ellipsis for overflow text
- `max-w-[250px]`: Limit width on mobile
- `lg:max-w-none`: Remove width limit on desktop

---

## Testing Requirements

### Visual Regression Tests
- [ ] Mobile (375px): Department centered, matches name/title
- [ ] Tablet (768px): Department centered, matches name/title
- [ ] Desktop (1024px): Department left-aligned, matches name/title
- [ ] Large Desktop (1440px): Department left-aligned, full text visible

### Content Tests
- [ ] Short name (5 chars): "數位策略司" - displays fully
- [ ] Medium name (10 chars): "產品開發部門" - displays fully on mobile
- [ ] Long name (13 chars): "產品開發與創新技術研究部門" - truncates on mobile
- [ ] Long English (50 chars): "Department of Communications..." - truncates on mobile, full on desktop

### Edge Cases
- [ ] Empty department: Element hidden (no visual impact)
- [ ] Icon rendering: Lucide icon renders correctly at w-3 h-3
- [ ] Language switch: Alignment maintained after switching zh ↔ en

---

## Expected Results

### Mobile (< 1024px)
```
        [Name]
        [Title]
      📁 Dept...    ← Centered, truncated
```

### Desktop (≥ 1024px)
```
[Name]
[Title]
📁 Department Name    ← Left-aligned, full text
```

---

## No JavaScript Changes Required
- Pure CSS fix
- No logic modification needed
- Existing conditional display logic unchanged
