# Design QA Report: Pipeline Optimisations + Workflow Engine (Cycle run-1774572910837)

**Reviewer:** design-critic (TheFixer)
**Date:** 2026-03-27
**RISK_LEVEL: medium**

Rationale: Changes span 5 team definition files (Teams/) affecting orchestration behavior, plus ~25 Source/ files with workflow engine implementation. No schema migrations, no auth/security changes. Pipeline optimisation changes are to markdown configuration files only.

---

## Executive Summary

### Pipeline Optimisations (Teams/ changes)

All 6 planned changes from `Plans/pipeline-optimisations/plan.md` are correctly implemented:

| Change | Status | Verdict |
|--------|--------|---------|
| 1. Downgrade traceability-reporter + verify-reporter to haiku | DONE | PASS |
| 2. Make Inspector conditional for TheFixer | DONE | PASS |
| 3. Add early commit (Stage 3.9 / 2.9) | DONE | PASS |
| 4. Scope feedback loops to failed layer | DONE | PASS |
| 5. Remove dead LearningsSync class | N/A (already resolved) | PASS |
| 6. Skip Playwright chromium install if present | DONE | PASS |

### Workflow Engine (Source/ changes)

Implementation is architecturally sound with 13/13 FRs implemented. Traceability enforcer **PASSED**. Frontend tests pass (89/89). Backend tests fail (9/9 suites) due to **pre-existing** `@shared` module resolution issue (same failures on master).

---

## Pipeline Optimisation Review

### Change 1: Model Downgrades — PASS

- `Teams/TheATeam/README.md:19`: traceability-reporter changed from `sonnet` to `**haiku**`
- `Teams/TheFixer/README.md:14`: verify-reporter changed from `sonnet` to `**haiku**`
- Pipeline diagrams in both READMEs updated consistently
- Plan noted "team routing" has no agent role file — correctly skipped. No action needed.

### Change 2: Conditional Inspector — PASS

- `Teams/TheFixer/team-leader.md:165-176`: New section 5.5 with decision table:
  - Skip when `confidence == high` AND `scope_tag IN [backend-only, frontend-only]`
  - Run when `confidence == low` OR `scope_tag == fullstack` OR QA rejected after feedback exhausted
  - Includes logging requirement for skip decisions
- `Teams/TheATeam/team-leader.md:211`: Documents "Always run TheInspector for TheATeam cycles"
- Logic is sound and matches the plan exactly.

**MEDIUM finding (M-OPT-2):** No explicit fallback when `planner.confidence` or `scope_tag` is missing/undefined (e.g., planner crash or format change). Should default to running Inspector (fail-safe). Currently, if fields are absent, the behavior is ambiguous — team leader interpretation may vary.

### Change 3: Early Commit Checkpoint — PASS

- `Teams/TheATeam/team-leader.md`: Stage 3.9 added to DAG (line 74) and workflow section 4.5 (lines 149-159)
- `Teams/TheFixer/team-leader.md`: Stage 2.9 added to DAG (line 77) and workflow section 3.5 (lines 130-140)
- Commit message format: `wip: ${TASK_TITLE} [pipeline-checkpoint]`
- Uses `git add -A Source/` (scoped to Source/, not repo-wide)

**MEDIUM finding (M-OPT-1):** `git add -A Source/` stages all changes under `Source/` including deletions and files from prior failed runs. In CI (clean workspace) this is low-risk. In local dev, pre-existing unstaged changes could be swept into the checkpoint. Consider documenting the "clean workspace" assumption or scoping to the plan's file list.

### Change 4: Scoped Feedback Loops — PASS

- `Teams/TheATeam/team-leader.md:181-187`: Expanded from one-liner to explicit 4-step parsing rules
- `Teams/TheFixer/team-leader.md:157-163`: Mirror of same rules for fixers
- Both include "Do NOT re-run coders/fixers for layers that passed all checks"
- Clear and actionable.

### Change 5: Remove Dead LearningsSync — PASS (N/A)

Plan correctly identifies no `lib/` directory or `LearningsSync` class exists. Confirmed via grep — no matches in codebase. No changes needed.

### Change 6: Chromium Install Guard — PASS

- `Teams/Shared/design-critic.md:9-19`: New Prerequisites section with bash guard
- Uses `--dry-run` check with grep for "already installed"

**LOW finding (L-OPT-1):** The `npx playwright install --dry-run chromium 2>&1 | grep -q "already installed"` relies on Playwright's `--dry-run` output format which is not a stable API. If Playwright changes the output text, the guard will always fall through to install (safe failure mode). Acceptable for now.

---

## Source Code Review (Workflow Engine)

### Test Results

| Suite | Tests | Result | Notes |
|-------|-------|--------|-------|
| Backend (9 suites) | 0 executed | FAIL | Pre-existing `ERR_MODULE_NOT_FOUND` for `@shared/types/workflow` — same failure on master |
| Frontend (7 suites) | 89 tests | ALL PASS | |
| Traceability | 13 FRs | PASS | All FRs have implementation references |
| E2E (6 files) | Not run (no server) | Exist | Well-structured, cover all pages + workflow |

### Findings

#### CRITICAL

**CRIT-1: `loadFromFile()` never called at startup — file persistence is write-only**
- File: `Source/Backend/src/store/workItemStore.ts:37`
- `persistToFile()` runs on every mutation but `loadFromFile()` is exported without being wired into any startup path (not called in `app.ts` or server entry)
- Data written to `data/work-items.json` is silently lost on restart
- Impact: Persistence feature is a no-op

#### HIGH

**HIGH-1: Double change-history entries on workflow state transitions**
- File: `Source/Backend/src/routes/workflow.ts`
- Route handlers push `buildChangeEntry` manually, then `store.updateWorkItem` auto-tracks the same field change
- Result: Two identical entries per status transition
- Affects: `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/complete`, `/fail`, `/requeue`

**HIGH-2: `parseInt` query params not validated for NaN**
- Files: `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/dashboard.ts`
- `GET /api/work-items?page=abc` returns `{data: [], page: NaN, totalPages: NaN}`
- Silent bad data instead of 400 error

**HIGH-3: Route handlers bypass service layer**
- Files: `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer"
- Workflow and intake routes call `store.*` directly (14 direct store calls in workflow.ts alone)
- Architecture violation

**HIGH-4: Backend tests completely broken (pre-existing)**
- All 9 backend test suites fail with `ERR_MODULE_NOT_FOUND` for `@shared/types/workflow`
- This is a pre-existing issue (confirmed same on master) but means NO backend test coverage is actually running
- The `@shared` path alias is not configured for the test runner (vitest)

#### MEDIUM

**MED-1: Unbounded Prometheus label cardinality from raw `req.path`**
- File: `Source/Backend/src/app.ts:25`
- `req.route?.path || req.path` — when no route matches (404), raw URL becomes a histogram label
- Scanning/fuzzing creates unbounded label cardinality which exhausts metrics server memory

**MED-2: `AbortController.signal` never passed to fetch**
- Files: `Source/Frontend/src/hooks/useDashboard.ts`, `Source/Frontend/src/hooks/useWorkItems.ts`
- Controller is created and aborted on cleanup, but signal never reaches the actual `fetch()` call
- Requests are not actually cancelled — only state updates are suppressed

**MED-3: Dead validation functions in intake routes**
- File: `Source/Backend/src/routes/intake.ts`
- `validateOptionalType` / `validateOptionalPriority` are unreachable after inline validation

#### LOW

**LOW-1: `isFullReview()` removed without routing model documentation**
- File: `Source/Backend/src/services/router.ts`
- Binary routing model (fast-track or default) should be documented

**LOW-2: No test for HTTP histogram metric at `/metrics`**
- New `http_request_duration_seconds` histogram has no smoke test

**LOW-3: `limit=0` produces `Infinity` in `totalPages`**
- No minimum-value guard on pagination limit parameter

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | PASS | Implementation traces to `Specifications/workflow-engine.md` |
| No direct DB calls from routes | **FAIL** | HIGH-3: Workflow/intake routes call store directly |
| Shared types single source of truth | PASS | `Source/Shared/types/workflow.ts` used consistently |
| Every FR has a test with traceability | PASS | All 13 FRs have `// Verifies: FR-WF-XXX` comments |
| All list endpoints use `{data: T[]}` wrapper | PASS | Verified in dashboard and workItems routes |
| New routes have observability | PASS | Logger + metrics present |
| Business logic has no framework imports | PASS | Services are pure functions |
| API response patterns match CLAUDE.md | PASS | PaginatedResponse, DataResponse, 204 patterns |

---

## E2E Tests

Regression E2E tests at `Source/E2E/tests/cycle-run-1774572910837-a438fded/`:

| File | Coverage |
|------|----------|
| `pipeline-optimisations.spec.ts` | Dashboard, work items list, create form, detail page, navigation (no console errors) |
| `dashboard.spec.ts` | Dashboard page rendering, summary cards |
| `work-item-list.spec.ts` | List page, filter controls |
| `create-work-item.spec.ts` | Form fields, validation, submission |
| `work-item-detail.spec.ts` | Detail page rendering |
| `full-workflow.spec.ts` | Cross-page navigation, API-based item creation |

Tests verify existing workflow UI is not regressed by pipeline configuration changes.

---

## Severity Summary

| Severity | Pipeline Opts | Source Code | Total |
|----------|--------------|-------------|-------|
| CRITICAL | 0 | 1 | 1 |
| HIGH | 0 | 4 | 4 |
| MEDIUM | 2 | 3 | 5 |
| LOW | 1 | 3 | 4 |
| INFO | 0 | 0 | 0 |

---

## Verdict

### Pipeline Optimisations: **PASS**

All 6 changes correctly implemented per plan. Two medium observations (M-OPT-1: early commit scope, M-OPT-2: Inspector fallback for missing planner fields) are non-blocking but should be addressed in a follow-up.

### Workflow Engine Source: **APPROVED WITH REQUIRED FIXES**

**Must fix before merge:**
1. **CRIT-1** — Wire `loadFromFile()` into server startup
2. **HIGH-4** — Fix `@shared` path alias in backend vitest config so tests actually run

**Should fix:**
3. **HIGH-1** — Remove manual change-history push from route handlers (let store handle it)
4. **HIGH-2** — Validate pagination params, return 400 for non-numeric values
5. **HIGH-3** — Move store calls behind service layer in workflow/intake routes

**Acceptable for v1:**
6. All MEDIUM and LOW findings

---

RISK_LEVEL: medium

*Report generated by design-critic agent, TheFixer pipeline.*
