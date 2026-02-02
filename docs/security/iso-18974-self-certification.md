# ISO/IEC 18974 Self-Certification Checklist
**Project**: DB-Card NFC Digital Business Card System  
**Version**: v4.6.0  
**Date**: 2026-02-02  
**Completed By**: Project Lead

---

## Section 4.1.1 - Policy ✅

- [x] We have a documented policy governing the open source security assurance of Supplied Software.
  - **Evidence**: `docs/security/open-source-security-policy.md`

- [x] We have a documented procedure to communicate the existence of the open source policy to all Program Participants.
  - **Evidence**: Policy linked in README.md, SECURITY.md, onboarding checklist in `docs/security/awareness-program.md`

---

## Section 4.1.2 - Roles & Responsibilities ✅

- [x] We have identified the roles and responsibilities that affect the performance and effectiveness of the Program.
  - **Evidence**: `docs/security/security-roles.md` (Security Lead, Developer, Reviewer)

- [x] We have identified and documented the competencies required for each role.
  - **Evidence**: `docs/security/security-roles.md` (competencies section)

- [x] We have identified and documented a list of Program Participants and how they fill their respective roles.
  - **Evidence**: `docs/security/security-roles.md` (participant table)

- [x] We have documented the assessed competence for each Program Participant.
  - **Evidence**: `docs/security/security-roles.md` (competence assessment method)

- [x] We have a way to document periodic reviews and changes made to our processes.
  - **Evidence**: `docs/security/security-roles.md` (quarterly review process)

- [x] We have a way to verify that our processes align with current company best practices and staff assignments.
  - **Evidence**: Quarterly review checklist in all policy documents

---

## Section 4.1.3 - Awareness ✅

- [x] Our Program Participants are aware of the open source security assurance policy and where to find it.
  - **Evidence**: `docs/security/awareness-program.md` (onboarding checklist)

- [x] Our Program Participants are aware of relevant open source objectives.
  - **Evidence**: `docs/security/awareness-program.md` (contribution expectations)

- [x] Our Program Participants are aware of contributions expected to ensure the effectiveness of the Program.
  - **Evidence**: `docs/security/awareness-program.md` (expectations section)

- [x] Our Program Participants are aware of the implications of failing to follow the Program requirements.
  - **Evidence**: `docs/security/awareness-program.md` (consequences section)

---

## Section 4.1.4 - Program Scope ✅

- [x] We have a written statement clearly defining the scope and limits of the Program.
  - **Evidence**: `docs/security/program-scope.md` (scope statement)

- [x] We have a set of metrics to measure Program performance.
  - **Evidence**: `docs/security/program-scope.md` (performance metrics table)

- [x] We have Documented Evidence from each review, update, or audit to demonstrate continuous improvement.
  - **Evidence**: `docs/security/program-scope.md` (review evidence table), `docs/security/scan-reports/`

---

## Section 4.1.5 - Vulnerability Detection ✅

- [x] We have a method to identify structural and technical threats to the Supplied Software.
  - **Evidence**: OSV-Scanner, npm audit, OWASP ZAP (documented in scan reports)

- [x] We have a method for detecting existence of Known Vulnerabilities in Supplied Software.
  - **Evidence**: OSV-Scanner + npm audit in CI/CD pipeline

- [x] We have a method for following up on identified Known Vulnerabilities.
  - **Evidence**: `docs/security/vulnerability-communication.md` (procedure section)

- [x] We have a method to communicate identified Known Vulnerabilities to customer base when warranted.
  - **Evidence**: `docs/security/vulnerability-communication.md` (customer notification template)

- [x] We have a method for analyzing Supplied Software for newly published Known Vulnerabilities post release of the Supplied Software.
  - **Evidence**: `docs/security/vulnerability-communication.md` (post-release monitoring section)

- [x] We have a method for continuous and repeated Security Testing is applied for all Supplied Software before release.
  - **Evidence**: CI/CD pipeline with OSV-Scanner + npm audit on every commit

- [x] We have a method to verify that identified risks will have been addressed before release of Supplied Software.
  - **Evidence**: CI/CD blocks merges with high/critical vulnerabilities

- [x] We have a method to export information about identified risks to third parties as appropriate.
  - **Evidence**: `docs/security/vulnerability-communication.md` (third-party export format)

---

## Section 4.2.1 - Third-Party Reporting ✅

- [x] We have a method to allow third parties to make Known Vulnerability or Newly Discovered Vulnerability enquires (e.g., via an email address or web portal that is monitored by Program Participants).
  - **Evidence**: SECURITY.md (GitHub Security Advisories), GitHub Issues

- [x] We have an internal documented procedure for responding to third party Known Vulnerability or Newly Discovered Vulnerability inquiries.
  - **Evidence**: `docs/security/third-party-reporting.md` (full response procedure)

---

## Section 4.2.2 - Resource Allocation ✅

- [x] We have documented the people, group or functions related to the Program.
  - **Evidence**: `docs/security/resource-allocation.md` (security team structure)

- [x] We have ensured the identified Program roles have been properly staffed and adequate funding has been provided.
  - **Evidence**: `docs/security/resource-allocation.md` (staffing and funding sections)

- [x] We have ensured expertise available is to address identified Known Vulnerabilities.
  - **Evidence**: `docs/security/resource-allocation.md` (expertise availability section)

- [x] We have a documented procedure that assigns internal responsibilities for Security Assurance.
  - **Evidence**: `docs/security/resource-allocation.md` (internal responsibility assignment)

---

## Section 4.3.1 - Software Inventory ✅

- [x] We have a documented procedure ensuring all Open Source Software used in the Supplied Software is continuously recorded across the lifecycle of the Supplied Software.
  - **Evidence**: `workers/package-lock.json` (npm lockfile), tracked in version control

---

## Certification Statement

I certify that DB-Card v4.6.0 meets all requirements of ISO/IEC 18974:2023 (OpenChain Security Assurance Specification).

All questions above have been answered "YES" with documented evidence.

**Name**: _______________  
**Title**: Project Lead  
**Organization**: DB-Card Project  
**Date**: 2026-02-02  
**Signature**: _______________

---

## Evidence Index

| Document | Purpose | Location |
|----------|---------|----------|
| Security Policy | 4.1.1 | `docs/security/open-source-security-policy.md` |
| Roles & Responsibilities | 4.1.2 | `docs/security/security-roles.md` |
| Awareness Program | 4.1.3 | `docs/security/awareness-program.md` |
| Program Scope | 4.1.4 | `docs/security/program-scope.md` |
| Vulnerability Communication | 4.1.5 | `docs/security/vulnerability-communication.md` |
| Third-Party Reporting | 4.2.1 | `docs/security/third-party-reporting.md` |
| Resource Allocation | 4.2.2 | `docs/security/resource-allocation.md` |
| Software Inventory | 4.3.1 | `workers/package-lock.json` |
| Vulnerability Reporting | Public | `SECURITY.md` |
| Scan Reports | Evidence | `docs/security/scan-reports/` |

---

## Next Steps

1. Submit self-certification at: https://www.openchainproject.org/checklist-iso-18974-2023
2. Maintain quarterly reviews (next: 2026-05-02)
3. Keep documentation updated with process changes
4. Continue automated vulnerability scanning

---

**Compliance Status**: ✅ **100% COMPLIANT**  
**Certification Date**: 2026-02-02  
**Next Review**: 2026-05-02
