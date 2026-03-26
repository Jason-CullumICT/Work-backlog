# Design: Workflow Definitions (Create a Workflow from Image)

## Approach

Add a `Workflow` domain entity to the existing workflow engine. This makes the currently-hardcoded pipeline configurable. A workflow definition captures stages, routing rules, assessment pod configuration, and team targets. The frontend gets a new section for viewing workflows as visual flow diagrams and creating new workflow definitions.

## Architecture Changes

### Backend

```
Source/Backend/src/
  models/Workflow.ts          ← NEW: Workflow entity builder + helpers
  store/workflowStore.ts      ← NEW: In-memory store with file persistence
  services/workflowService.ts ← NEW: CRUD + flow graph generation + seed logic
  routes/workflows.ts         ← NEW: REST endpoints for workflows

  services/router.ts          ← MODIFIED: Read routing rules from workflow definition
  services/assessment.ts      ← MODIFIED: Read pod config from workflow definition
  store/workItemStore.ts      ← MODIFIED: Support workflowId field
```

### Frontend

```
Source/Frontend/src/
  pages/WorkflowListPage.tsx      ← NEW: List all workflows
  pages/WorkflowDetailPage.tsx    ← NEW: Visual flow diagram + config
  pages/CreateWorkflowPage.tsx    ← NEW: Form to create workflow
  components/WorkflowFlowDiagram.tsx ← NEW: SVG flow diagram renderer
  hooks/useWorkflows.ts           ← NEW: API hooks for workflows
  App.tsx                         ← MODIFIED: Add workflow routes
```

### Shared Types

```
Source/Shared/types/workflow.ts   ← MODIFIED: Add Workflow types, workflowId to WorkItem
```

## Trade-offs

### Flow Diagram Rendering
- **Chosen: Custom SVG/CSS components** — lightweight, no external dependencies
- Alternative: React Flow or D3.js — powerful but heavy dependency for v1
- Rationale: The flow diagram is read-only and follows a fixed pipeline layout (left-to-right). Simple positioned SVG nodes with arrows are sufficient.

### Routing Rule Engine
- **Chosen: Workflow-backed rules with fallback to hardcoded defaults** — backwards compatible
- Alternative: Full rule engine with expression parser — overkill for v1
- Rationale: The existing hardcoded logic works. We layer workflow-defined rules on top, falling back to defaults if no workflow-specific rules exist.

### Workflow Configuration Editing
- **Chosen: Form-based creation with predefined stage types** — predictable, validated
- Alternative: Visual drag-and-drop editor — much higher complexity
- Rationale: v1 focuses on workflow definition and visualization, not visual editing

## API Shape

### Workflows CRUD
```
POST   /api/workflows           → Workflow
GET    /api/workflows            → { data: Workflow[] }
GET    /api/workflows/:id        → Workflow
PATCH  /api/workflows/:id        → Workflow
DELETE /api/workflows/:id        → 204 No Content
```

### Flow Graph (for visualization)
```
GET    /api/workflows/:id/flow   → WorkflowFlowResponse
```

Response shape:
```typescript
interface WorkflowFlowResponse {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface FlowNode {
  id: string;
  type: 'input' | 'queue' | 'router' | 'assessment-pod' | 'assessment-role' | 'worklist' | 'dispatch' | 'team';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: 'solid' | 'dashed';
}
```

## Frontend Pages

### WorkflowListPage (`/workflows`)
- Table/card list of all workflow definitions
- Shows name, description, stage count, isDefault badge, isActive status
- Click to navigate to detail page
- "Create Workflow" button linking to `/workflows/new`

### WorkflowDetailPage (`/workflows/:id`)
- Header: name, description, default/active badges
- **Visual Flow Diagram**: SVG rendering of the pipeline stages:
  - Input sources (left) → Work Backlog → Router → Assessment Pod → Worklist → Team Dispatch
  - Fast-track path shown as dashed bypass arrow
  - Pod roles rendered inside assessment circle
  - Team targets rendered as final nodes
- Configuration panel below: routing rules, assessment config, team targets
- Work items currently in this workflow (count by status)

### CreateWorkflowPage (`/workflows/new`)
- Form: name, description
- Stage builder: add/reorder stages from predefined types
- Routing rules: add conditions (field + operator + value → path)
- Assessment config: select pod roles, consensus rule
- Team targets: select from available teams (TheATeam, TheFixer)
- Submit creates workflow and navigates to detail page

## Default Workflow Seed

On startup, if no workflows exist, seed one matching the reference image:

```
Name: "Feature Processing Pipeline"
Stages:
  0: intake (Input Sources)
  1: queue (Work Backlog)
  2: router (Work Router)
  3: assessment (Assessment Pod)
  4: worklist (Approved Work)
  5: dispatch (Team Dispatch)
Routing Rules:
  - Bug + trivial/small → fast-track
  - Improvement + trivial/small → fast-track
  - Feature → full-review
  - Issue → full-review
  - Default → full-review
Assessment Config:
  Roles: pod-lead, requirements-reviewer, domain-expert, work-definer
  Consensus: all-approve
Team Targets: TheATeam, TheFixer
```

## Key Implementation Notes

- Workflow store uses same pattern as workItemStore (in-memory Map + JSON file)
- WorkItem gets optional `workflowId` — existing items without it use default workflow
- Router service gains a `routeWithWorkflow(item, workflow)` variant that reads rules from workflow definition
- Assessment service gains `assessWithWorkflow(item, workflow)` variant that uses workflow's pod config
- Navigation: add "Workflows" link to the Layout sidebar/nav
- Tests trace to FR-WFD-xxx requirements
