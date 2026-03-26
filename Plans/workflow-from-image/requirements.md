# Requirements: Workflow Definitions (Create a Workflow from Image)

## Verdict: APPROVED

### Functional Requirements

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-WFD-001 | Workflow data model and in-memory store | [backend] | L | Workflow type with all spec fields (stages, routingRules, assessmentConfig, teamTargets); CRUD operations on in-memory store with file persistence; seed default workflow on first startup |
| FR-WFD-002 | Workflow CRUD API endpoints | [backend] | M | POST/GET/PATCH/DELETE endpoints; list returns `{data: Workflow[]}`; cannot delete default workflow; responses follow project API patterns |
| FR-WFD-003 | Workflow flow graph endpoint | [backend] | M | GET /api/workflows/:id/flow returns nodes and edges representing the pipeline visually; nodes include position data; edges include labels for routing paths |
| FR-WFD-004 | Integrate workflow with router service | [backend] | S | Router service reads routing rules from workflow definition when workflowId is present on work item; falls back to hardcoded rules for items without workflowId |
| FR-WFD-005 | Integrate workflow with assessment service | [backend] | S | Assessment service reads pod role config from workflow definition; uses workflow's consensus rule |
| FR-WFD-006 | Add workflowId to WorkItem | [shared] | S | WorkItem type gets optional workflowId field; CreateWorkItemRequest gets optional workflowId; defaults to default workflow ID |
| FR-WFD-007 | Workflow list page | [frontend] | M | Table/card list of workflows showing name, description, stage count, default badge, active status; click to navigate to detail; create button |
| FR-WFD-008 | Workflow detail page with visual flow diagram | [frontend] | L | SVG flow diagram rendering pipeline stages as positioned nodes with connecting arrows; fast-track shown as bypass path; assessment pod shown as circle with role nodes; configuration panel below diagram |
| FR-WFD-009 | Create workflow page | [frontend] | M | Form with name, description; stage configuration; routing rules builder; assessment config; team target selection; submit creates and navigates to detail |
| FR-WFD-010 | Navigation updates | [frontend] | S | Add "Workflows" link to Layout navigation; update App.tsx with workflow routes |
| FR-WFD-011 | Observability for workflows | [backend] | S | Structured logging for workflow CRUD; Prometheus metrics for workflows created and active count |

### Scoping Plan

**Backend: 4 + 2 + 2 + 1 + 1 + 1 = 11 points → 2 coders**
**Frontend: 2 + 4 + 2 + 1 = 9 points → 2 coders**
**Shared: 1 point → handled by backend-coder-1 (per CLAUDE.md: backend-coder may update shared if no api-contract agent)**

### Assignment

**Backend:**
- Backend Coder 1: FR-WFD-001 [L], FR-WFD-006 [S] (5 pts) — Workflow model, store, seed logic, shared type updates
- Backend Coder 2: FR-WFD-002 [M], FR-WFD-003 [M], FR-WFD-004 [S], FR-WFD-005 [S], FR-WFD-011 [S] (7 pts) — API endpoints, flow graph, service integration, observability

**Frontend:**
- Frontend Coder 1: FR-WFD-008 [L], FR-WFD-010 [S] (5 pts) — Visual flow diagram component, workflow detail page, navigation
- Frontend Coder 2: FR-WFD-007 [M], FR-WFD-009 [M] (4 pts) — Workflow list page, create workflow page
