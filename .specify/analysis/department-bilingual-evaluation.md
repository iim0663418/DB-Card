# Department Bilingual Support Evaluation

## Current Implementation Analysis

### Address Bilingual Pattern
**Data Structure**:
```json
{
  "address": {
    "zh": "10058 台北市中正區延平南路143號",
    "en": "No. 143, Yanping S. Rd., Taipei 10058"
  }
}
```

**Frontend Display**:
```javascript
const addr = getLocalizedText(cardData.address, currentLanguage);
// Returns: cardData.address.zh or cardData.address.en based on language
```

**Form Input**:
- Two separate input fields: `address_zh` and `address_en`
- Both fields visible simultaneously
- User inputs both languages at creation time

### Current Department Implementation
**Data Structure**:
```json
{
  "department": "數位策略司"  // Single string
}
```

**Display Logic**:
- MODA departments: Use ORG_DEPT_MAPPING for translation
- Custom departments: Show original text (no translation)

---

## Proposal: Department Bilingual Support

### Option A: Full Bilingual (Like Address) ⭐ RECOMMENDED

**Data Structure**:
```json
{
  "department": {
    "zh": "產品開發部",
    "en": "Product Development Department"
  }
}
```

**Benefits**:
- ✅ User controls translation quality
- ✅ Consistent with address pattern
- ✅ Works for all departments (MODA + custom)
- ✅ No need for ORG_DEPT_MAPPING

**Drawbacks**:
- ⚠️ Requires database migration (backward compatibility)
- ⚠️ More complex form (two input fields)
- ⚠️ Users must input both languages

### Option B: Hybrid (Current + Optional English)

**Data Structure**:
```json
{
  "department": "產品開發部",
  "department_en": "Product Development Department"  // Optional
}
```

**Benefits**:
- ✅ Backward compatible (department remains string)
- ✅ Optional English input
- ✅ Simpler migration

**Drawbacks**:
- ⚠️ Inconsistent with address pattern
- ⚠️ Still need ORG_DEPT_MAPPING for MODA departments

### Option C: Keep Current (No Change)

**Rationale**:
- MODA departments already have translations (ORG_DEPT_MAPPING)
- Custom departments are typically organization-specific
- Most users won't need bilingual custom departments

---

## Implementation Requirements (Option A)

### 1. Database Migration
**No schema change needed** - `encrypted_payload` is JSON, already supports nested objects

### 2. Backend Changes
**handlers/admin/cards.ts** - Update validation:
```typescript
// Accept both formats:
// Old: department: string
// New: department: { zh: string, en: string }
```

### 3. Frontend Form Changes

**user-portal.html & admin-dashboard.html**:
```html
<!-- Replace single department input with bilingual inputs -->
<div id="custom-department-field" class="hidden space-y-2">
    <input 
        type="text" 
        id="department_zh" 
        placeholder="中文部門名稱（例：產品開發部）"
    />
    <input 
        type="text" 
        id="department_en" 
        placeholder="English Department (e.g., Product Development)"
    />
</div>
```

**Form Submission Logic**:
```javascript
function getDepartmentValue() {
    const preset = document.getElementById('department-preset').value;
    if (preset === 'custom') {
        const zh = document.getElementById('department_zh').value.trim();
        const en = document.getElementById('department_en').value.trim();
        return { zh, en };
    }
    // MODA departments: Keep as string, use ORG_DEPT_MAPPING
    return preset;
}
```

### 4. Display Logic Changes

**main.js renderCard()**:
```javascript
// Department (conditional display with bilingual support)
const dept = cardData.department || '';
if (dept) {
    // Use getLocalizedText for both MODA and custom departments
    const deptText = typeof dept === 'string' 
        ? (currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
            ? ORG_DEPT_MAPPING.departments[dept]
            : dept)
        : getLocalizedText(dept, currentLanguage);
    
    document.getElementById('user-department').style.display = 'flex';
    document.getElementById('user-department-text').textContent = deptText;
}
```

### 5. Backward Compatibility

**Handle both formats**:
```javascript
// Old format: department: "數位策略司"
// New format: department: { zh: "產品開發部", en: "Product Development" }

if (typeof cardData.department === 'string') {
    // Old format - use ORG_DEPT_MAPPING
} else if (typeof cardData.department === 'object') {
    // New format - use getLocalizedText
}
```

---

## Migration Strategy

### Phase 1: Add Support (Non-Breaking)
1. Update form to accept bilingual input
2. Update display logic to handle both formats
3. Keep ORG_DEPT_MAPPING for MODA departments
4. New cards can use bilingual format

### Phase 2: Gradual Migration (Optional)
1. Existing cards continue to work (string format)
2. Users can edit and convert to bilingual format
3. No forced migration required

---

## Effort Estimation

### Option A (Full Bilingual)
- **Frontend Forms**: 2 hours (two input fields + validation)
- **Display Logic**: 1 hour (getLocalizedText integration)
- **Testing**: 1 hour (both formats, language switch)
- **Total**: 4 hours

### Option C (No Change)
- **Effort**: 0 hours
- **Trade-off**: Custom departments remain Chinese-only

---

## Recommendation

### Short-term: Option C (No Change) ⭐
**Rationale**:
- MODA departments already have translations
- Custom departments are typically internal (less need for English)
- Current implementation is sufficient for most use cases
- Avoid complexity without clear user demand

### Long-term: Option A (If User Demand Exists)
**Trigger**: If users request bilingual custom departments
**Implementation**: Follow address pattern for consistency

---

## Decision Criteria

**Implement Option A if**:
- Users frequently create custom departments
- Users need English versions of custom departments
- International audience is significant

**Keep Option C if**:
- Most users use MODA departments (already translated)
- Custom departments are rare
- Users don't request bilingual support

---

## Current Status

**Implemented**: Option C (No Change)
- MODA departments: Translated via ORG_DEPT_MAPPING
- Custom departments: Display original text
- Sufficient for current use cases

**Next Steps**: Monitor user feedback for bilingual custom department requests
