# v5.0.1 Release Complete

## Status: ✅ Deployed to Staging

### Version Info
- Version: v5.0.1
- Bundle: 1059.35 KiB / gzip: 198.67 KiB
- Startup: 15ms
- Health: ✅ OK

### Release Highlights

#### 1. Tag Normalization System
- Schema: category, raw_value, normalized_value
- Service: unified write layer (tag-service.ts)
- AI: language-neutral extraction
- Frontend: filter by normalized, display raw
- Migrations: 0039 (schema), 0040 (re-tag 85 cards)

#### 2. Batch API Stabilization
- Migration 0041: cleanup stale jobs (>48h)
- Unified cron path: simple auto-tag (20 cards/batch)
- Deprecated: auto-tag-cards-batch.ts (2-week review)

#### 3. Cron Subrequest Optimization
- Priority tasks: 4 blocking
- Background tasks: 8 non-blocking (ctx.waitUntil)
- Fix: "Too many API requests" error

#### 4. Critical Fixes
- Sorting: COALESCE(updated_at, created_at) - 87% cards fixed
- Location: traditional Chinese support (臺→台)
- Tag display: object format support
- Search abort: distinguish timeout vs cancellation

#### 5. Documentation
- Tag system architecture overview
- Internationalization analysis (TW-centric)
- Batch API decision record

### Commits (10)
- b1e41e7 chore: release v5.0.1
- f306781 fix: card sorting - use COALESCE for updated_at
- 62a2b45 fix: search abort error handling
- c7fd789 fix: tag display - support object format
- 76e0603 docs: tag system internationalization analysis
- 9b5e2de fix: location normalization - support traditional Chinese
- 20dbb2a fix: batch API stabilization - unified cron path
- 97656b0 feat: tag normalization system
- dd7099a feat: 403 Error Handling Architecture
- 8141086 feat: Batch API Migration

### Next Steps
- Monitor tag normalization accuracy
- Evaluate Batch API after 2 weeks (2026-03-21)
- Consider user sorting preferences (if requested)
