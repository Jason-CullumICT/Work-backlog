# Design QA Report: Workflow Definitions (Create a Workflow from Image)

**Date:** 2026-03-26
**Role:** design (design-critic)
**Team:** TheATeam

## RISK_LEVEL: medium

---

## Summary

The Workflow Definitions feature adds workflow as a first-class domain entity. Backend model, store, and shared types are implemented. Frontend pages (list, detail, create) and SVG flow diagram component are built. However, **critical gaps remain**: the backend REST API endpoints, workflow service (including flow graph generation), router/assessment workflow integration, and observability metrics are all missing.

**Overall Status: INCOMPLETE — 4 of 11 FRs have zero implementation**

---

## Findings

### CRITICAL

#### C1: Missing Workflow CRUD API Endpoints (FR-WFD-002)
**Severity:** CRITICAL
**Files:** `Source/Backend/src/routes/workflows.ts` (does not exist), `Source/Backend/src/app.ts`

No REST API router exists for workflow CRUD operations. The dispatch plan calls for `POST/GET/PATCH/DELETE /api/workflows` endpoints in `Source/Backend/src/routes/workflows.ts`, but this file does not exist. The existing `Source/Backend/src/routes/workflow.ts` is the **work item action** routes (route/assess/approve/reject/dispatch for `/api/work-items/:id/*`), not the workflow definition CRUD.

`app.ts` has no `app.use('/api/workflows', ...)` registration. The frontend `useWorkflows` hooks call `/api/workflows` endpoints that don't exist. **All workflow frontend pages will fail at runtime with 404 errors.**

#### C2: Missing Workflow Service (FR-WFD-003, FR-WFD-004, FR-WFD-005)
**Severity:** CRITICAL
**File:** `Source/Backend/src/services/workflowService.ts` (does not exist)

No workflow service exists. This was assigned to backend-coder-2 and covers:
- CRUD operations calling workflow store
- `generateFlowGraph()` — converts workflow stages into positioned nodes/edges for the SVG diagram
- `seedDefaultWorkflow()` call on startup
- Router integration: `routeWithWorkflow(item, workflow)` to evaluate workflow routing rules
- Assessment integration: `assessWithWorkflow(item, workflow)` to use workflow pod config

Without this, the flow diagram endpoint (`GET /api/workflows/:id/flow`) cannot work, and the existing router/assessment services remain hardcoded with no workflow awareness.

#### C3: Router Service Not Integrated with Workflow (FR-WFD-004)
**Severity:** CRITICAL
**File:** `Source/Backend/src/services/router.ts`

The router service still uses hardcoded `isFastTrack()` / `isFullReview()` logic. Per the spec and dispatch plan, it should gain a `routeWithWorkflow(item, workflow)` function that evaluates the workflow's `routingRules` array instead of hardcoded conditions. The fallback to hardcoded logic for items without a workflowId is correct behavior, but the workflow-backed path is entirely absent.

#### C4: Assessment Service Not Integrated with Workflow (FR-WFD-005)
**Severity:** CRITICAL
**File:** `Source/Backend/src/services/assessment.ts`

The assessment service has hardcoded pod roles (`POD_ROLES` constant) and consensus logic. Per spec, it should gain `assessWithWorkflow(item, workflow)` that reads roles and consensus rule from the workflow's `assessmentConfig`. No workflow integration exists.

### HIGH

#### H1: Missing Frontend Routes for `/workflows` and `/workflows/new` (FR-WFD-010)
**Severity:** HIGH
**File:** `Source/Frontend/src/App.tsx:23`

Only `/workflows/:id` is registered. The routes for `/workflows` (WorkflowListPage) and `/workflows/new` (CreateWorkflowPage) are missing from App.tsx. The nav link to "Workflows" in Layout.tsx exists and links to `/workflows`, but navigating there will show a blank page.

Also, `WorkflowListPage` and `CreateWorkflowPage` are not imported in App.tsx.

#### H2: Missing Observability Metrics (FR-WFD-011)
**Severity:** HIGH
**File:** `Source/Backend/src/metrics.ts`

The spec requires `workflow_definitions_created_total` (Counter) and `workflow_definitions_active` (Gauge) metrics. Neither is present in `metrics.ts`. The current metrics only cover work item operations, not workflow definition lifecycle.

#### H3: Frontend Types Duplicated Instead of Imported from Shared (Architecture Rule Violation)
**Severity:** HIGH
**File:** `Source/Frontend/src/hooks/useWorkflows.ts:1-87`

The hooks file re-defines `FlowNode`, `FlowEdge`, `WorkflowFlowResponse`, `AssessmentRole`, `AssessmentConfig`, `RuleCondition`, `RoutingRule`, `WorkflowStage`, `Workflow`, and `CreateWorkflowRequest` as local type stubs with a TODO comment: "Reconcile with shared types once available."

These types now exist in `Source/Shared/types/workflow.ts` and should be imported. Per CLAUDE.md: "Shared types are single source of truth — no inline type re-definitions across layers." This violates the architecture rule and creates a maintenance burden where types could drift.

### MEDIUM

#### M1: Default Workflow Seed Not Called on Startup
**Severity:** MEDIUM
**File:** `Source/Backend/src/app.ts`

The dispatch plan specifies that `seedDefaultWorkflow()` should be called on app startup (in `workflowService.ts` or `app.ts`). Since there's no workflow service and no seed call in `app.ts`, the default workflow will never be created, and the "Feature Processing Pipeline" workflow will not exist for users to view.

#### M2: WorkflowStore Logger Import Inconsistency
**Severity:** MEDIUM
**File:** `Source/Backend/src/store/workflowStore.ts:9`

The store imports `{ logger } from '../utils/logger'` (named import), while other files (router.ts, assessment.ts) use `import logger from '../logger'` (default import from a different path). This could fail at runtime if the module paths differ.

#### M3: WorkflowStore Uses Dynamic `require()` for ID Generation
**Severity:** MEDIUM
**File:** `Source/Backend/src/store/workflowStore.ts:46-51`

The `updateWorkflow` function uses `const { generateId } = require('../utils/id')` — a dynamic CommonJS require inside an ES module-style codebase. This is a code smell and may cause issues with bundling or TypeScript strict mode. It should be a top-level import like in the model file.

#### M4: Diamond Node Edge Connection Logic Is a No-op
**Severity:** MEDIUM
**File:** `Source/Frontend/src/components/WorkflowFlowDiagram.tsx:224-235`

The edge rendering function has special handling for diamond nodes (router/dispatch), but the math simplifies to the same values as the default:
- `startX = source.x + source.width/2 + source.width/2` = `source.x + source.width` (same as default `sx`)
- `endX = target.x + target.width/2 - target.width/2` = `target.x` (same as default `tx`)

This means diamond nodes connect at the same points as rectangles, not at the diamond tip. For visual correctness, diamond connection points should be at the midpoints of the diamond sides.

### LOW

#### L1: Error Response Uses `body.message` Instead of `body.error`
**Severity:** LOW
**File:** `Source/Frontend/src/hooks/useWorkflows.ts:100`

The API client reads `body.message` from error responses, but the backend API pattern per CLAUDE.md uses `{error: "message"}`. Should be `body.error ?? body.message`.

#### L2: Create Form Status Mapping Uses String Literals Instead of Enums
**Severity:** LOW
**File:** `Source/Frontend/src/pages/CreateWorkflowPage.tsx:107`

The `statusMapping` field in the stage creation uses inline string literals (`'backlog'`, `'routing'`, etc.) rather than the enum values from the shared types. This is fragile if the enum values change.

#### L3: Missing `React` Import in Some Component Files
**Severity:** LOW
**Files:** `WorkflowListPage.tsx`, `WorkflowDetailPage.tsx`

These files use `React.FC` but don't have an explicit `import React from 'react'` statement. This works with the JSX transform in newer React versions but could fail in older configurations.

### INFO

#### I1: Traceability Enforcer Reports 4 Missing Requirements
```
[MISSING] FR-WFD-002 — Workflow CRUD API endpoints
[MISSING] FR-WFD-004 — Router/workflow integration
[MISSING] FR-WFD-005 — Assessment/workflow integration
[MISSING] FR-WFD-011 — Observability metrics
```

#### I2: All Existing Tests Pass
- Backend: 11 suites, 140 tests — all passing
- Frontend: 11 suites, 141 tests — all passing
- No regressions introduced by the implemented code.

#### I3: Implemented FRs Coverage
| FR | Status | Notes |
|----|--------|-------|
| FR-WFD-001 | IMPLEMENTED | Workflow model, store, shared types, seed logic |
| FR-WFD-002 | NOT IMPLEMENTED | No REST API routes |
| FR-WFD-003 | NOT IMPLEMENTED | No flow graph endpoint (no service) |
| FR-WFD-004 | NOT IMPLEMENTED | Router not integrated with workflow |
| FR-WFD-005 | NOT IMPLEMENTED | Assessment not integrated with workflow |
| FR-WFD-006 | IMPLEMENTED | workflowId added to WorkItem and CreateWorkItemRequest |
| FR-WFD-007 | IMPLEMENTED | WorkflowListPage built (but route missing from App.tsx) |
| FR-WFD-008 | IMPLEMENTED | WorkflowFlowDiagram + WorkflowDetailPage built |
| FR-WFD-009 | IMPLEMENTED | CreateWorkflowPage built (but route missing from App.tsx) |
| FR-WFD-010 | PARTIAL | Nav link exists, but App.tsx routes incomplete |
| FR-WFD-011 | NOT IMPLEMENTED | No workflow metrics |

---

## Recommendations

1. **backend-coder-2 must implement**: workflow service (`workflowService.ts`), workflow CRUD routes (`routes/workflows.ts`), flow graph endpoint, router integration, assessment integration, observability metrics, and register routes in `app.ts`
2. **frontend-coder-1 must fix**: App.tsx missing routes (`/workflows`, `/workflows/new`), imports for `WorkflowListPage` and `CreateWorkflowPage`
3. **frontend-coder-1 or frontend-coder-2 must fix**: Replace local type stubs in `useWorkflows.ts` with imports from `@shared/types/workflow` or `../../../Shared/types/workflow`
4. **backend-coder-1 should fix**: Logger import path inconsistency in workflowStore.ts, dynamic `require()` usage
