# Security Awareness Program
**Version**: 1.0.0  
**Last Updated**: 2026-02-02

## Awareness Objectives
All Program Participants must be aware of:
1. Open source security assurance policy location
2. Their role and responsibilities
3. Expected contributions to program effectiveness
4. Consequences of non-compliance

## Communication Methods

### Policy Awareness
- **Location**: `docs/security/open-source-security-policy.md`
- **Communication**: Link in README.md, mentioned in CONTRIBUTING.md
- **Verification**: Onboarding checklist confirmation

### Role Awareness
- **Location**: `docs/security/security-roles.md`
- **Communication**: Role assignment notification
- **Verification**: Quarterly role review acknowledgment

### Contribution Expectations
All participants are expected to:
- Run `npm audit` before committing code
- Review security scan results in CI/CD
- Report suspected vulnerabilities via SECURITY.md
- Participate in vulnerability remediation

### Non-Compliance Consequences
- **Minor**: Pull request blocked until scans pass
- **Moderate**: Required security training
- **Severe**: Removal of commit access

## Training Checklist

### New Contributor Onboarding
- [ ] Read security policy (`docs/security/open-source-security-policy.md`)
- [ ] Review assigned role (`docs/security/security-roles.md`)
- [ ] Understand vulnerability reporting process (SECURITY.md)
- [ ] Complete first security scan (`npm audit`)
- [ ] Acknowledge understanding (sign below)

**Participant Name**: _______________  
**Date**: _______________  
**Signature**: _______________

## Training Records

| Participant | Role | Training Date | Acknowledged | Next Review |
|-------------|------|---------------|--------------|-------------|
| Project Maintainer | Security Lead | 2026-02-02 | ✅ | 2027-02-02 |

## Awareness Verification
- **Method**: Quarterly survey + onboarding checklist
- **Frequency**: Every 3 months
- **Next Verification**: 2026-05-02

## Updates
Policy and role changes are communicated via:
- GitHub repository notifications
- Pull request comments
- Direct email for critical updates

---
**Program Owner**: Security Lead  
**Next Review**: 2026-05-02
