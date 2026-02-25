# BDD Spec: Retry Button Fix

## Problem Analysis
- **Current Behavior**: Retry button calls `setState('idle')`, only resets UI
- **Expected Behavior**: Retry button should re-process the failed upload
- **Root Cause**: No retry logic, button just resets state

## Scenario: Retry Failed Upload
**Priority**: High

### Given
- User uploads a business card image
- Processing fails (network error, timeout, API error)
- Error message displays with retry button

### When
- User clicks "重試" (Retry) button

### Then
1. **Re-process Upload**: Call `processCard()` with the same file
2. **Preserve File**: Store `currentFile` in ReceivedCardsManager
3. **Show Processing UI**: Display AI processing steps again
4. **Handle Success**: Show preview modal on success
5. **Handle Failure**: Show error message again (allow multiple retries)

### Technical Requirements
- Add `currentFile` property to ReceivedCardsManager
- Store file in `handleFileUpload()` before processing
- Create `retryUpload()` method that calls `processCard(this.currentFile)`
- Update retry button: `onclick="ReceivedCardsManager.retryUpload()"`
- Clear `currentFile` on successful save or cancel

---

## Acceptance Criteria
1. ✅ Retry button re-processes the failed upload
2. ✅ File is preserved across retry attempts
3. ✅ Processing UI shows correctly on retry
4. ✅ Multiple retries allowed
5. ✅ Cancel button still resets to idle state
6. ✅ Code: Minimal changes, preserve existing logic

---

## Target Files
- `workers/public/js/received-cards.js` (ReceivedCardsManager)
- `workers/public/user-portal.html` (retry button onclick)

---

## Implementation Notes
- **Minimal Change**: Only add currentFile storage and retryUpload method
- **No Refactoring**: Keep existing processCard logic
- **Backward Compatible**: Cancel button behavior unchanged
