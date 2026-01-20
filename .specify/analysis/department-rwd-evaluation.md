# Department Field RWD Evaluation

## Current Implementation

### HTML Structure
```html
<div class="flex-1 text-center lg:text-left">
    <h1 id="user-name" class="text-5xl lg:text-7xl ...">Name</h1>
    <p id="user-title" class="text-moda-dark font-bold ...">Title</p>
    <p id="user-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1">
        <i data-lucide="briefcase" class="w-3 h-3"></i>
        <span id="user-department-text">Department</span>
    </p>
</div>
```

### Current CSS Classes
- `text-sm`: Fixed small text size
- `text-slate-500`: Muted color
- `mt-1`: Small top margin
- `flex items-center gap-1`: Horizontal layout with icon
- `w-3 h-3`: Small icon size

### Parent Container
- `text-center lg:text-left`: Centered on mobile, left-aligned on desktop
- `flex-1`: Takes available space

---

## RWD Issues Analysis

### ❌ Issue 1: Text Alignment Inconsistency

**Problem**: Department uses `flex` but parent uses `text-center` on mobile

**Current Behavior**:
- Mobile: Parent is `text-center`, but department is `flex` (defaults to left-aligned)
- Desktop: Parent is `text-left`, department is `flex` (left-aligned)
- **Result**: Department appears left-aligned on mobile while name/title are centered

**Visual Impact**:
```
Mobile (< 1024px):
    [Name - Centered]
    [Title - Centered]
📁 Department - Left    ← MISALIGNED

Desktop (≥ 1024px):
[Name - Left]
[Title - Left]
📁 Department - Left    ← ALIGNED
```

### ❌ Issue 2: Long Department Names

**Problem**: No truncation or wrapping strategy

**Scenarios**:
1. **Long MODA Department**: "數位策略司" (5 chars) - OK
2. **Long Custom Department**: "產品開發與創新技術研究部門" (13 chars) - May wrap
3. **Long English Translation**: "Department of Communications and Cyber Resilience" (50 chars) - Will wrap

**Current Behavior**: Text wraps to next line (no truncation)

**Visual Impact**:
```
📁 Department of Communications and 
   Cyber Resilience
```
- Icon on first line, text wraps below
- Inconsistent with single-line title

### ❌ Issue 3: Icon Alignment on Wrap

**Problem**: When text wraps, icon stays on first line

**Current**: `flex items-center` aligns icon to center of first line
**Issue**: Icon not aligned with wrapped text

### ⚠️ Issue 4: Mobile Screen Width

**Problem**: Small screens (320px - 375px) may have limited space

**Calculation**:
- Container padding: 10px × 2 = 20px
- Available width: 320px - 20px = 300px
- Long department name may exceed width

---

## Proposed Solutions

### Solution 1: Fix Text Alignment (CRITICAL) ⭐

**Add responsive alignment classes**:
```html
<p id="user-department" class="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center lg:justify-start">
    <i data-lucide="briefcase" class="w-3 h-3"></i>
    <span id="user-department-text">Department</span>
</p>
```

**Changes**:
- `justify-center`: Center department on mobile (matches name/title)
- `lg:justify-start`: Left-align on desktop (matches name/title)

**Result**:
```
Mobile:
    [Name - Centered]
    [Title - Centered]
  📁 Department - Centered  ← FIXED

Desktop:
[Name - Left]
[Title - Left]
📁 Department - Left
```

### Solution 2: Truncate Long Department Names (RECOMMENDED) ⭐

**Add truncation to text span**:
```html
<span id="user-department-text" class="truncate max-w-[250px] lg:max-w-none">
    Department
</span>
```

**Changes**:
- `truncate`: Adds `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- `max-w-[250px]`: Limit width on mobile (prevents overflow)
- `lg:max-w-none`: No limit on desktop (more space available)

**Result**:
```
Mobile:
📁 Department of Communicat...

Desktop:
📁 Department of Communications and Cyber Resilience
```

### Solution 3: Alternative - Wrap with Icon Alignment

**Change to block layout**:
```html
<div id="user-department" class="text-sm text-slate-500 mt-1">
    <div class="flex items-start gap-1 justify-center lg:justify-start">
        <i data-lucide="briefcase" class="w-3 h-3 mt-0.5 flex-shrink-0"></i>
        <span id="user-department-text" class="break-words">Department</span>
    </div>
</div>
```

**Changes**:
- `items-start`: Align icon to top when text wraps
- `mt-0.5`: Slight vertical adjustment for icon
- `flex-shrink-0`: Prevent icon from shrinking
- `break-words`: Allow text to wrap at word boundaries

**Result**: Icon stays aligned with first line of wrapped text

---

## Recommended Implementation

### Approach: Solution 1 + Solution 2 (Hybrid) ⭐

**Rationale**:
- Fix alignment issue (critical UX problem)
- Truncate long names (prevents layout breaking)
- Simple implementation (minimal CSS changes)
- Consistent with title behavior (single line)

**Implementation**:
```html
<p id="user-department" 
   class="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center lg:justify-start"
   style="display:none;">
    <i data-lucide="briefcase" class="w-3 h-3 flex-shrink-0"></i>
    <span id="user-department-text" class="truncate max-w-[250px] lg:max-w-none">---</span>
</p>
```

**CSS Classes Added**:
1. `justify-center lg:justify-start` - Fix alignment
2. `flex-shrink-0` on icon - Prevent icon shrinking
3. `truncate max-w-[250px] lg:max-w-none` on text - Truncate long names

---

## Testing Checklist

### Breakpoints to Test
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 390px (iPhone 14 Pro)
- [ ] 768px (iPad Portrait)
- [ ] 1024px (Desktop)
- [ ] 1440px (Large Desktop)

### Test Cases
- [ ] Short department (5 chars): "數位策略司"
- [ ] Medium department (10 chars): "產品開發部門"
- [ ] Long department (15+ chars): "產品開發與創新技術研究部門"
- [ ] Long English (50+ chars): "Department of Communications and Cyber Resilience"
- [ ] Empty department (should hide)

### Visual Checks
- [ ] Alignment matches name/title on mobile (centered)
- [ ] Alignment matches name/title on desktop (left)
- [ ] Icon doesn't shrink or distort
- [ ] Text truncates with ellipsis on mobile
- [ ] Text displays fully on desktop (if space allows)
- [ ] No horizontal scrollbar
- [ ] Consistent spacing with title

---

## Risk Assessment

### Low Risk
- ✅ CSS-only changes (no JS modification)
- ✅ Tailwind utility classes (well-tested)
- ✅ Backward compatible (no breaking changes)

### Medium Risk
- ⚠️ Truncation may hide important information
  - **Mitigation**: Desktop shows full text
  - **Mitigation**: Users can see full text in vCard download

### Testing Required
- ⚠️ Test on real devices (not just browser DevTools)
- ⚠️ Test with various department name lengths
- ⚠️ Test language switching (zh ↔ en)

---

## Implementation Priority

**Priority**: HIGH (Critical UX issue on mobile)

**Estimated Effort**: 15 minutes
- Update HTML classes
- Test on multiple breakpoints
- Verify alignment and truncation

**Impact**: 
- Fixes misalignment on mobile (affects all users)
- Prevents layout breaking with long names
- Improves visual consistency

---

## Final Recommendation

**Implement Solution 1 + Solution 2 immediately**

**Changes Required**:
1. Add `justify-center lg:justify-start` to department container
2. Add `flex-shrink-0` to icon
3. Add `truncate max-w-[250px] lg:max-w-none` to text span

**Expected Result**:
- ✅ Proper alignment on all screen sizes
- ✅ Long names truncated gracefully on mobile
- ✅ Full names visible on desktop
- ✅ Consistent visual hierarchy
