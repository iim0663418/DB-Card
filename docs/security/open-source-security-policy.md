# Open Source Security Assurance Policy
**Version**: 1.0.0  
**Effective Date**: 2026-02-02  
**Owner**: DB-Card Security Team

## 1. Purpose
Ensure all open source software in DB-Card is free from known security vulnerabilities before release.

## 2. Scope
All npm dependencies in `workers/package-lock.json` used in production deployments.

## 3. Policy
- All open source components MUST pass OSV-Scanner and npm audit with zero high/critical vulnerabilities before deployment.
- Known vulnerabilities MUST be remediated within 30 days of discovery.
- Security scans MUST run on every commit via CI/CD.

## 4. Responsibilities
- **Security Lead**: Oversees vulnerability management
- **Developers**: Fix identified vulnerabilities
- **Reviewers**: Validate fixes before merge

## 5. Communication
This policy is communicated via:
- Repository README.md
- Onboarding checklist for new contributors
- SECURITY.md in repository root

## 6. Enforcement
Pull requests with high/critical vulnerabilities will be blocked from merging.

## 7. Review
This policy is reviewed quarterly and updated as needed.

---
**Approved By**: DB-Card Project Lead  
**Next Review**: 2026-05-02
