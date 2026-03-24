# Quality Oracle Learnings

**Run:** run-20260324-232923
**Date:** 2026-03-24
**Project:** Workflow Management System

## Spec Coverage Trend

- **First audit:** 100% traceability at the test level (all 15 FRs have test coverage with `// Verifies:` comments)
- Source files also carry `Verifies:` JSDoc comments on route handlers and service methods

## Common Pattern Violations Found

1. **Dual type definitions** — Backend (`Source/Backend/src/models/types.ts`) and Frontend (`Source/Frontend/src/types/index.ts`) define the same domain types independently. This is the top recurring architectural violation. No `Source/Shared/` directory exists.

2. **Type field mismatches between backend and frontend:**
   - `WorkItem.description`: backend `string | null`, frontend `string` (non-nullable) — runtime null will crash frontend rendering
   - `WorkItem.queue`: backend `string | null`, frontend `string` — same issue
   - `ChangeEntry.new_value`: backend `string`, frontend `string | null` — backend tighter, frontend looser
   - `Review.reviewed_at` (backend) vs `Review.created_at` (frontend) — field name mismatch, API data will be missing in frontend

3. **Pagination not implemented** — FR-WF-012 acceptance criteria specifies "pagination" but BacklogView has no pagination controls or server-side page/limit parameters.

4. **OpenTelemetry not integrated** — CLAUDE.md requires OpenTelemetry for distributed tracing (trace/span IDs auto-injected), W3C `traceparent` header propagation. Neither backend nor frontend has any OTel instrumentation.

5. **Throughput definition** — FR-WF-008 says `{data: {statusCounts, totalItems, throughput}}`. The implementation returns total `done` count as throughput, which is a reasonable proxy but is a cumulative total, not a rate (cycle time or items/period). Spec says "throughput" without precise definition.

6. **Stub component present but unused** — `Source/Frontend/src/pages/Backlog.tsx` is an 8-line stub ("coming soon"), never routed. App.tsx correctly routes `/backlog` to `BacklogView.tsx`. The stub is dead code.

## Useful File Paths for Future Audits

- Spec: `/workspace/Specifications/workflow-management.md`
- FR requirements: `/workspace/Plans/workflow-management/requirements.md`
- Backend types (source of truth): `/workspace/Source/Backend/src/models/types.ts`
- Frontend types (diverged copy): `/workspace/Source/Frontend/src/types/index.ts`
- State machine: `/workspace/Source/Backend/src/services/stateMachine.ts`
- Backend tests: `/workspace/Source/Backend/tests/` (4 test files)
- Frontend tests: `/workspace/Source/Frontend/src/__tests__/` and `/workspace/Source/Frontend/src/pages/__tests__/` (5 test files)

## Grading Baseline

This first audit: **Grade C** (2 P1 findings, 4 P2 findings, 100% spec coverage)
- Grading config: A requires max_p1=0, max_p2=3, min_spec_coverage=80
- P1 issues (type mismatch + missing OTel) push to C per config: max_p1=2 -> grade C
