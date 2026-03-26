# Visual QA Report: Workflow Definitions (Create a Workflow from Image)

**Role:** visual (visual-playwright)
**Date:** 2026-03-26
**RISK_LEVEL: medium**

## Summary

Reviewed the implementation against specifications, design, dispatch plan, and reference image. Frontend unit tests pass (141/141). Backend tests fail universally (11/11) due to `@shared/types/workflow` module resolution issue. Several CRITICAL and HIGH findings related to missing backend API endpoints, missing frontend routes, and type duplication.

## Findings

### CRITICAL

#### C1: Backend tests all fail — `@shared/types/workflow` module resolution broken
- **Severity:** CRITICAL
- **Files:** All 11 backend test files
- **Detail:** Every backend test file fails with `Error: Cannot find package '@shared/types/workflow'`. The `@shared` path alias is not configured for the test runner (vitest). This blocks all backend testing.
- **Spec:** Violates testing rules — zero new failures required.

#### C2: Missing Workflow CRUD API routes and service (FR-WFD-002, FR-WFD-003)
- **Severity:** CRITICAL
- **Files:** `Source/Backend/src/routes/workflows.ts` (does not exist), `Source/Backend/src/services/workflowService.ts` (does not exist)
- **Detail:** The dispatch plan assigns backend-coder-2 to build `POST/GET/PATCH/DELETE /api/workflows` endpoints, `GET /api/workflows/:id/flow` endpoint, and the workflow service with flow graph generation. These files are entirely missing. The `app.ts` does not register any `/api/workflows` router. Without these, all frontend pages will fail at runtime — list, detail, and create pages all call `/api/workflows` endpoints.
- **Spec:** FR-WFD-002 (Workflow CRUD API), FR-WFD-003 (flow graph endpoint) — unimplemented.

#### C3: Missing frontend routes for `/workflows` and `/workflows/new` (FR-WFD-010)
- **Severity:** CRITICAL
- **Files:** `Source/Frontend/src/App.tsx`
- **Detail:** `App.tsx` only registers `<Route path="/workflows/:id" element={<WorkflowDetailPage />} />`. The routes for `/workflows` (WorkflowListPage) and `/workflows/new` (CreateWorkflowPage) are missing. The components exist but are not imported or routed. Users cannot reach the workflow list or create pages via navigation.
- **Spec:** FR-WFD-010 — "Add `/workflows`, `/workflows/new`, `/workflows/:id` routes"

### HIGH

#### H1: Frontend types duplicated — not using shared types (Architecture violation)
- **Severity:** HIGH
- **Files:** `Source/Frontend/src/hooks/useWorkflows.ts`
- **Detail:** The hooks file defines its own `FlowNode`, `FlowEdge`, `WorkflowFlowResponse`, `AssessmentRole`, `AssessmentConfig`, `RuleCondition`, `RoutingRule`, `WorkflowStage`, `Workflow`, `CreateWorkflowRequest` types locally rather than importing from `Source/Shared/types/workflow.ts`. The TODO comment says "Reconcile with shared types once available" but the shared types ARE available and complete. This violates the architecture rule: "Shared types are single source of truth — no inline type re-definitions across layers."
- **Spec:** CLAUDE.md architecture rule.

#### H2: Missing router/assessment workflow integration (FR-WFD-004, FR-WFD-005)
- **Severity:** HIGH
- **Files:** `Source/Backend/src/services/router.ts`, `Source/Backend/src/services/assessment.ts`
- **Detail:** The dispatch plan assigns backend-coder-2 to add `routeWithWorkflow()` and `assessWithWorkflow()` functions that read rules from workflow definitions. These integrations are not implemented. The existing services still use hardcoded logic only.
- **Spec:** FR-WFD-004, FR-WFD-005.

#### H3: Missing observability metrics (FR-WFD-011)
- **Severity:** HIGH
- **Files:** `Source/Backend/src/metrics.ts`
- **Detail:** The spec requires `workflow_definitions_created_total` counter and `workflow_definitions_active` gauge. These have not been added.
- **Spec:** FR-WFD-011.

### MEDIUM

#### M1: WorkflowFlowDiagram edge routing for diamond nodes is a no-op
- **Severity:** MEDIUM
- **Files:** `Source/Frontend/src/components/WorkflowFlowDiagram.tsx:224-235`
- **Detail:** The edge rendering code has special cases for diamond source/target nodes (router/dispatch), but the calculation results in the same value as the default. For source diamonds: `startX = source.x + source.width / 2 + source.width / 2` = `source.x + source.width` which equals `sx`. For target diamonds: `endX = target.x + target.width / 2 - target.width / 2` = `target.x` which equals `tx`. The special-casing is dead code.

#### M2: Navigation "Workflows" link uses exact match only
- **Severity:** MEDIUM
- **Files:** `Source/Frontend/src/components/Layout.tsx:38`
- **Detail:** The nav link highlights when `location.pathname === item.path`, meaning `/workflows` will be highlighted only on exact match. `/workflows/123` or `/workflows/new` won't highlight the Workflows nav item. Should use `startsWith` for Workflows section.

#### M3: CreateWorkflowPage missing `id` field on stages sent to API
- **Severity:** MEDIUM
- **Files:** `Source/Frontend/src/pages/CreateWorkflowPage.tsx:100-108`
- **Detail:** The stage objects built in `handleSubmit` don't include `id` fields. The `CreateWorkflowRequest` type uses `Omit<WorkflowStage, 'id'>[]` so this is technically correct, but the local type stubs may diverge from the shared types. This is coupled to H1 (type duplication).

### LOW

#### L1: Reference image shows "Dashboard" node at top (not implemented in flow)
- **Severity:** LOW
- **Detail:** The reference image shows a "Dashboard" node at the top of the diagram (showing views of work items, queues, work being done, etc.). This is not represented in the flow diagram spec or implementation. This appears to be informational in the reference image rather than a pipeline stage, so this is acceptable for v1.

#### L2: `useWorkflows` hook API client doesn't use existing `api/client.ts`
- **Severity:** LOW
- **Files:** `Source/Frontend/src/hooks/useWorkflows.ts:93-104`
- **Detail:** The hooks file implements its own `request()` function instead of using the existing API client at `Source/Frontend/src/api/client.ts`. This creates a second HTTP abstraction. The error response parsing (`body.message`) may not match the backend error format (`body.error` per CLAUDE.md API patterns).

### INFO

#### I1: Frontend tests all pass (141/141)
- **Detail:** All 11 frontend test files pass, including the new workflow-related test files. Tests cover loading, error, empty states, table rendering, form validation, and submission.

#### I2: Traceability comments present throughout
- **Detail:** All implementation files have `// Verifies: FR-WFD-XXX` traceability comments linking to requirements. Good coverage.

#### I3: Reference image compliance
- **Detail:** Reviewing against the reference image, the SVG flow diagram implementation correctly represents:
  - Input sources (Browser, Zendesk, Manual, Automated) as left-side nodes
  - Work Backlog as queue node
  - Work Router as diamond decision node
  - Assessment Pod as circle containing role nodes (Pod Lead, Requirements Reviewer, Domain Expert, Work Definer)
  - Fast-track bypass path (dashed line)
  - Full-review path through assessment
  - Worklist (Approved Work)
  - Team Dispatch diamond leading to team nodes (TheATeam, TheFixer)

## Verification Gates

| Gate | Result |
|------|--------|
| Frontend tests | PASS (141/141) |
| Backend tests | FAIL (0/0 — all 11 files fail to load) |
| TypeScript compile | Could not run (tsc not directly available) |
| Traceability enforcer | Could not run (Plans/ path issue) |

## Recommendations

1. **MUST FIX (C1):** Fix backend `@shared` path alias in vitest/test configuration
2. **MUST FIX (C2):** Implement workflow CRUD routes and service (backend-coder-2 work)
3. **MUST FIX (C3):** Add missing `/workflows` and `/workflows/new` routes to App.tsx, import WorkflowListPage and CreateWorkflowPage
4. **SHOULD FIX (H1):** Replace local type stubs in `useWorkflows.ts` with imports from `@shared/types/workflow` (or the correct import path for the frontend)
5. **SHOULD FIX (H2):** Implement workflow-aware routing and assessment
6. **SHOULD FIX (H3):** Add Prometheus metrics for workflows
