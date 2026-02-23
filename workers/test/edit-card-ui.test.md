# Edit Card UI - Manual Testing Checklist

## Test Environment
- Browser: Chrome/Firefox/Safari
- User Portal: http://localhost:8787/user-portal.html

## Test Cases

### 1. Edit Button Display
- [ ] Navigate to Received Cards section
- [ ] Verify each card shows an edit button (blue pencil icon)
- [ ] Edit button is positioned between "View" and "Export" buttons

### 2. Open Edit Modal
- [ ] Click edit button on a card
- [ ] Modal appears with title "編輯名片"
- [ ] Form is pre-filled with card data:
  - Name (姓名)
  - Title (職稱)
  - Company (公司)
  - Email
  - Phone (電話)
  - Website (網站)
  - Address (地址)
  - Notes (備註)

### 3. Form Validation
- [ ] Clear the name field and try to submit
- [ ] Error toast: "姓名為必填欄位"
- [ ] Enter invalid email: "test@invalid"
- [ ] Error toast: "Email 格式不正確"
- [ ] Enter invalid URL: "not-a-url"
- [ ] Error toast: "網站格式不正確"

### 4. Update Card
- [ ] Modify name: Change to "Updated Name"
- [ ] Modify title: Change to "New Title"
- [ ] Click "儲存" button
- [ ] Modal closes
- [ ] Success toast: "名片已更新"
- [ ] Card list refreshes with updated data
- [ ] Verify updated data is visible in card

### 5. Cancel Edit
- [ ] Click edit button
- [ ] Make some changes
- [ ] Click "取消" button
- [ ] Modal closes
- [ ] No changes saved (verify card still has original data)

### 6. Close Modal - Background Click
- [ ] Click edit button
- [ ] Click on the dark background (outside modal)
- [ ] Modal closes
- [ ] No changes saved

### 7. Close Modal - ESC Key
- [ ] Click edit button
- [ ] Press ESC key
- [ ] Modal closes
- [ ] No changes saved

### 8. Update All Fields
- [ ] Click edit button
- [ ] Update all 8 fields with new values
- [ ] Click "儲存"
- [ ] Verify all fields are updated correctly in the card

### 9. Empty Optional Fields
- [ ] Click edit button on a card with all fields filled
- [ ] Clear all optional fields (leave only name)
- [ ] Click "儲存"
- [ ] Verify card shows only name

### 10. API Integration
- [ ] Open browser DevTools Network tab
- [ ] Edit a card and save
- [ ] Verify PATCH request to `/api/user/received-cards/{uuid}`
- [ ] Verify request body contains updated fields
- [ ] Verify response status: 200 OK

## Expected Behavior Summary

### UI Elements
✓ Edit button with blue pencil icon
✓ Modal with form fields
✓ Cancel and Save buttons
✓ Responsive design (mobile/desktop)

### Validation
✓ Name is required
✓ Email format validation
✓ URL format validation
✓ Error messages via toast

### Data Flow
✓ Load card data into form
✓ Validate on submit
✓ Send PATCH request
✓ Reload card list
✓ Show success/error toast

### UX Features
✓ ESC key to close
✓ Click background to close
✓ Cancel button to close
✓ Form reset on close
✓ Icons rendered correctly

## Notes
- All tests should pass without errors
- Console should show no JavaScript errors
- Network requests should complete successfully
- UI should remain responsive during operations
