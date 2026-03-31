# BDD Spec: Search Loading Feedback Enhancement

## Scenario 1: Immediate Visual Feedback on Search Input
**Given**: User types in search input field  
**When**: Debounce timer starts (300ms)  
**Then**:
- Result count shows "搜尋中..." with blue color and pulse animation
- Search input remains enabled (allow typing)
- Clear button remains visible

## Scenario 2: Loading State During API Call
**Given**: Debounce timer completes and API call starts  
**When**: SearchOrchestrator executes search  
**Then**:
- Result count shows "智慧搜尋中..." with blue color and pulse animation
- Loading state persists until API response or timeout
- Previous results remain visible (no flash of empty state)

## Scenario 3: Success State After Results
**Given**: API returns search results  
**When**: Results are rendered  
**Then**:
- Result count shows "{count} (智慧搜尋)" with normal color
- Pulse animation stops
- Cards are rendered with new results

## Scenario 4: Degraded Mode Fallback
**Given**: Circuit breaker opens or API fails  
**When**: Fallback to local filter  
**Then**:
- Result count shows "{count} (本地搜尋)" with yellow color
- User sees one-time notification about degraded mode
- Search continues to work with local data

## Scenario 5: Rapid Input Handling
**Given**: User types rapidly (multiple keystrokes within 300ms)  
**When**: Each keystroke resets debounce timer  
**Then**:
- Only one API call is made after user stops typing
- Loading state shows throughout debounce period
- No duplicate requests are sent

## Technical Requirements
1. **Minimal Code Changes**: Only modify `_triggerSearch()` method
2. **No Breaking Changes**: Preserve existing SearchOrchestrator behavior
3. **Performance**: Loading state update < 16ms (60fps)
4. **Accessibility**: Loading state announced to screen readers

## Implementation Constraints
- Do NOT modify SearchOrchestrator class
- Do NOT add new DOM elements
- Use existing `resultCount` element for all feedback
- Preserve IME protection logic
