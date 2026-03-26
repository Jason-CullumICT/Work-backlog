# Dispatch Plan: Workflow Definitions (Create a Workflow from Image)

## Task Summary

Add Workflow as a first-class domain entity to the existing workflow engine. Users can create, view, and manage workflow definitions that describe processing pipelines (intake → routing → assessment → dispatch). A visual SVG flow diagram renders the workflow on the frontend matching the reference image pattern. Work items are associated with workflows. Ships with a pre-seeded default workflow.

## RISK_LEVEL: medium

Rationale: New feature adding new pages and endpoints. Extends existing models and services. Estimated 15-18 new/modified files across backend and frontend. No schema migration (in-memory store). No auth/security changes.

## Specification

- `Specifications/workflow-definitions.md` — Full domain model, API endpoints, visualization spec

## Plans

- `Plans/workflow-from-image/prompt.md` — Original feature request context
- `Plans/workflow-from-image/design.md` — Architecture, API shapes, frontend pages, trade-offs
- `Plans/workflow-from-image/requirements.md` — FR table with scoping and assignments

## Reference Image

- `/workspace/.attachments/GenericWorkflow.png` — Visual workflow diagram to replicate

---

## Stage 1: Shared Types Update

Handled by backend-coder-1 as part of their task (per CLAUDE.md module ownership: backend-coder may update Shared if no api-contract agent).

---

## Stage 2: Implementation (Parallel)

### backend-coder-1

**FRs:** FR-WFD-001 [L], FR-WFD-006 [S] — Workflow data model, store, seed logic, shared type updates

**Task:** Build the Workflow foundational data layer and update shared types.

- **Shared Types** (`Source/Shared/types/workflow.ts`):
  - Add `Workflow`, `WorkflowStage`, `RoutingRule`, `RuleCondition`, `AssessmentConfig`, `AssessmentRole` interfaces
  - Add `StageType` enum: `intake`, `queue`, `router`, `assessment`, `worklist`, `dispatch`
  - Add `RuleOperator` enum: `equals`, `in`, `not-equals`, `not-in`
  - Add `ConsensusRule` enum: `all-approve`, `majority-approve`, `lead-decides`
  - Add `CreateWorkflowRequest`, `UpdateWorkflowRequest` types
  - Add `WorkflowFlowResponse`, `FlowNode`, `FlowEdge` types for flow graph
  - Add optional `workflowId: string` to `WorkItem` interface
  - Add optional `workflowId: string` to `CreateWorkItemRequest`

- **Workflow Model** (`Source/Backend/src/models/Workflow.ts`):
  - `buildWorkflow(data: CreateWorkflowRequest): Workflow` — creates workflow with UUID, timestamps
  - Validation helpers for stages, routing rules
  - Default workflow factory: `buildDefaultWorkflow(): Workflow` — creates the reference image pipeline

- **Workflow Store** (`Source/Backend/src/store/workflowStore.ts`):
  - In-memory Map<string, Workflow> with JSON file persistence (same pattern as workItemStore)
  - CRUD: `create`, `findById`, `findAll`, `update`, `softDelete`
  - `findDefault()` — returns the workflow with `isDefault: true`
  - `seedDefaultWorkflow()` — creates default if none exists (called on startup)
  - Prevent deletion of default workflow

- **Tests:**
  - `Source/Backend/tests/store/workflowStore.test.ts` — all store operations
  - `Source/Backend/tests/models/Workflow.test.ts` — model builders and validation

**Files:** `Source/Shared/types/workflow.ts`, `Source/Backend/src/models/Workflow.ts`, `Source/Backend/src/store/workflowStore.ts`, `Source/Backend/tests/`

**Read first:**
- `Specifications/workflow-definitions.md`
- `Plans/workflow-from-image/design.md`
- `Plans/workflow-from-image/requirements.md`
- `Source/Shared/types/workflow.ts` (existing shared types to extend)
- `Source/Backend/src/store/workItemStore.ts` (follow same store pattern)
- `Source/Backend/src/models/WorkItem.ts` (follow same model pattern)
- `CLAUDE.md`

---

### backend-coder-2

**FRs:** FR-WFD-002 [M], FR-WFD-003 [M], FR-WFD-004 [S], FR-WFD-005 [S], FR-WFD-011 [S] — Workflow API, flow graph, service integration, observability

**Task:** Build the Workflow REST API, flow graph generation, integrate with existing router/assessment services, and add observability.

- **Workflow Service** (`Source/Backend/src/services/workflowService.ts`):
  - CRUD operations calling workflow store
  - `generateFlowGraph(workflow: Workflow): WorkflowFlowResponse` — converts workflow stages into positioned nodes and edges for SVG rendering:
    - Input source nodes at x=0 column
    - Work Backlog queue at x=1
    - Router diamond at x=2
    - Assessment Pod circle at x=3 (with child role nodes)
    - Worklist at x=4
    - Team Dispatch at x=5
    - Team target nodes at x=6
    - Fast-track edge from router to worklist (dashed, labeled "fast-track")
    - Full-review edge from router to assessment (solid, labeled "full-review")
  - Call `seedDefaultWorkflow()` on module load / app startup

- **Workflow Routes** (`Source/Backend/src/routes/workflows.ts`):
  - `POST /api/workflows` — create workflow
  - `GET /api/workflows` — list all workflows (`{data: Workflow[]}`)
  - `GET /api/workflows/:id` — get single workflow
  - `PATCH /api/workflows/:id` — update workflow
  - `DELETE /api/workflows/:id` — soft delete (block default, return 204)
  - `GET /api/workflows/:id/flow` — flow graph response

- **Router Integration** (`Source/Backend/src/services/router.ts`):
  - Add `routeWithWorkflow(item, workflow)` that evaluates workflow's `routingRules` instead of hardcoded logic
  - Existing `routeWorkItem` falls back to default workflow if item has no workflowId

- **Assessment Integration** (`Source/Backend/src/services/assessment.ts`):
  - Add `assessWithWorkflow(item, workflow)` that uses workflow's `assessmentConfig` roles and consensus rule
  - Existing assessment falls back to default workflow config

- **App Registration** (`Source/Backend/src/app.ts`):
  - Add `app.use('/api/workflows', workflowsRouter)`
  - Call seed on startup

- **Observability** (`Source/Backend/src/metrics.ts`):
  - Add `workflow_definitions_created_total` counter
  - Add `workflow_definitions_active` gauge

- **Tests:**
  - `Source/Backend/tests/routes/workflows.test.ts` — all endpoint tests
  - `Source/Backend/tests/services/workflowService.test.ts` — service logic, flow graph generation
  - Update existing router/assessment tests for workflow integration

**Files:** `Source/Backend/src/services/workflowService.ts`, `Source/Backend/src/routes/workflows.ts`, `Source/Backend/src/services/router.ts`, `Source/Backend/src/services/assessment.ts`, `Source/Backend/src/app.ts`, `Source/Backend/src/metrics.ts`, `Source/Backend/tests/`

**Read first:**
- `Specifications/workflow-definitions.md`
- `Plans/workflow-from-image/design.md`
- `Plans/workflow-from-image/requirements.md`
- `Source/Backend/src/services/router.ts` (existing router to extend)
- `Source/Backend/src/services/assessment.ts` (existing assessment to extend)
- `Source/Backend/src/routes/workItems.ts` (follow same route patterns)
- `Source/Backend/src/app.ts` (register new routes)
- `Source/Backend/src/metrics.ts` (add new metrics)
- `CLAUDE.md`

**IMPORTANT:** backend-coder-1 is updating `Source/Shared/types/workflow.ts` concurrently. If types are not yet available, define local type stubs and note that they should be reconciled. Coordinate via the shared type file.

---

### frontend-coder-1

**FRs:** FR-WFD-008 [L], FR-WFD-010 [S] — Visual flow diagram component, workflow detail page, navigation updates

**Task:** Build the visual flow diagram component and workflow detail page. Update navigation.

- **WorkflowFlowDiagram Component** (`Source/Frontend/src/components/WorkflowFlowDiagram.tsx`):
  - Takes `nodes: FlowNode[]` and `edges: FlowEdge[]` props
  - Renders SVG with:
    - **Input nodes**: Rounded rectangles on left (type: 'input') for Browser, Zendesk, Manual, Automated
    - **Queue node**: Rectangle with stacked items icon (type: 'queue') for Work Backlog
    - **Router node**: Diamond shape (type: 'router') for Work Router
    - **Assessment Pod**: Large circle (type: 'assessment-pod') containing smaller circles for each role
    - **Assessment roles**: Small circles (type: 'assessment-role') inside the pod circle
    - **Worklist node**: Rectangle (type: 'worklist') for Approved Work
    - **Dispatch node**: Diamond (type: 'dispatch') for Team Dispatch
    - **Team nodes**: Circles (type: 'team') for TheATeam, TheFixer
    - **Edges**: SVG path elements between nodes. Dashed for fast-track, solid for full-review
    - **Labels**: Text on edges and nodes
  - Responsive: scales to container width, uses viewBox
  - Color scheme: use neutral/professional colors (light gray backgrounds, dark text, colored accents for status)

- **WorkflowDetailPage** (`Source/Frontend/src/pages/WorkflowDetailPage.tsx`):
  - Route: `/workflows/:id`
  - Header: workflow name, description, default/active badges
  - Main content: `WorkflowFlowDiagram` component showing the flow
  - Configuration panel below:
    - Routing Rules: table showing conditions → path
    - Assessment Config: pod roles list, consensus rule
    - Team Targets: list of target teams
  - Work item stats: count of items currently in this workflow by status

- **useWorkflows Hook** (`Source/Frontend/src/hooks/useWorkflows.ts`):
  - `useWorkflows()` — fetch all workflows
  - `useWorkflow(id)` — fetch single workflow
  - `useWorkflowFlow(id)` — fetch flow graph for visualization
  - `useCreateWorkflow()` — mutation to create workflow

- **Navigation** (`Source/Frontend/src/components/Layout.tsx`):
  - Add "Workflows" nav link to sidebar/header nav

- **App Routes** (`Source/Frontend/src/App.tsx`):
  - Add `/workflows`, `/workflows/new`, `/workflows/:id` routes

- **Tests:**
  - `Source/Frontend/tests/components/WorkflowFlowDiagram.test.tsx`
  - `Source/Frontend/tests/pages/WorkflowDetailPage.test.tsx`

**Files:** `Source/Frontend/src/components/WorkflowFlowDiagram.tsx`, `Source/Frontend/src/pages/WorkflowDetailPage.tsx`, `Source/Frontend/src/hooks/useWorkflows.ts`, `Source/Frontend/src/components/Layout.tsx`, `Source/Frontend/src/App.tsx`, `Source/Frontend/tests/`

**Read first:**
- `Specifications/workflow-definitions.md`
- `Plans/workflow-from-image/design.md`
- `Plans/workflow-from-image/requirements.md`
- `/workspace/.attachments/GenericWorkflow.png` (reference image to replicate visually)
- `Source/Shared/types/workflow.ts` (shared types)
- `Source/Frontend/src/components/Layout.tsx` (existing navigation to extend)
- `Source/Frontend/src/App.tsx` (existing routes to extend)
- `Source/Frontend/src/pages/DashboardPage.tsx` (follow existing page patterns)
- `Source/Frontend/src/hooks/useWorkItems.ts` (follow existing hook patterns)
- `Source/Frontend/src/api/client.ts` (existing API client)
- `CLAUDE.md`

---

### frontend-coder-2

**FRs:** FR-WFD-007 [M], FR-WFD-009 [M] — Workflow list page, create workflow page

**Task:** Build the workflow list and creation pages.

- **WorkflowListPage** (`Source/Frontend/src/pages/WorkflowListPage.tsx`):
  - Route: `/workflows`
  - Table/card list showing each workflow:
    - Name, description (truncated)
    - Stage count
    - Default badge (if isDefault)
    - Active/Inactive status indicator
    - Updated timestamp
  - Click row/card to navigate to `/workflows/:id`
  - "Create Workflow" button linking to `/workflows/new`
  - Loading and empty states

- **CreateWorkflowPage** (`Source/Frontend/src/pages/CreateWorkflowPage.tsx`):
  - Route: `/workflows/new`
  - Form sections:
    - **Basic Info**: name (required), description (textarea, required)
    - **Stages**: Checklist/reorderable list of stage types (intake, queue, router, assessment, worklist, dispatch) — all pre-checked by default matching the default workflow pattern
    - **Routing Rules**: Add rules with condition builder:
      - Field selector (type, complexity)
      - Operator selector (equals, in)
      - Value selector (depends on field — e.g., type values or complexity values)
      - Path selector (fast-track / full-review)
      - Priority (number)
    - **Assessment Config**:
      - Role list with add/remove (default: pod-lead, requirements-reviewer, domain-expert, work-definer)
      - Consensus rule selector (all-approve, majority-approve, lead-decides)
    - **Team Targets**: Checkbox list (TheATeam, TheFixer)
  - Submit: calls POST /api/workflows, navigates to detail page on success
  - Validation: name and description required, at least one stage, at least one team target

- **Tests:**
  - `Source/Frontend/tests/pages/WorkflowListPage.test.tsx` (new file or update if exists)
  - `Source/Frontend/tests/pages/CreateWorkflowPage.test.tsx`

**Files:** `Source/Frontend/src/pages/WorkflowListPage.tsx`, `Source/Frontend/src/pages/CreateWorkflowPage.tsx`, `Source/Frontend/tests/`

**Read first:**
- `Specifications/workflow-definitions.md`
- `Plans/workflow-from-image/design.md`
- `Plans/workflow-from-image/requirements.md`
- `Source/Shared/types/workflow.ts` (shared types)
- `Source/Frontend/src/pages/WorkItemListPage.tsx` (follow existing list page pattern)
- `Source/Frontend/src/pages/CreateWorkItemPage.tsx` (follow existing create page pattern)
- `Source/Frontend/src/hooks/useWorkflows.ts` (hooks — built by frontend-coder-1)
- `Source/Frontend/src/api/client.ts` (API client)
- `CLAUDE.md`

**IMPORTANT:** frontend-coder-1 is building `useWorkflows.ts` concurrently. If the hook file is not yet available, create the hooks inline or in a local file and note for reconciliation.

---

## Stage 3: QA & Review

Standard TheATeam Stage 4 pipeline — all QA agents run against the implemented code:
- chaos-tester
- security-qa
- traceability-reporter
- visual-playwright
- qa-review-and-tests
- design-critic
- integration-reviewer
