# BDD Spec: Loading Animation Timing Optimization

## Context
- **Issue**: Current loading animation shows "Almost done..." at 4s, but actual load time is 10-15s (uncached)
- **User Experience**: Users see "Almost done" then wait 6-11 more seconds, causing frustration
- **Root Cause**: Timing intervals (2s, 4s) don't match actual load time
- **Industry Standards**: 
  - Usersnap: 10+ seconds requires stage-based indicators
  - Particula Tech: Each stage resets user's patience clock
  - Best Practice: Avoid saying "almost done" too early

## Feature: Optimized Progressive Loading Messages

### Scenario 1: Stage 1 - Initial Loading (0-4s)
**Given** user visits card-display.html
**When** page starts loading (0-4 seconds elapsed)
**Then** loading message displays:
  - Chinese: "載入名片資料..."
  - English: "Loading card data..."

### Scenario 2: Stage 2 - Decryption (4-8s)
**Given** loading has been in progress for 4 seconds
**When** 4 seconds have elapsed
**Then** loading message changes to:
  - Chinese: "雲端資料解密中..."
  - English: "Decrypting cloud data..."

### Scenario 3: Stage 3 - Processing (8-12s) [NEW]
**Given** loading has been in progress for 8 seconds
**When** 8 seconds have elapsed
**Then** loading message changes to:
  - Chinese: "處理中，請稍候..."
  - English: "Processing, please wait..."

### Scenario 4: Stage 4 - Final Stage (12s+)
**Given** loading has been in progress for 12 seconds
**When** 12 seconds have elapsed
**Then** loading message changes to:
  - Chinese: "即將完成..."
  - English: "Almost done..."

### Scenario 5: Cleanup on Load Complete
**Given** loading animation is showing any stage
**When** hideLoading() is called (data loaded successfully)
**Then** all setTimeout timers are cleared via window.clearLoadingTimeouts()
**And** loading animation is hidden

## Technical Requirements

### File to Modify
- `workers/public/card-display.html`

### Changes Required
1. **Add Stage 3** to loadingMessages object:
   ```javascript
   const loadingMessages = {
       stage1: { zh: '載入名片資料...', en: 'Loading card data...' },
       stage2: { zh: '雲端資料解密中...', en: 'Decrypting cloud data...' },
       stage3: { zh: '處理中，請稍候...', en: 'Processing, please wait...' },  // NEW
       stage4: { zh: '即將完成...', en: 'Almost done...' }
   };
   ```

2. **Update setTimeout intervals**:
   - Stage 2: 2000ms → 4000ms (4 seconds)
   - Stage 3: NEW → 8000ms (8 seconds)
   - Stage 4: 4000ms → 12000ms (12 seconds)

3. **Update timeout array**:
   ```javascript
   loadingTimeouts.push(setTimeout(() => {
       loadingText.textContent = loadingMessages.stage2[getCurrentLang()] || loadingMessages.stage2.zh;
   }, 4000));
   
   loadingTimeouts.push(setTimeout(() => {
       loadingText.textContent = loadingMessages.stage3[getCurrentLang()] || loadingMessages.stage3.zh;
   }, 8000));
   
   loadingTimeouts.push(setTimeout(() => {
       loadingText.textContent = loadingMessages.stage4[getCurrentLang()] || loadingMessages.stage4.zh;
   }, 12000));
   ```

## Acceptance Criteria
- ✅ 4 stages total (was 3)
- ✅ Intervals: 0s, 4s, 8s, 12s (was 0s, 2s, 4s)
- ✅ "Almost done" only appears after 12 seconds
- ✅ Bilingual support maintained
- ✅ Timeout cleanup works correctly
- ✅ No breaking changes to existing functionality

## External Research References
1. **Usersnap**: "Use percent-done animation for actions that take 10 seconds or more"
   - Source: https://usersnap.com/blog/progress-indicators/
   
2. **Particula Tech**: "Each stage provides a new piece of information, resetting the user's patience clock"
   - Source: https://particula.tech/blog/long-running-ai-tasks-user-interface-patterns
   
3. **Industry Standard**: Stage-based indicators for 10+ second operations
   - Timing: 4-second intervals for 10-15 second total load time
   - Principle: Avoid premature "almost done" messages

## Expected User Experience Improvement
- **Before**: "Almost done" at 4s, then wait 6-11s (frustrating)
- **After**: "Almost done" at 12s, then wait 0-3s (acceptable)
- **Benefit**: Each stage resets patience clock, reducing perceived wait time
