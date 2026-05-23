# BDD Spec: Pentest Findings Remediation (2026-05-24)

## Goal
修復黑箱滲透測試發現的 6 個安全問題，優先處理可導致資料刪除的 consent withdraw 驗證缺失。

## Behavioral Units
1. **Consent Withdraw Confirmation Validation** (Medium-High)
2. **Web Field URL Scheme Validation** (Low-Medium)
3. **MCP redirect_uri Allowlist** (Medium)
4. **Staging URL Leakage Cleanup** (Medium)
5. **OAuth Init Rate Limiting** (Low)
6. **NFC Tap Rate Limiting** (Low)

## Scenarios

### Scenario 1.1: Consent withdraw requires exact confirmation text
```gherkin
Given a user is authenticated
When POST /api/consent/withdraw with body {"confirmation": "wrong text"}
Then response is 400 with error code "invalid_confirmation"
And consent status remains unchanged
```

### Scenario 1.2: Consent withdraw succeeds with correct confirmation
```gherkin
Given a user is authenticated with active consent
When POST /api/consent/withdraw with body {"confirmation": "確認撤回"}
Then response is 200
And consent_status is set to "withdrawn"
And deletion_scheduled_at is set to now + 30 days
```

### Scenario 1.3: Consent withdraw rejects empty/missing confirmation
```gherkin
Given a user is authenticated
When POST /api/consent/withdraw with body {}
Then response is 400 with error code "invalid_confirmation"
```

### Scenario 2.1: Web field rejects javascript: URL
```gherkin
Given a user is authenticated with a card
When PUT /api/user/cards/{uuid} with body {"web": "javascript:alert(1)"}
Then response is 400 with error mentioning "web" field
```

### Scenario 2.2: Web field accepts valid https URL
```gherkin
Given a user is authenticated with a card
When PUT /api/user/cards/{uuid} with body {"web": "https://example.com"}
Then response is 200
And card web field is updated
```

### Scenario 3.1: MCP register rejects non-localhost redirect_uri
```gherkin
Given an unauthenticated client
When POST /mcp/register with redirect_uris ["https://evil.com/callback"]
Then response is 400 with error "invalid_redirect_uri"
```

### Scenario 3.2: MCP register accepts localhost redirect_uri
```gherkin
Given an unauthenticated client
When POST /mcp/register with redirect_uris ["http://localhost:3000/callback"]
Then response is 201 with client_id assigned
```

### Scenario 3.3: MCP register accepts 127.0.0.1 redirect_uri
```gherkin
Given an unauthenticated client
When POST /mcp/register with redirect_uris ["http://127.0.0.1:8080/callback"]
Then response is 201 with client_id assigned
```

### Scenario 4: Staging URL removed from production
```gherkin
Given the production card-display page
When rendered
Then no dns-prefetch or link to staging worker URL exists
And MCP OAuth redirect_uri uses production domain
```

### Scenario 5: /api/oauth/init rate limited
```gherkin
Given an IP address
When 20 requests to /api/oauth/init within 60 seconds
Then requests beyond limit return 429
```

### Scenario 6: /api/nfc/tap rate limited
```gherkin
Given an IP address
When 30 requests to /api/nfc/tap within 60 seconds
Then requests beyond limit return 429
```

## Implementation Notes
- Finding #1: Add body parsing + confirmation === '確認撤回' check in handleConsentWithdraw
- Finding #4: Add "web" to urlFields array in validateUserCardData
- Finding #2: Restrict isValidRedirectUri to localhost/127.0.0.1 only
- Finding #3: Remove staging dns-prefetch; fix MCP OAuth redirect_uri env config
- Finding #5/#6: Add Durable Objects rate limiting to oauth init and nfc tap handlers
