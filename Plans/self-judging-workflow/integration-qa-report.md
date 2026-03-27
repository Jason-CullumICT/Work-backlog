# Integration QA Report: Orchestrator-to-Portal Callback Integration

**Reviewer:** integration
**Date:** 2026-03-27
**Branch:** cycle/run-1774569660862-86bbbf28
**RISK_LEVEL:** medium

---

## Executive Summary

The orchestrator-to-portal callback feature implements three new domain entities (Cycle, Feature, Learning) with full CRUD endpoints, three new frontend pages (Features, Learnings, Active Cycles dashboard section), and observability (metrics + structured logging). The implementation is well-structured and follows the existing codebase patterns.

**All 148 backend tests pass. All 114 frontend tests pass. TypeScript compiles cleanly on both sides. Traceability enforcer passes. 6 E2E Playwright specs cover the new pages and API.**

---

## Verification Gates

| Gate | Result |
|------|--------|
| Backend tests (`npm test`) | PASS (148/148) |
| Frontend tests (`npm test`) | PASS (114/114) |
| Backend typecheck (`tsc --noEmit`) | PASS |
| Frontend typecheck (`tsc --noEmit`) | PASS |
| Traceability enforcer | PASS |
| No console.log in Source/Backend/src/ | PASS |
| E2E test files present | PASS (6 spec files) |

---

## Spec Coverage (FR-CB-001 through FR-CB-020)

| FR | Description | Status | Notes |
|----|-------------|--------|-------|
| FR-CB-001 | Create Cycle | PASS | POST /api/cycles, transitions WorkItem Approved->InProgress |
| FR-CB-002 | Update Cycle Phase | PASS | PATCH /api/cycles/:id, appends phase, handles terminal states |
| FR-CB-003 | List Cycles | PASS | GET /api/cycles with workItemId/status filters + pagination |
| FR-CB-004 | Get Cycle by ID | PASS | GET /api/cycles/:id |
| FR-CB-005 | Create Feature | PASS | POST /api/features, transitions WorkItem InProgress->Completed |
| FR-CB-006 | List Features | PASS | GET /api/features with pagination |
| FR-CB-007 | Get Feature by ID | PASS | GET /api/features/:id |
| FR-CB-008 | Create Learning | PASS | POST /api/learnings |
| FR-CB-009 | Batch Create Learnings | PASS | POST /api/learnings/batch, returns {data: Learning[]} |
| FR-CB-010 | List Learnings | PASS | GET /api/learnings with cycleId/team/role filters + pagination |
| FR-CB-011 | Active Cycles | PASS | GET /api/dashboard/active-cycles, excludes completed/failed |
| FR-CB-012 | Features Browser Page | PASS | /features route, paginated table, work item links |
| FR-CB-013 | Learnings Page | PASS | /learnings route, team/role filters, paginated cards |
| FR-CB-014 | Active Cycle Dashboard | PASS | Active Cycles section above Summary on DashboardPage |
| FR-CB-015 | Metrics | PASS | 4 new Prometheus counters added (see Finding #1 below) |
| FR-CB-016 | Structured Logging | PASS | All endpoints log structured JSON with entity ID and action |
| FR-CB-017 | API Response Patterns | PASS | Paginated lists use {data, page, limit, total, totalPages} |
| FR-CB-018 | Store Pattern | PASS | All stores use Map pattern matching workItemStore |
| FR-CB-019 | Service Layer | PASS | Routes -> Services -> Stores, no direct store access from routes |
| FR-CB-020 | PORTAL_URL | N/A | Correctly not implemented (orchestrator-side concern per spec) |

---

## Findings

### Finding #1: Batch learnings bypass metrics counter
**Severity: MEDIUM**
**File:** `Source/Backend/src/services/learning.ts:22-25`

The `batchCreateLearnings()` method calls `learningStore.batchCreate()` directly, bypassing the `learningsCreatedCounter.inc()` call that exists in `createLearning()`. This means learnings created via `POST /api/learnings/batch` are not counted in the `portal_learnings_created_total` Prometheus metric.

**Expected:** Each learning in a batch should increment the counter (or increment once with the total count).
**Impact:** Metrics undercount learnings when batch endpoint is used, which is the primary expected usage pattern from the orchestrator.

### Finding #2: Feature store findAll does not return defensive copies of items
**Severity: LOW**
**File:** `Source/Backend/src/store/featureStore.ts:38`

The `findAll()` method in featureStore returns items from the data array via `slice()`, but individual items are not spread-copied like they are in `findById()` (line 20: `{ ...item }`) and other stores. This means callers could mutate the store's internal objects. The current code doesn't do this, but it's an inconsistency with other stores.

### Finding #3: DashboardPage tests show act() warnings
**Severity: LOW**
**Files:** `Source/Frontend/tests/DashboardPage.test.tsx`, `Source/Frontend/tests/ActiveCycles.test.tsx`

Multiple `act()` warnings appear in test output for DashboardPage and related tests. While all tests pass, these warnings indicate state updates happening outside React's test act() wrapper, which could cause flaky tests in the future.

### Finding #4: No input sanitization on string fields
**Severity: INFO**
**Files:** All route handlers

String inputs (title, description, content, branch) are validated for presence but not sanitized. Since this is an internal API called by the orchestrator (not user-facing), this is acceptable but worth noting for future external exposure.

### Finding #5: Duplicate E2E test files for active cycles
**Severity: INFO**
**Files:** `Source/E2E/tests/cycle-run-*/active-cycles-dashboard.spec.ts`, `Source/E2E/tests/cycle-run-*/dashboard-active-cycles.spec.ts`

Two E2E spec files (`active-cycles-dashboard.spec.ts` and `dashboard-active-cycles.spec.ts`) test nearly identical scenarios for the Active Cycles dashboard section with ~90% overlap. Should be consolidated.

### Finding #6: E2E pipeline config uses wrong port
**Severity: LOW**
**File:** `Source/E2E/playwright.pipeline.config.ts:8`

The pipeline config sets `baseURL: "http://localhost:5101"` but the E2E tests all hardcode `http://localhost:5173` in their `page.goto()` calls. The `baseURL` in the config is effectively unused since tests use absolute URLs. This inconsistency could cause confusion.

---

## Architecture Compliance

| Rule | Status |
|------|--------|
| Specs are source of truth | PASS - All implementations trace to FR-CB spec |
| No direct DB calls from routes | PASS - All routes go through service layer |
| Shared types are single source of truth | PASS - All types from workflow.ts |
| Every FR has a test with traceability | PASS - All test files have `// Verifies: FR-CB-XXX` |
| Response patterns ({data: T[]}) | PASS - List endpoints use PaginatedResponse wrapper |
| Observability (logging + metrics) | PASS - Structured logging + Prometheus counters |
| Business logic has no framework imports | PASS - Services import only types + stores |

---

## Test Coverage Assessment

### Backend Tests (New — 41 tests)
- `cycles.test.ts` — 13 tests: CRUD, status transitions, pagination, filtering (FR-CB-001 to FR-CB-004)
- `features.test.ts` — 10 tests: CRUD, WorkItem transitions, pagination (FR-CB-005 to FR-CB-007)
- `learnings.test.ts` — 14 tests: CRUD, batch, filtering, pagination (FR-CB-008 to FR-CB-010)
- `activeCycles.test.ts` — 4 tests: active cycle filtering (FR-CB-011)

### Frontend Tests (New — 26 tests)
- `FeaturesPage.test.tsx` — 9 tests: table rendering, pagination, empty/error states (FR-CB-012)
- `LearningsPage.test.tsx` — 10 tests: cards, filters, pagination, empty/error states (FR-CB-013)
- `ActiveCycles.test.tsx` — 7 tests: cycle cards, links, empty/error/loading states (FR-CB-014)

### E2E Tests (New — 6 spec files)
- `features-page.spec.ts` — Feature browser page rendering, pagination, navigation (FR-CB-012)
- `learnings-page.spec.ts` — Learnings page rendering, filters, pagination (FR-CB-013)
- `active-cycles-dashboard.spec.ts` — Active cycles dashboard section (FR-CB-014)
- `dashboard-active-cycles.spec.ts` — Dashboard with active cycles (FR-CB-014, duplicate)
- `cycles-api.spec.ts` — Cycles API lifecycle (FR-CB-001, FR-CB-002)
- `navigation.spec.ts` — Navigation links for Features and Learnings pages

### Coverage Gaps (Non-blocking)
- FR-CB-015 (metrics): No direct test verifying Prometheus counter increments — acceptable since metrics are side effects and the counters are exercised indirectly by CRUD tests
- FR-CB-018, FR-CB-019 (store/service patterns): Architectural patterns, not behavioral — verified by code review above

---

## Security Assessment

| Check | Result |
|-------|--------|
| No console.log in backend | PASS |
| No hardcoded secrets | PASS |
| Input validation on required fields | PASS |
| No SQL injection risk | N/A (in-memory stores) |
| No XSS in frontend | PASS (React auto-escapes) |
| No prototype pollution | PASS (spread operators used) |

---

## Recommendation

**APPROVE with minor fix.** The implementation is solid, well-tested, and follows all architecture rules. The one MEDIUM finding (#1 - batch metrics bypass) should be addressed before merge as it affects observability accuracy for the primary usage pattern. The LOW/INFO findings are cleanup items that can be addressed in a follow-up.
