# Dispatch Plan: Orchestrator-to-Portal Callback Integration

**Specification:** `Specifications/orchestrator-callbacks.md`
**Design:** `Plans/orchestrator-portal-callbacks/design.md`

RISK_LEVEL: medium

## Scoping / Bin-Packing

### Backend Complexity
| FR | Size | Files |
|----|------|-------|
| FR-CB-001/002/003/004 (Cycles CRUD) | M (2) | store/cycleStore.ts, services/cycle.ts, routes/cycles.ts |
| FR-CB-005/006/007 (Features CRUD) | M (2) | store/featureStore.ts, services/feature.ts, routes/features.ts |
| FR-CB-008/009/010 (Learnings CRUD) | M (2) | store/learningStore.ts, services/learning.ts, routes/learnings.ts |
| FR-CB-011 (Active cycles dashboard) | S (1) | routes/dashboard.ts, services/dashboard.ts |
| FR-CB-015/016 (Observability) | S (1) | metrics.ts, all services |
| Shared types + app.ts wiring | S (1) | Shared/types/workflow.ts, app.ts |

**Backend total: 9 points → 2 backend coders**

### Frontend Complexity
| FR | Size | Files |
|----|------|-------|
| FR-CB-012 (Features page) | M (2) | FeaturesPage.tsx, useFeatures.ts |
| FR-CB-013 (Learnings page) | M (2) | LearningsPage.tsx, useLearnings.ts |
| FR-CB-014 (Active cycles dashboard) | S (1) | DashboardPage.tsx, useActiveCycles.ts |
| Nav + routing + API client | S (1) | Layout.tsx, App.tsx, client.ts |

**Frontend total: 6 points → 2 frontend coders**

---

## Stage 1: Requirements Review

The requirements reviewer should validate `Specifications/orchestrator-callbacks.md` against the task description and ensure all FRs are complete and testable.

---

## Stage 2: API Contract

The api-contract agent should define the shared types in `Source/Shared/types/workflow.ts` for the new entities (Cycle, Feature, Learning) and their request/response types per the specification.

**FRs covered:** All type definitions needed by FR-CB-001 through FR-CB-017.

---

## Stage 3: Implementation (Parallel)

### backend-coder-1

**Assignment: Cycles + Features + App wiring + Observability (6 points)**

**FRs:** FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004, FR-CB-005, FR-CB-006, FR-CB-007, FR-CB-011, FR-CB-015, FR-CB-016, FR-CB-017, FR-CB-018, FR-CB-019

**Files to create:**
- `Source/Backend/src/store/cycleStore.ts` — In-memory Map store for Cycle entities
- `Source/Backend/src/store/featureStore.ts` — In-memory Map store for Feature entities
- `Source/Backend/src/services/cycle.ts` — Cycle business logic (create, update phase, get active)
- `Source/Backend/src/services/feature.ts` — Feature business logic (create, list)
- `Source/Backend/src/routes/cycles.ts` — POST /api/cycles, PATCH /api/cycles/:id, GET /api/cycles, GET /api/cycles/:id
- `Source/Backend/src/routes/features.ts` — POST /api/features, GET /api/features, GET /api/features/:id

**Files to modify:**
- `Source/Backend/src/app.ts` — Mount cyclesRouter and featuresRouter, also learningsRouter
- `Source/Backend/src/routes/dashboard.ts` — Add GET /api/dashboard/active-cycles endpoint
- `Source/Backend/src/services/dashboard.ts` — Add getActiveCycles() method
- `Source/Backend/src/metrics.ts` — Add portal_cycles_created_total, portal_cycles_completed_total, portal_features_created_total, portal_learnings_created_total counters

**Key implementation details:**
- `createCycle()` must also transition the referenced WorkItem to `in-progress` via `workItemStore.updateWorkItem()` with change history tracking
- `updateCyclePhase()` must append to the `phases` array and set `completedAt`/`result` on terminal statuses
- `createFeature()` must also transition the referenced WorkItem to `completed` via `workItemStore.updateWorkItem()` with change history tracking
- Active cycles endpoint returns cycles where status is NOT `completed` or `failed`
- All stores follow the `workItemStore.ts` pattern exactly (Map, UUID, findAll with filters/pagination)
- All services use structured logging via the project's logger (not console.log)
- Increment Prometheus counters in the service layer

**Tests to create:**
- `Source/Backend/src/__tests__/cycles.test.ts` — Tests for FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004, FR-CB-011
- `Source/Backend/src/__tests__/features.test.ts` — Tests for FR-CB-005, FR-CB-006, FR-CB-007

**Specification:** `Specifications/orchestrator-callbacks.md`
**Design:** `Plans/orchestrator-portal-callbacks/design.md`

---

### backend-coder-2

**Assignment: Learnings CRUD (3 points)**

**FRs:** FR-CB-008, FR-CB-009, FR-CB-010, FR-CB-016, FR-CB-017, FR-CB-018, FR-CB-019

**Files to create:**
- `Source/Backend/src/store/learningStore.ts` — In-memory Map store for Learning entities
- `Source/Backend/src/services/learning.ts` — Learning business logic (create, batch create, list)
- `Source/Backend/src/routes/learnings.ts` — POST /api/learnings, POST /api/learnings/batch, GET /api/learnings

**Key implementation details:**
- Batch endpoint creates multiple learnings in a single call, returns `{ data: Learning[] }`
- List supports filtering by `cycleId`, `team`, `role` query params
- Store follows the `workItemStore.ts` pattern (Map, UUID, findAll with filters/pagination)
- Use structured logging via the project's logger
- Increment `portal_learnings_created_total{team,role}` counter in service (counter will be defined by backend-coder-1 in metrics.ts)

**Tests to create:**
- `Source/Backend/src/__tests__/learnings.test.ts` — Tests for FR-CB-008, FR-CB-009, FR-CB-010

**Specification:** `Specifications/orchestrator-callbacks.md`
**Design:** `Plans/orchestrator-portal-callbacks/design.md`

**COORDINATION NOTE:** backend-coder-1 will modify `app.ts` to mount the learnings router. backend-coder-2 should only create the learnings-specific files (store, service, route). The route file should export a default Express Router.

---

### frontend-coder-1

**Assignment: Features page + Learnings page + Nav/Routing/Client updates (6 points)**

**FRs:** FR-CB-012, FR-CB-013, FR-CB-017

**Files to create:**
- `Source/Frontend/src/pages/FeaturesPage.tsx` — Paginated features table with title, description, branch, merged date, work item link
- `Source/Frontend/src/pages/LearningsPage.tsx` — Paginated learnings list with team/role filters
- `Source/Frontend/src/hooks/useFeatures.ts` — Fetches features list from GET /api/features
- `Source/Frontend/src/hooks/useLearnings.ts` — Fetches learnings list from GET /api/learnings with filter params

**Files to modify:**
- `Source/Frontend/src/App.tsx` — Add routes: `/features` → FeaturesPage, `/learnings` → LearningsPage
- `Source/Frontend/src/components/Layout.tsx` — Add nav items: Features, Learnings
- `Source/Frontend/src/api/client.ts` — Add `featuresApi.list()`, `learningsApi.list()`, `cyclesApi.list()`, `dashboardApi.activeCycles()`

**Key implementation details:**
- Import shared types from `../../../Shared/types/workflow`
- FeaturesPage: paginated table, each row links to `/work-items/{feature.workItemId}`
- LearningsPage: two filter dropdowns (team, role) that update query params, paginated list
- Follow existing page patterns (loading state, error state, data display)
- Use same styling approach as existing pages (inline styles)
- API client methods should follow existing pattern in `client.ts` (use the `request<T>()` helper)

**Tests to create:**
- `Source/Frontend/src/__tests__/FeaturesPage.test.tsx` — Renders features list, pagination
- `Source/Frontend/src/__tests__/LearningsPage.test.tsx` — Renders learnings, filters work

**Specification:** `Specifications/orchestrator-callbacks.md`
**Design:** `Plans/orchestrator-portal-callbacks/design.md`

---

### frontend-coder-2

**Assignment: Active Cycles dashboard section (2 points)**

**FRs:** FR-CB-014

**Files to create:**
- `Source/Frontend/src/hooks/useActiveCycles.ts` — Fetches active cycles from GET /api/dashboard/active-cycles

**Files to modify:**
- `Source/Frontend/src/pages/DashboardPage.tsx` — Add ActiveCycles section above Summary cards

**Key implementation details:**
- ActiveCycles section shows cycle cards with: team, current status, branch, time elapsed (calculated from startedAt)
- Each card links to `/work-items/{cycle.workItemId}`
- Use same Card styling pattern as existing dashboard
- Show "No active cycles" placeholder when empty
- Import shared types from `../../../Shared/types/workflow`
- The `dashboardApi.activeCycles()` method will be added to client.ts by frontend-coder-1

**Tests to create:**
- `Source/Frontend/src/__tests__/ActiveCycles.test.tsx` — Renders active cycles, handles empty state

**Specification:** `Specifications/orchestrator-callbacks.md`
**Design:** `Plans/orchestrator-portal-callbacks/design.md`

**COORDINATION NOTE:** frontend-coder-1 will modify `client.ts` to add the `dashboardApi.activeCycles()` method. frontend-coder-2 should focus on the DashboardPage changes and the useActiveCycles hook. The hook should call `dashboardApi.activeCycles()` from the shared client.

---

## Stage 4: Review & QA

All standard QA agents run unconditionally per the pipeline DAG:

### Tier 1 (parallel)
- **chaos-tester** — Adversarial testing of new endpoints (malformed payloads, missing fields, invalid UUIDs)
- **security-qa** — Review new endpoints for injection, auth gaps, data exposure
- **traceability-reporter** — Verify all FRs (FR-CB-001 through FR-CB-020) have corresponding `// Verifies:` comments
- **visual-playwright** — Visual validation of Features page, Learnings page, and Active Cycles dashboard section
- **qa-review-and-tests** — Run all unit/integration tests, verify zero new failures

### Tier 2 (sequential)
- **design-critic** — Visual audit of new pages for consistency with existing design
- **integration-reviewer** — End-to-end smoke test: create cycle → update phases → create feature → create learnings → verify dashboard shows data
