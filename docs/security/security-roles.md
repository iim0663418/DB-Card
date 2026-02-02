# Security Assurance Roles & Responsibilities
**Version**: 1.0.0  
**Last Updated**: 2026-02-02

## Program Participants

| Role | Name | Competencies | Status |
|------|------|--------------|--------|
| Security Lead | Project Maintainer | CVE analysis, vulnerability triage, security tooling | Active |
| Developer | Contributors | Dependency updates, patch application, testing | Active |
| Reviewer | Code Reviewers | Security review, fix validation | Active |

## Role Definitions

### Security Lead
**Responsibilities**:
- Monitor security scan results
- Triage vulnerability reports
- Coordinate remediation efforts
- Maintain security documentation

**Required Competencies**:
- Understanding of CVE/CWE systems
- Experience with OSV-Scanner and npm audit
- Knowledge of dependency management

**Competence Assessment**: Annual review of security incidents handled

### Developer
**Responsibilities**:
- Implement vulnerability fixes
- Update dependencies
- Run local security scans before commit

**Required Competencies**:
- npm package management
- Git workflow
- Basic security awareness

**Competence Assessment**: Code review quality, fix turnaround time

### Reviewer
**Responsibilities**:
- Validate security fixes
- Approve pull requests
- Verify scan results

**Required Competencies**:
- Code review skills
- Security testing knowledge
- CI/CD pipeline understanding

**Competence Assessment**: Review accuracy, false positive rate

## Review Process
- **Frequency**: Quarterly
- **Next Review**: 2026-05-02
- **Review Includes**: Role assignments, competency updates, process improvements

## Change Log
| Date | Change | Approved By |
|------|--------|-------------|
| 2026-02-02 | Initial version | Project Lead |
