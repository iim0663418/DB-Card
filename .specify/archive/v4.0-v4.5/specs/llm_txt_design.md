# BDD Spec: Design llm.txt for DB-Card Project

## Scenario: Create LLM-Friendly Project Documentation

### Given
- DB-Card is a complex NFC digital business card system
- Multiple LLM tools need to understand project structure
- Current documentation scattered across README, ADRs, specs

### When
- Create `llm.txt` at project root
- Follow LLM.txt standard format (https://llmstxt.org/)

### Then

#### File Structure
```
# DB-Card Project

> Enterprise-grade NFC digital business card system with envelope encryption

## Overview
[Brief description of what DB-Card is]

## Architecture
[High-level architecture overview]

## Key Technologies
[Tech stack list]

## Project Structure
[Directory layout with descriptions]

## Getting Started
[Quick start commands]

## API Endpoints
[Core API list with brief descriptions]

## Security Model
[Envelope encryption, sessions, KEK rotation]

## Development Workflow
[How to contribute, test, deploy]

## Important Files
[Key files developers should know about]

## Common Tasks
[Frequent operations with commands]

## Links
[Documentation, GitHub, etc.]
```

#### Content Requirements

1. **Overview Section**
   - Product positioning: Enterprise NFC digital business card
   - Core value: Privacy-first, envelope encryption, session-based authorization
   - Target users: Organizations needing secure identity exchange

2. **Architecture Section**
   - Cloudflare Workers (serverless edge computing)
   - D1 Database (SQLite-compatible)
   - KV Cache (performance optimization)
   - Frontend: Vanilla JS + Tailwind CSS + Three.js

3. **Key Technologies**
   - TypeScript
   - Cloudflare Workers
   - D1 Database
   - Web Crypto API
   - NFC (NDEF)
   - vCard 3.0

4. **Project Structure**
   ```
   workers/
   ├── src/           # Backend API handlers
   ├── public/        # Frontend assets
   ├── migrations/    # Database schemas
   └── wrangler.toml  # Cloudflare config
   
   docs/              # Technical documentation
   .specify/          # BDD specs and memory
   ```

5. **API Endpoints**
   - POST /api/nfc/tap - Create session from NFC tap
   - GET /api/read - Read card data with session
   - POST /api/admin/login - Admin authentication
   - GET /api/admin/cards - List all cards
   - POST /api/admin/cards - Create card
   - PUT /api/admin/cards/:uuid - Update card
   - DELETE /api/admin/cards/:uuid - Revoke card
   - POST /api/admin/cards/:uuid/restore - Restore card
   - GET /api/health - System health check

6. **Security Model**
   - Envelope Encryption: Each card has unique DEK, wrapped by KEK
   - ReadSession: 24h TTL, max reads limit, revocable
   - Audit Logging: IP anonymization, complete access trail
   - KEK Rotation: Event-triggered or 90-day cycle

7. **Development Workflow**
   ```bash
   # Local development
   cd workers && npm run dev
   
   # Run tests
   npm test
   
   # Deploy to staging
   npm run deploy:staging
   
   # Deploy to production
   npm run deploy:production
   ```

8. **Important Files**
   - `workers/src/index.ts` - Main router
   - `workers/src/handlers/tap.ts` - NFC tap handler
   - `workers/src/handlers/read.ts` - Card read handler
   - `workers/src/crypto/envelope.ts` - Encryption logic
   - `workers/public/admin-dashboard.html` - Admin UI
   - `workers/public/user-portal.html` - User UI
   - `workers/public/card-display.html` - Card view

9. **Common Tasks**
   - Create new card: Admin Dashboard → 新增名片
   - Revoke card: Admin Dashboard → 撤銷
   - Check system health: GET /api/health
   - Rotate KEK: POST /api/admin/kek/rotate
   - View audit logs: Admin Dashboard → 安全監控

10. **Links**
    - GitHub: https://github.com/iim0663418/DB-Card
    - Documentation: docs/
    - ADRs: docs/adr/
    - BDD Specs: .specify/specs/

#### Acceptance Criteria
- [ ] File created at project root: `llm.txt`
- [ ] Follows LLM.txt standard format
- [ ] Covers all major aspects of the project
- [ ] Concise but comprehensive (< 500 lines)
- [ ] Uses markdown formatting
- [ ] Includes practical examples
- [ ] Links to detailed documentation
- [ ] Easy for LLMs to parse and understand
