# DB-Card Project Progress
## Current Phase: OIDC_MIGRATION_PLANNING_COMPLETE ✅
- Status: OIDC 遷移計畫已完成
- Last Update: 2026-01-24T15:30:00+08:00

## OIDC Migration Plan

### Current Status: 60% OIDC Compliant
- ✅ Scope: openid email profile
- ✅ Authorization Code Flow
- ✅ State Parameter (CSRF)
- ✅ Google OIDC Certified Provider

### Missing Components (40%)
- ❌ ID Token Validation (P0)
- ❌ JWKS Public Key Verification (P0)
- ❌ Nonce (P1)
- ❌ Discovery Endpoint (P1)
- ❌ Sub as Primary Key (P2)

## Phase 1: Core OIDC (P0) - 3 Days

### Day 1: JWKS Manager
- [ ] Implement jwks-manager.ts
- [ ] KV cache (TTL 3600s)
- [ ] Auto-refresh mechanism
- [ ] Fallback handling
- [ ] Unit tests

### Day 2: ID Token Validation
- [ ] Implement oidc-validator.ts
- [ ] Validate iss/aud/exp/iat/sub
- [ ] JWKS signature verification
- [ ] Clock skew tolerance (±60s)
- [ ] Unit tests

### Day 3: Integration & Testing
- [ ] Modify oauth.ts to use ID Token
- [ ] Backward compatibility (fallback to UserInfo API)
- [ ] Integration tests
- [ ] Security tests
- [ ] Bug fixes

### Deliverables
- workers/src/utils/jwks-manager.ts
- workers/src/utils/oidc-validator.ts
- Modified workers/src/handlers/oauth.ts
- 11 BDD scenarios passed
- Documentation

## Phase 2: Security Enhancement (P1) - 2 Days

### Day 4: Nonce Implementation
- [ ] Frontend nonce generation
- [ ] Backend nonce validation (KV, TTL 600s)
- [ ] One-time use
- [ ] Integration tests

### Day 5: Discovery Endpoint
- [ ] Implement oidc-discovery.ts
- [ ] Cache discovery config (KV, TTL 86400s)
- [ ] Dynamic endpoint retrieval
- [ ] Remove hardcoded endpoints

## Phase 3: Optimization (P2) - 1 Day

### Day 6: Sub as Primary Key
- [ ] Database schema update
- [ ] Migration script
- [ ] Use sub for user identification
- [ ] Backward compatibility

### Day 7: Optimization & Documentation
- [ ] JWKS cache optimization
- [ ] Clock skew tuning
- [ ] Token revoke flow
- [ ] Complete documentation

## Migration Cost
- **Total**: 5-7 days
- **Risk**: 🟢 Low (backward compatible)
- **Benefit**: 🟢 High (security + standards compliance)

## Next Actions
- [ ] Prepare development environment
- [ ] Start Phase 1 Day 1: JWKS Manager implementation

## References
- .specify/specs/oidc-phase1-id-token-validation.md
- .specify/specs/oidc-migration-plan.md
- docs/security/OIDC-MIGRATION-ASSESSMENT-2026-01-24.md
