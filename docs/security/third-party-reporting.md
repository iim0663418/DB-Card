# Third-Party Vulnerability Reporting Procedure
**Version**: 1.0.0  
**Last Updated**: 2026-02-02

## Reporting Channels

### Primary Contact
**GitHub Security Advisories**: https://github.com/iim0663418/DB-Card/security/advisories/new

### Alternative Channels
- GitHub Issues (for non-sensitive reports): https://github.com/iim0663418/DB-Card/issues

### Response Commitment
- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Status Updates**: Every 7 days until resolved

## Reporting Guidelines

### What to Report
- Known vulnerabilities (CVEs) in dependencies
- Newly discovered vulnerabilities in DB-Card code
- Security misconfigurations
- Authentication/authorization bypasses
- Data exposure issues

### Information to Include
1. **Description**: Clear explanation of the vulnerability
2. **Reproduction Steps**: How to trigger the issue
3. **Impact**: Potential consequences
4. **Affected Versions**: Which releases are vulnerable
5. **Suggested Fix**: If available (optional)
6. **Contact Info**: For follow-up questions

### Report Template
```
Subject: [SECURITY] {Brief Description}

Vulnerability Type: {e.g., CVE, XSS, SQL Injection}
Severity: {Critical/High/Medium/Low}

Description:
{Detailed explanation}

Steps to Reproduce:
1. {Step 1}
2. {Step 2}
3. {Step 3}

Expected Behavior:
{What should happen}

Actual Behavior:
{What actually happens}

Impact:
{Potential consequences}

Affected Versions:
{Version range}

Suggested Fix:
{If available}

Reporter Contact:
{Email/GitHub handle}
```

## Internal Response Procedure

### Step 1: Acknowledgment (Within 48h)
```
Thank you for reporting this security issue to DB-Card.

We have received your report and assigned it tracking ID: SEC-YYYY-XXXX

Timeline:
- Initial assessment: Within 7 days
- Status updates: Every 7 days
- Target resolution: Within 30 days (for high/critical)

We will keep you informed of our progress.

Best regards,
DB-Card Security Team
```

### Step 2: Triage (Within 7 days)
- **Responsible**: Security Lead
- **Actions**:
  - Verify vulnerability
  - Assign severity (CVSS)
  - Determine affected versions
  - Assess remediation effort

### Step 3: Response (Within 7 days of triage)
```
Update on SEC-YYYY-XXXX:

Status: {Confirmed/Cannot Reproduce/Duplicate/Won't Fix}
Severity: {Critical/High/Medium/Low}
Affected Versions: {version range}
Target Fix Date: {date}

Next Steps:
{What we're doing}

Thank you for your patience.

DB-Card Security Team
```

### Step 4: Resolution
- Develop fix in private branch
- Test thoroughly
- Coordinate disclosure with reporter
- Release patched version
- Publish security advisory

### Step 5: Disclosure
```
Final update on SEC-YYYY-XXXX:

This vulnerability has been fixed in version {X.Y.Z}.

CVE: {CVE-ID if assigned}
Fix PR: {GitHub PR link}
Security Advisory: {GitHub Advisory link}

Thank you for your responsible disclosure.

DB-Card Security Team
```

## Inquiry Types

### Known Vulnerability Inquiry
Reporter asks if DB-Card is affected by a published CVE.

**Response Process**:
1. Check dependency tree: `npm ls {package}`
2. Verify version range
3. Run OSV-Scanner: `osv-scanner --lockfile=workers/package-lock.json`
4. Respond within 48 hours with findings

**Response Template**:
```
Thank you for your inquiry about {CVE-ID}.

Status: {Affected/Not Affected/Under Investigation}

Details:
{Explanation of findings}

Action Taken:
{If affected: fix timeline; If not: why not affected}

DB-Card Security Team
```

### Newly Discovered Vulnerability
Reporter found a new issue not yet published.

**Response Process**:
1. Follow full response procedure above
2. Request coordinated disclosure timeline
3. Work with reporter on fix
4. Credit reporter in advisory (if desired)

## Responsible Disclosure

### Our Commitment
- Acknowledge all reports within 48 hours
- Provide regular updates every 7 days
- Fix high/critical issues within 30 days
- Credit reporters (unless they prefer anonymity)
- No legal action against good-faith researchers

### Reporter Expectations
- Allow reasonable time for fix (30 days for high/critical)
- Do not publicly disclose before fix is released
- Do not exploit vulnerability beyond proof-of-concept
- Respect user privacy and data

### Coordinated Disclosure Timeline
1. **Day 0**: Vulnerability reported
2. **Day 2**: Acknowledgment sent
3. **Day 7**: Initial assessment complete
4. **Day 30**: Fix developed and tested
5. **Day 37**: Coordinated public disclosure (7 days after fix release)

## Contact Information

**GitHub Security Advisories**: https://github.com/iim0663418/DB-Card/security/advisories/new  
**GitHub Issues** (non-sensitive): https://github.com/iim0663418/DB-Card/issues

---
**Maintained By**: Security Lead  
**Next Review**: 2026-05-02
