#!/bin/bash
# Phase 2 Implementation Driver - Uses Claude Code CLI

set -e  # Exit on error

PROJECT_ROOT="/Users/shengfanwu/GitHub/DB-Card"
WORKERS_DIR="$PROJECT_ROOT/workers"

echo "=== Phase 2: Four-Layer Agent Architecture ==="
echo "Start time: $(date)"
echo ""

echo "Step 1: Invoking Claude Code for implementation..."
echo ""

# Invoke Claude Code with implementation instructions
cd "$PROJECT_ROOT"

claude -p "You are implementing Phase 2 of Agent Search Migration.

Working directory: $PROJECT_ROOT
Workers directory: $WORKERS_DIR

Read the BDD spec at .specify/specs/four-layer-agent.md
Read the implementation instructions at .specify/CLAUDE_CODE_INSTRUCTIONS.md

Implement all steps in workers/src/agents/search/:
1. Expand types.ts with SenseContext, SearchPlan, ExecutionResult interfaces
2. Create sense.ts (Sense layer)
3. Create planner.ts (Think layer)
4. Create retrievers/ directory with semantic.ts, keyword.ts, hybrid.ts
5. Create rankers/rrf.ts
6. Create enrichers/contact-metadata.ts
7. Create executor.ts (Act orchestrator)
8. Create memory.ts (Remember layer)
9. Update agent.ts to orchestrate four layers
10. Create migration workers/migrations/0044_query_events.sql

Requirements:
- Extract existing code from agent.ts, don't rewrite
- Preserve ALL existing logic (Phase 0 + Phase 1)
- No functional changes
- TypeScript must compile

Start implementation now." --allow-dangerously-skip-permissions

echo ""
echo "Step 2: Verifying TypeScript compilation..."
cd "$WORKERS_DIR"
npm run typecheck

echo ""
echo "Step 3: Checking file structure..."
echo "Created files:"
find src/agents/search -type f -name "*.ts" 2>/dev/null | sort

echo ""
echo "Step 4: Line counts..."
wc -l src/agents/search/*.ts src/agents/search/*/*.ts 2>/dev/null | tail -1

echo ""
echo "=== Phase 2 Implementation Complete ==="
echo "End time: $(date)"
