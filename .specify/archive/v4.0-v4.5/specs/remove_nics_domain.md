# BDD Spec: Remove nics.nat.gov.tw from Email Allowlist

## Scenario: Clean up unauthorized domain from email allowlist

### Given
- email_allowlist table contains 'nics.nat.gov.tw'
- email_allowlist table contains 'moda.gov.tw'

### When
- Execute SQL DELETE command on Staging database
- Execute SQL DELETE command on Production database (if exists)

### Then
- email_allowlist should only contain 'moda.gov.tw'
- nics.nat.gov.tw should be completely removed
- No migration file should reference nics.nat.gov.tw

## Technical Requirements
- Target: D1 Database (Staging & Production)
- Command: DELETE FROM email_allowlist WHERE domain = 'nics.nat.gov.tw'
- Verification: SELECT * FROM email_allowlist should return only moda.gov.tw
