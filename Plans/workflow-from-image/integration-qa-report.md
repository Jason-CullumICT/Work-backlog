# Integration QA Report: Workflow Definitions (Create a Workflow from Image)

**Date:** 2026-03-26
**Reviewer:** integration
**Team:** TheATeam
**RISK_LEVEL:** medium

---

## Executive Summary

The workflow definitions feature is **partially implemented**. Frontend pages, shared types, backend data model/store, and unit tests are complete and passing. However, **critical backend API layer is missing** — no REST endpoints, no workflow service, no flow graph generation, no router/assessment integration, and no observability metrics. The frontend will not function against a real backend until the API layer is built.

**Verdict: BLOCKED — Cannot ship without backend API endpoints (FR-WFD-002, FR-WFD-003)**

---

## Test Results

| Suite | Status | Tests |
|-------|--------|-------|
| Backend unit tests | PASS | 140/140 |
| Frontend unit tests | PASS | 141/141 |
| Traceability enforcer | FAIL | 4 missing FRs |

---

## Traceability Report

### Implemented (with `// Verifies: FR-WFD-XXX` comments)

| FR | Description | Status | Files |
|----|-------------|--------|-------|
| FR-WFD-001 | Workflow data model and store | COMPLETE | `Source/Shared/types/workflow.ts`, `Source/Backend/src/models/Workflow.ts`, `Source/Backend/src/store/workflowStore.ts`, tests |
| FR-WFD-006 | Add workflowId to WorkItem | COMPLETE | `Source/Shared/types/workflow.ts` (lines 210, 228) |
| FR-WFD-007 | Workflow list page | COMPLETE | `Source/Frontend/src/pages/WorkflowListPage.tsx`, tests |
| FR-WFD-008 | Workflow detail page + flow diagram | COMPLETE | `Source/Frontend/src/pages/WorkflowDetailPage.tsx`, `Source/Frontend/src/components/WorkflowFlowDiagram.tsx`, tests |
| FR-WFD-009 | Create workflow page | COMPLETE | `Source/Frontend/src/pages/CreateWorkflowPage.tsx`, tests |
| FR-WFD-010 | Navigation updates | PARTIAL | `Layout.tsx` has Workflows link; `App.tsx` missing `/workflows` and `/workflows/new` routes |
| FR-WFD-003 | Flow graph endpoint | NOT IMPLEMENTED | No `GET /api/workflows/:id/flow` endpoint |

### Missing Implementation (traceability enforcer failures)

| FR | Description | Severity | Notes |
|----|-------------|----------|-------|
| FR-WFD-002 | Workflow CRUD API endpoints | **CRITICAL** | No `Source/Backend/src/routes/workflows.ts` or `Source/Backend/src/services/workflowService.ts` exist. Frontend API calls will 404. |
| FR-WFD-003 | Flow graph endpoint | **CRITICAL** | No `GET /api/workflows/:id/flow` implementation. Detail page flow diagram will show empty. |
| FR-WFD-004 | Router-workflow integration | **HIGH** | `Source/Backend/src/services/router.ts` has no `routeWithWorkflow()` function. Still uses hardcoded routing logic. |
| FR-WFD-005 | Assessment-workflow integration | **HIGH** | `Source/Backend/src/services/assessment.ts` has no `assessWithWorkflow()` function. Still uses hardcoded pod roles. |
| FR-WFD-011 | Observability metrics | **MEDIUM** | `Source/Backend/src/metrics.ts` missing `workflow_definitions_created_total` counter and `workflow_definitions_active` gauge. |

---

## Findings

### CRITICAL

**C1: Missing Workflow REST API (FR-WFD-002)**
- **Severity:** CRITICAL
- **Details:** Files `Source/Backend/src/routes/workflows.ts` and `Source/Backend/src/services/workflowService.ts` do not exist. The dispatch plan assigns these to backend-coder-2, who appears to have not completed their work. Without these endpoints, all frontend API calls (`POST/GET/PATCH/DELETE /api/workflows`) will return 404.
- **Impact:** Frontend is non-functional against a live backend.
- **Action Required:** backend-coder-2 must implement workflow routes and service.

**C2: Missing Flow Graph Endpoint (FR-WFD-003)**
- **Severity:** CRITICAL
- **Details:** `GET /api/workflows/:id/flow` is not implemented. The `WorkflowFlowDiagram` component on the detail page depends on this endpoint to render the SVG flow.
- **Impact:** Detail page will show empty flow diagram or error state.
- **Action Required:** Part of backend-coder-2's scope.

**C3: App.tsx Missing Routes (FR-WFD-010)**
- **Severity:** CRITICAL
- **Details:** `Source/Frontend/src/App.tsx` only has `<Route path="/workflows/:id">` but is missing:
  - `<Route path="/workflows" element={<WorkflowListPage />} />`
  - `<Route path="/workflows/new" element={<CreateWorkflowPage />} />`
  - Missing imports for `WorkflowListPage` and `CreateWorkflowPage`
- **Impact:** `/workflows` and `/workflows/new` routes will show blank pages. Only `/workflows/:id` works.
- **Action Required:** frontend-coder-1 must add the missing routes.

### HIGH

**H1: No Backend Registration of Workflow Routes (FR-WFD-002)**
- **Severity:** HIGH
- **Details:** `Source/Backend/src/app.ts` does not register a `/api/workflows` router. Even after the routes file is created, it must be registered in `app.ts`.
- **Action Required:** Add `app.use('/api/workflows', workflowsRouter)` to app.ts.

**H2: Router Service Not Integrated with Workflows (FR-WFD-004)**
- **Severity:** HIGH
- **Details:** `Source/Backend/src/services/router.ts` still uses hardcoded `isFastTrack()` logic. The spec requires `routeWithWorkflow(item, workflow)` that reads `workflow.routingRules` for rule evaluation.
- **Impact:** Routing decisions are not configurable per-workflow. All items use hardcoded rules.

**H3: Assessment Service Not Integrated with Workflows (FR-WFD-005)**
- **Severity:** HIGH
- **Details:** `Source/Backend/src/services/assessment.ts` uses hardcoded `POD_ROLES`. The spec requires `assessWithWorkflow(item, workflow)` that uses `workflow.assessmentConfig`.
- **Impact:** Assessment pod configuration is not configurable per-workflow.

### MEDIUM

**M1: Frontend Uses Duplicate Type Stubs (Architecture Violation)**
- **Severity:** MEDIUM
- **Details:** `Source/Frontend/src/hooks/useWorkflows.ts` defines local type stubs for `Workflow`, `FlowNode`, `FlowEdge`, etc. (lines 8-87) instead of importing from `@shared/types/workflow` or `../../../Shared/types/workflow`. This violates the architecture rule: "Shared types are single source of truth — no inline type re-definitions across layers."
- **Impact:** Type drift risk if shared types are updated but frontend stubs are not.
- **Action Required:** Replace local stubs with imports from shared types. The TODO comment on line 6 acknowledges this needs reconciliation.

**M2: Frontend API Client Not Using Project's API Client**
- **Severity:** MEDIUM
- **Details:** `useWorkflows.ts` implements its own `request()` function (line 93) instead of using `Source/Frontend/src/api/client.ts`. This could lead to inconsistent error handling, auth headers, or base URL configuration.
- **Action Required:** Refactor to use the project's existing API client.

**M3: WorkflowStore Missing File Persistence (FR-WFD-001)**
- **Severity:** MEDIUM
- **Details:** The dispatch plan specifies "In-memory Map with JSON file persistence (same pattern as workItemStore)" but `workflowStore.ts` uses only an in-memory Map with no file I/O. Data will be lost on server restart.
- **Impact:** Workflows are ephemeral — only the default seed survives restarts.

**M4: Missing Observability Metrics (FR-WFD-011)**
- **Severity:** MEDIUM
- **Details:** `Source/Backend/src/metrics.ts` does not define `workflow_definitions_created_total` or `workflow_definitions_active` gauges as required by the spec.

### LOW

**L1: WorkflowStore `require()` Inside Function**
- **Severity:** LOW
- **Details:** `workflowStore.ts` lines 46-47 and 50-51 use `require('../utils/id')` inside `updateWorkflow()` instead of a top-level import. This is a code quality issue (mixing ESM imports with CommonJS require).

**L2: WorkflowFlowDiagram Imports From Hook File**
- **Severity:** LOW
- **Details:** `WorkflowFlowDiagram.tsx` imports `FlowNode` and `FlowEdge` from `../hooks/useWorkflows` (line 3) instead of from shared types. This creates an unusual dependency direction (component → hook for types).

### INFO

**I1: Default Workflow Uses Fixed Stage IDs**
- **Info:** `buildDefaultWorkflow()` in `Workflow.ts` uses hardcoded IDs like `'stage-intake'`, `'stage-queue'` etc. instead of `generateId()`. This is intentional for predictable referencing but differs from `buildWorkflow()` which uses `generateId()`.

**I2: All Unit Tests Pass**
- **Info:** 140 backend tests and 141 frontend tests pass with zero failures. No pre-existing test failures detected.

**I3: Good Test Coverage for Implemented Features**
- **Info:** Comprehensive unit tests exist for: workflow store CRUD, model builders/validators, WorkflowFlowDiagram component, WorkflowListPage, WorkflowDetailPage, CreateWorkflowPage.

---

## E2E Tests Written

Three Playwright E2E test files created at `Source/E2E/tests/cycle-run-1774564580725-f34dc40c/`:

| File | Tests | Covers |
|------|-------|--------|
| `workflow-list.spec.ts` | 6 | FR-WFD-007, FR-WFD-010: Nav link, heading, create button, default workflow display, navigation, console errors |
| `workflow-detail.spec.ts` | 7 | FR-WFD-008: Detail page navigation, heading/badges, flow diagram, routing rules, assessment config, team targets, back link |
| `workflow-create.spec.ts` | 11 | FR-WFD-009: Form rendering, pre-checked stages/teams, validation errors, routing rules add/remove, assessment roles, form submission, console errors |

**Note:** E2E tests cannot pass until CRITICAL items C1-C3 are resolved (backend API + missing frontend routes).

---

## Security Review

- **No hardcoded secrets found** in any workflow files.
- **No SQL injection risk** — in-memory store, no database.
- **No XSS risk** — React auto-escapes. No `dangerouslySetInnerHTML`.
- **Input validation present** on backend model (validateStages, validateRoutingRules, validateAssessmentConfig) but not yet connected to API endpoints (since endpoints don't exist).
- **No auth/authz** on workflow endpoints (not in scope for v1 per spec).

---

## Summary of Required Actions

| Priority | Action | Owner |
|----------|--------|-------|
| CRITICAL | Implement workflow REST API routes and service | backend-coder-2 |
| CRITICAL | Implement flow graph endpoint | backend-coder-2 |
| CRITICAL | Add missing `/workflows` and `/workflows/new` routes to App.tsx | frontend-coder-1 |
| HIGH | Register workflow router in app.ts | backend-coder-2 |
| HIGH | Add `routeWithWorkflow()` to router service | backend-coder-2 |
| HIGH | Add `assessWithWorkflow()` to assessment service | backend-coder-2 |
| MEDIUM | Replace frontend type stubs with shared imports | frontend-coder-1 |
| MEDIUM | Use project API client in useWorkflows hook | frontend-coder-1 |
| MEDIUM | Add JSON file persistence to workflow store | backend-coder-1 |
| MEDIUM | Add workflow observability metrics | backend-coder-2 |
