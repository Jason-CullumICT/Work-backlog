# Design QA Report: Orchestrator-to-Portal Callback Integration

**Reviewer:** design (TheATeam)
**Date:** 2026-03-27
**RISK_LEVEL: medium**

Rationale: New feature with new endpoints, pages, and stores across ~29 files. No schema migration or auth changes. Follows established in-memory store patterns.

---

## Executive Summary

The implementation is **architecturally sound and spec-compliant**. All 20 functional requirements (FR-CB-001 through FR-CB-020) are implemented with correct layering (store → service → route). Backend tests pass (148/148 via Jest). Frontend tests pass (114/114 via Vitest). Traceability enforcer **PASSED**.

One medium finding (missing work item title in active cycle cards per FR-CB-014) and several low/info items identified. No critical or high issues.

---

## Test Results

### Backend Tests
- **13 test suites, 148 tests — ALL PASSING** (Jest)
- Covers: cycles CRUD, features CRUD, learnings CRUD + batch, active cycles dashboard, work items, workflow actions, intake, router, assessment, change history, dashboard service, work item store

### Frontend Tests
- **10 test suites, 114 tests — ALL PASSING** (Vitest)
- Covers: FeaturesPage, LearningsPage, ActiveCycles on DashboardPage, DashboardPage, WorkItemListPage, WorkItemDetailPage, CreateWorkItemPage, App routing

### E2E Tests
- **6 test suites, 40 tests** in `Source/E2E/tests/cycle-run-1774569660862-86bbbf28/`
- Covers: features page, learnings page, active cycles dashboard (2 suites), cycles API, navigation
- All use correct base URLs (5173 for frontend, 3001 for API)

### Traceability
- `tools/traceability-enforcer.py` — **PASSED**: All requirements have implementation references

---

## FR Traceability Matrix

| FR ID | Description | Status | Key Files |
|-------|-------------|--------|-----------|
| FR-CB-001 | Create Cycle | PASS | `Backend/src/routes/cycles.ts`, `Backend/src/services/cycle.ts`, `Backend/src/store/cycleStore.ts` |
| FR-CB-002 | Update Cycle Phase | PASS | `Backend/src/routes/cycles.ts`, `Backend/src/services/cycle.ts` |
| FR-CB-003 | List Cycles | PASS | `Backend/src/routes/cycles.ts`, `Backend/src/store/cycleStore.ts` |
| FR-CB-004 | Get Cycle by ID | PASS | `Backend/src/routes/cycles.ts`, `Backend/src/store/cycleStore.ts` |
| FR-CB-005 | Create Feature | PASS | `Backend/src/routes/features.ts`, `Backend/src/services/feature.ts` |
| FR-CB-006 | List Features | PASS | `Backend/src/routes/features.ts`, `Backend/src/store/featureStore.ts` |
| FR-CB-007 | Get Feature by ID | PASS | `Backend/src/routes/features.ts`, `Backend/src/store/featureStore.ts` |
| FR-CB-008 | Create Learning | PASS | `Backend/src/routes/learnings.ts`, `Backend/src/services/learning.ts` |
| FR-CB-009 | Batch Create Learnings | PASS | `Backend/src/routes/learnings.ts`, `Backend/src/services/learning.ts` |
| FR-CB-010 | List Learnings | PASS | `Backend/src/routes/learnings.ts`, `Backend/src/store/learningStore.ts` |
| FR-CB-011 | Active Cycles Dashboard API | PASS | `Backend/src/routes/dashboard.ts`, `Backend/src/services/cycle.ts` |
| FR-CB-012 | Features Browser Page | PASS | `Frontend/src/pages/FeaturesPage.tsx`, `Frontend/src/hooks/useFeatures.ts` |
| FR-CB-013 | Learnings Page | PASS | `Frontend/src/pages/LearningsPage.tsx`, `Frontend/src/hooks/useLearnings.ts` |
| FR-CB-014 | Active Cycle Dashboard Section | PARTIAL | `Frontend/src/pages/DashboardPage.tsx`, `Frontend/src/hooks/useActiveCycles.ts` — see M1 |
| FR-CB-015 | Metrics | PASS | `Backend/src/metrics.ts` — all 4 counters defined and incremented in service layer |
| FR-CB-016 | Structured Logging | PASS | All routes/services use logger.info/warn, no console.log in src/ |
| FR-CB-017 | API Response Patterns | PASS | Lists use `{data: T[]}`, singles return raw T, pagination metadata included |
| FR-CB-018 | In-memory Map stores | PASS | All 3 new stores follow workItemStore pattern |
| FR-CB-019 | Service layer enforcement | PASS | No direct store access from route handlers |
| FR-CB-020 | PORTAL_URL is orchestrator-side | N/A | Portal only exposes endpoints, not implemented here |

---

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

#### M1 — Active Cycle Cards Missing Work Item Title (FR-CB-014 Spec Deviation)

**File:** `Source/Frontend/src/pages/DashboardPage.tsx:52-54`

FR-CB-014 specifies: "Each card shows: **work item title**, team, current phase, time elapsed"

The implementation shows:
- Team (correct)
- Status (spec says "current phase" — similar but not identical)
- Branch (not in spec, useful addition)
- Elapsed time (correct)
- **Missing: work item title** — the most important identifier for users

**Impact:** Users cannot tell what feature/bug a cycle is building without clicking through. Reduces dashboard utility.

**Recommendation:** Either fetch work item titles client-side via the existing work items API, or enrich the `/api/dashboard/active-cycles` response to include work item title.

#### M2 — Duplicate Active Cycles E2E Test Suites

**Files:**
- `Source/E2E/tests/cycle-run-*/active-cycles-dashboard.spec.ts`
- `Source/E2E/tests/cycle-run-*/dashboard-active-cycles.spec.ts`

Two separate E2E suites test the same Active Cycles dashboard section with overlapping assertions (section visibility, empty state, positioning above summary). This adds maintenance cost without additional coverage.

**Recommendation:** Consolidate into one test file.

### LOW

#### L1 — Hard Wait in E2E Test

**File:** `Source/E2E/tests/cycle-run-*/active-cycles-dashboard.spec.ts:84`

Uses `page.waitForTimeout(1000)` instead of waiting for a specific element/condition. Flaky in CI.

**Recommendation:** Replace with `page.waitForSelector()` or `expect().toBeVisible()`.

#### L2 — XPath Locator in E2E Test

**File:** `Source/E2E/tests/cycle-run-*/active-cycles-dashboard.spec.ts:73`

Uses `xpath=ancestor::a` which is fragile. Prefer Playwright's built-in locator strategies.

#### L3 — Logger Import Inconsistency

Backend files use two different import patterns:
- `import logger from '../logger'` (default import via compatibility wrapper)
- `import { logger } from '../utils/logger'` (named import from structured logger)

Both work but the inconsistency is confusing. Not a functional issue.

#### L4 — React Router Console Errors Filtered in E2E

**Files:** `dashboard-active-cycles.spec.ts:56`, `navigation.spec.ts:40`

Console error checks filter out React Router errors rather than fixing the root cause. This could mask real issues.

### INFO

#### I1 — Excellent Architecture Compliance

- All 3 new entities follow the identical store → service → route layering
- Metrics incremented exclusively in service layer (not routes)
- All stores use `Map<string, Entity>` with defensive copies
- UUID generation via `crypto.randomUUID()` consistently
- No `console.log` usage anywhere in `Source/Backend/src/` or `Source/Frontend/src/`
- Shared types centralized in `Source/Shared/types/workflow.ts`

#### I2 — Good Security Posture

- Input validation on all POST endpoints (required fields, type checking)
- Team names validated against whitelist (`TheATeam`/`TheFixer`)
- No SQL injection risk (in-memory store)
- No XSS risk (React auto-escapes)
- Error handler doesn't leak stack traces

#### I3 — WorkItem State Transitions Correctly Wired

- Cycle creation transitions WorkItem from `approved` → `in-progress`
- Feature creation transitions WorkItem from `in-progress` → `completed`
- Cross-entity coordination happens in service layer as designed

#### I4 — E2E Test Coverage

6 E2E suites cover all frontend pages and the cycles API with correct base URLs. Previous cycle's E2E port issue (C1 in design-qa-report.md) is not present — all tests use port 3001.

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | PASS | All implementation traces to `Specifications/orchestrator-callbacks.md` |
| No direct DB calls from routes | PASS | Routes → services → stores throughout |
| Shared types single source of truth | PASS | All types in `Source/Shared/types/workflow.ts` |
| Every FR has a test with traceability | PASS | `// Verifies: FR-CB-XXX` comments in all files |
| All list endpoints use `{data: T[]}` wrapper | PASS | Paginated and simple list responses comply |
| New routes have observability | PASS | Structured logging + Prometheus metrics |
| Business logic has no framework imports | PASS | Services are pure functions/classes |
| API response patterns match CLAUDE.md | PASS | Single items raw, lists wrapped, 204 for deletes |

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |
| INFO | 4 |

---

## Verdict

**APPROVED with minor issues.**

**Should fix before merge:**
1. **M1** — Add work item title to active cycle cards (FR-CB-014 compliance)

**Nice to fix:**
2. **M2** — Consolidate duplicate active cycles E2E suites
3. **L1** — Replace hard wait with element-based wait
4. **L4** — Investigate React Router console errors

The implementation is architecturally sound, well-tested (148 backend + 114 frontend + 40 E2E tests), and fully compliant with the specification across 19 of 20 FRs. The single partial compliance (FR-CB-014 missing work item title) is a UI completeness issue, not an architectural problem.
