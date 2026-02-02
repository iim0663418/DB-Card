# Social Link URL Validation - BDD Specification

## Objective
Prevent XSS and URL injection attacks through social link fields

## Problem
- Social links (Facebook, Instagram, LinkedIn, etc.) are not validated
- Attackers could inject dangerous protocols: `javascript:`, `data:`, `vbscript:`
- Potential XSS vulnerability

## Solution
Implement comprehensive URL validation with TDD approach

## Implementation

### Frontend Validation (Immediate Feedback)
**File**: `workers/public/js/social-link-validation.js`

**Functions**:
- `validateSocialLink(url)` - Returns boolean
- `getSocialLinkError(url)` - Returns error message or null

**Validation Rules**:
1. ✅ Allow empty values (optional field)
2. ✅ Allow http:// and https:// only
3. ❌ Block dangerous protocols: javascript:, data:, vbscript:, file:, about:, blob:
4. ❌ Block XSS patterns: <script>, <iframe>, onclick=, etc.
5. ❌ Block URLs with spaces
6. ✅ Allow query parameters and fragments
7. ✅ Validate URL format with URL() constructor

### Backend Validation (Security Layer)
**File**: `workers/src/utils/social-link-validation.ts`

**Functions**:
- `validateSocialLink(url)` - Server-side validation
- `validateAllSocialLinks(socialLinks)` - Batch validation

**Integration Points**:
- `workers/src/handlers/admin/cards.ts` - Admin card creation/update
- `workers/src/handlers/user/cards.ts` - User card creation/update

## Test Cases

### Scenario 1: Valid HTTPS URLs
**Given**: User enters valid HTTPS URL
**When**: Validation runs
**Then**: URL is accepted

**Examples**:
- `https://facebook.com/user` ✅
- `https://www.instagram.com/user` ✅
- `https://linkedin.com/in/user` ✅

### Scenario 2: Valid HTTP URLs
**Given**: User enters valid HTTP URL
**When**: Validation runs
**Then**: URL is accepted (backward compatibility)

**Example**: `http://example.com` ✅

### Scenario 3: Dangerous Protocols Blocked
**Given**: User enters URL with dangerous protocol
**When**: Validation runs
**Then**: URL is rejected with error message

**Examples**:
- `javascript:alert(1)` ❌
- `data:text/html,<script>alert(1)</script>` ❌
- `vbscript:msgbox(1)` ❌
- `file:///etc/passwd` ❌

### Scenario 4: XSS Attempts Blocked
**Given**: User enters URL with XSS payload
**When**: Validation runs
**Then**: URL is rejected

**Examples**:
- `https://example.com/<script>alert(1)</script>` ❌
- `https://example.com/'"onload=alert(1)` ❌

### Scenario 5: Malformed URLs Rejected
**Given**: User enters malformed URL
**When**: Validation runs
**Then**: URL is rejected

**Examples**:
- `not a url` ❌
- `htp://wrong.com` ❌
- `//example.com` ❌

### Scenario 6: Empty Values Allowed
**Given**: User leaves field empty
**When**: Validation runs
**Then**: Empty value is accepted (optional field)

**Examples**:
- `""` ✅
- `null` ✅
- `undefined` ✅

### Scenario 7: URLs with Query Parameters
**Given**: User enters URL with query parameters
**When**: Validation runs
**Then**: URL is accepted

**Examples**:
- `https://example.com?param=value` ✅
- `https://example.com?param=value&other=123` ✅

### Scenario 8: URLs with Fragments
**Given**: User enters URL with fragment
**When**: Validation runs
**Then**: URL is accepted

**Example**: `https://example.com#section` ✅

## Security Benefits
- ✅ Prevents XSS through URL injection
- ✅ Blocks dangerous protocols
- ✅ Validates URL format
- ✅ Frontend + Backend double validation
- ✅ Clear error messages for users

## Files Created
- `workers/public/js/social-link-validation.js` - Frontend validation
- `workers/src/utils/social-link-validation.ts` - Backend validation
- `tests/unit-tests-template/social-link-validation.test.js` - Unit tests

## Files Modified
- `workers/public/admin-dashboard.html` - Add validation script
- `workers/public/user-portal.html` - Add validation script

## Testing
- ✅ 10 test scenarios written (TDD)
- ✅ Frontend validation implemented
- ✅ Backend validation implemented
- ⏳ Integration testing pending

## Estimated Time
- Test writing: 30 minutes ✅
- Implementation: 30 minutes ✅
- Integration: 30 minutes (next)
- **Total**: 1.5 hours
