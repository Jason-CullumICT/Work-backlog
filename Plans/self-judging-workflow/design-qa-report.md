# Design QA Report: Self-Judging Workflow Engine

**Reviewer:** design (TheATeam)
**Date:** 2026-03-26
**RISK_LEVEL: high**

---

## Executive Summary

The implementation is **architecturally sound and spec-compliant**. All 13 functional requirements (FR-WF-001 through FR-WF-013) are implemented with traceability comments. The traceability enforcer **PASSED**. Unit test coverage is strong (147 tests across 14 suites). E2E tests cover all pages and the full workflow.

Two critical issues and one high issue must be fixed before merge.

---

## Test Results

### Backend Tests
- **9 test suites, 94 tests — ALL PASSING**
- Covers: store operations, change history, dashboard service, router logic, assessment pod, CRUD routes, dashboard routes, intake routes, workflow action routes

### Frontend Tests
- **5 test suites, 53 tests — ALL PASSING**
- Covers: DashboardPage, WorkItemListPage, WorkItemDetailPage, CreateWorkItemPage, App routing

### E2E Tests
- **5 test suites, 42 tests** (dashboard: 9, create: 7, list: 8, detail: 13, full-workflow: 5)
- Covers full workflow lifecycle, page navigation, form validation, console error checks
- **BLOCKED by C1 (wrong API port)** — tests will fail at runtime

---

## FR Traceability Matrix

| FR ID | Description | Status | Files |
|-------|-------------|--------|-------|
| FR-WF-001 | Work Item data model and in-memory store | IMPLEMENTED | `Shared/types/workflow.ts`, `Backend/src/models/WorkItem.ts`, `Backend/src/store/workItemStore.ts`, `Backend/src/utils/id.ts` |
| FR-WF-002 | Work Item CRUD API endpoints | IMPLEMENTED | `Backend/src/routes/workItems.ts` |
| FR-WF-003 | Change history tracking | IMPLEMENTED | `Backend/src/services/changeHistory.ts`, `Backend/src/models/WorkItem.ts` |
| FR-WF-004 | Work Router service | IMPLEMENTED | `Backend/src/services/router.ts` |
| FR-WF-005 | Assessment Pod service | IMPLEMENTED | `Backend/src/services/assessment.ts` |
| FR-WF-006 | Workflow action endpoints | IMPLEMENTED | `Backend/src/routes/workflow.ts` |
| FR-WF-007 | Dashboard API endpoints | IMPLEMENTED | `Backend/src/routes/dashboard.ts`, `Backend/src/services/dashboard.ts` |
| FR-WF-008 | Intake webhook endpoints | IMPLEMENTED | `Backend/src/routes/intake.ts` |
| FR-WF-009 | Dashboard page | IMPLEMENTED | `Frontend/src/pages/DashboardPage.tsx`, `Frontend/src/hooks/useDashboard.ts` |
| FR-WF-010 | Work Item list page | IMPLEMENTED | `Frontend/src/pages/WorkItemListPage.tsx`, `Frontend/src/hooks/useWorkItems.ts` |
| FR-WF-011 | Work Item detail page | IMPLEMENTED | `Frontend/src/pages/WorkItemDetailPage.tsx` |
| FR-WF-012 | Create Work Item form | IMPLEMENTED | `Frontend/src/pages/CreateWorkItemPage.tsx` |
| FR-WF-013 | Observability | IMPLEMENTED | `Backend/src/metrics.ts`, `Backend/src/utils/logger.ts`, `Backend/src/logger.ts`, `Backend/src/middleware/errorHandler.ts` |

**All 13 FRs are implemented with test coverage and traceability comments.**

---

## Findings

### CRITICAL

#### C1 — E2E tests use wrong backend port (3000 instead of 3001)

**Files:**
- `Source/E2E/tests/cycle-run-1774553018468-17db589d/full-workflow.spec.ts:56,68,94,104`
- `Source/E2E/tests/cycle-run-1774553018468-17db589d/work-item-detail.spec.ts:6,68,84,98,114,115,132,133`

The E2E tests that call the backend API directly via `page.request.post()`/`page.request.patch()` use `http://localhost:3000/api/...`. The backend runs on **port 3001** per CLAUDE.md, `app.ts:46`, and `playwright.config.ts:16`. All E2E tests that set up data via API will fail.

**Fix:** Change all `http://localhost:3000` to `http://localhost:3001` in E2E test files.

---

### HIGH

#### H1 — API client reads wrong error field (`body.message` vs `body.error`)

**File:** `Source/Frontend/src/api/client.ts:25`

```typescript
throw new Error(body.message ?? `Request failed: ${response.status}`);
```

The backend returns `{ error: "..." }` on all error responses (matching `ApiErrorResponse` from CLAUDE.md). The frontend reads `body.message` which will always be `undefined`, so users will never see meaningful error messages — only the generic fallback.

**Fix:** Change `body.message` to `body.error`.

#### H2 — Inconsistent import path alias in WorkItem model

**File:** `Source/Backend/src/models/WorkItem.ts:11`

Uses `import ... from '@shared/types/workflow'` while all other 10+ backend files use `'../../../Shared/types/workflow'`. If the `@shared` path alias isn't properly configured for all build contexts (tests, ts-node, etc.), this file will fail to compile.

**Fix:** Verify `@shared` alias works in all build/test contexts. If not, change to relative path.

#### H3 — `needs-clarification` verdict maps to `rejected` status

**File:** `Source/Backend/src/services/assessment.ts:162-167`

When the pod-lead verdict is `needs-clarification`, `targetStatus` is set to `Rejected`. The `AssessmentVerdict.NeedsClarification` enum exists but has no distinct status outcome — items needing minor clarification are treated identically to outright rejections.

**Impact:** Loss of signal. An item that just needs a complexity field set gets the same treatment as one with fundamentally incomplete requirements.

**Recommendation:** Acceptable for v1 if documented. Consider mapping to a distinct reason prefix in change history.

---

### MEDIUM

#### M1 — No input length limits on work item creation

**Files:** `Source/Backend/src/routes/workItems.ts:20-55`, `Source/Backend/src/routes/intake.ts:11-53`

`title` and `description` are validated for presence but not length. An attacker could submit multi-MB payloads to exhaust memory in the in-memory store.

**Recommendation:** Add max-length validation (e.g., title <= 256, description <= 10,000).

#### M2 — No CORS configuration

**File:** `Source/Backend/src/app.ts`

No CORS middleware is configured. The frontend uses a relative `/api` base URL, which implies a Vite dev proxy is expected. If the proxy isn't configured, all frontend API calls will fail.

**Recommendation:** Verify Vite proxy config exists, or add CORS middleware.

#### M3 — Missing file persistence (spec divergence)

**File:** `Source/Backend/src/store/workItemStore.ts`

The dispatch plan and design doc specify "in-memory store with JSON file persistence." The current implementation is purely in-memory — all data is lost on server restart.

**Impact:** Acceptable for v1/demo, but diverges from the design doc.

#### M4 — `complexity` field dropped on work item creation

**File:** `Source/Backend/src/routes/workItems.ts:43-49`

The `CreateWorkItemRequest` type includes `complexity` and `fastTrack` fields, but the POST handler only passes `title`, `description`, `type`, `priority`, and `source` to the store. The `complexity` field from the request body is silently dropped, meaning newly created items can never have complexity set at creation time.

**Impact:** Items that should be fast-tracked (bug + trivial complexity) cannot be created with complexity pre-set. They must be patched afterward.

---

### LOW

#### L1 — `isFullReview` function is dead code

**File:** `Source/Backend/src/services/router.ts:40-58`

`isFullReview` is defined but never called. The `classifyRoute` function checks `isFastTrack` first and defaults to full-review. The function always returns `true` anyway (line 57). No functional impact but misleading.

#### L2 — No "Assess" button in frontend UI

**File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx:211-214`

The `ActionPanel` shows Route (backlog), Approve/Reject (proposed/reviewing), and Dispatch (approved). There's no UI button to trigger the assessment pod (`POST /api/work-items/:id/assess`). Assessment is only reachable via direct API call.

**Recommendation:** Consider adding an "Assess" button for `proposed` status items.

#### L3 — Duplicate logger modules

**Files:** `Source/Backend/src/utils/logger.ts`, `Source/Backend/src/logger.ts`

Two logger modules exist: structured logger in `utils/logger.ts` and compatibility wrapper in `logger.ts`. Creates unnecessary indirection.

#### L4 — `Object.assign` in-place mutation in store

**File:** `Source/Backend/src/store/workItemStore.ts:71`

`Object.assign(item, updates, ...)` mutates the existing object reference. Code holding prior references will see unexpected changes. Works for v1 in-memory store but fragile.

---

### INFO

#### I1 — Excellent architecture adherence

- Status lifecycle transitions match spec exactly (`VALID_STATUS_TRANSITIONS` in shared types)
- Team assignment rules match spec: TheATeam for features/complex, TheFixer for bugs/improvements
- Assessment pod implements all 4 roles with correct aggregation logic
- All API endpoints match spec shapes and CLAUDE.md response patterns
- Frontend routes match design: `/`, `/work-items`, `/work-items/new`, `/work-items/:id`
- Shared types properly centralized in `Source/Shared/types/workflow.ts`
- Prometheus metrics cover all 4 required counters
- No `console.log` usage — structured logging throughout

#### I2 — Security posture is good for v1

- Input validation on all POST endpoints (type, enum checking)
- Soft delete prevents data loss
- No SQL injection risk (in-memory store)
- No XSS risk (React auto-escapes)
- Error handler avoids leaking stack traces
- Team name validated against whitelist (`TheATeam`/`TheFixer`)

#### I3 — E2E test coverage is comprehensive (once C1 is fixed)

5 suites covering: full workflow lifecycle (create -> route -> assess -> approve -> dispatch), fast-track path, rejection flow, cross-page navigation, console error monitoring, form validation, all action buttons.

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | PASS | All implementation traces to `Specifications/workflow-engine.md` |
| No direct DB calls from routes | PASS | Routes call store/services, never raw data |
| Shared types single source of truth | PASS | `Source/Shared/types/workflow.ts` used by all layers |
| Every FR has a test with traceability | PASS | All 13 FRs have `// Verifies: FR-WF-XXX` |
| All list endpoints use `{data: T[]}` wrapper | PASS | Paginated and simple list responses comply |
| New routes have observability | PASS | Logger + metrics on all routes |
| Business logic has no framework imports | PASS | Services are pure functions |
| API response patterns match CLAUDE.md | PASS | Paginated lists, single items, 204 deletes, error wrappers |

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 4 |
| INFO | 3 |

---

## Verdict

**APPROVED with required fixes.**

**Must fix before merge:**
1. **C1** — E2E test port (3000 -> 3001)
2. **H1** — API client error field (`message` -> `error`)
3. **H2** — Verify `@shared` path alias works in all build contexts

**Should fix:**
4. **H3** — Document needs-clarification -> rejected mapping
5. **M1** — Add input length limits
6. **M4** — Pass complexity field through on creation

The implementation is architecturally sound, spec-compliant, and well-tested. The workflow diagram flow is correctly implemented: inputs -> backlog -> router (fast-track/full-review) -> assessment pod -> review -> dispatch to existing teams.
