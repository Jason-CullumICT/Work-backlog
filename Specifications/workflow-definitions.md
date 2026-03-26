# Specification: Workflow Definitions (Create a Workflow from Image)

## Overview

Extends the existing workflow engine to make **Workflow** a first-class configurable domain entity. Currently the work item pipeline (intake → routing → assessment → dispatch) is hardcoded in service logic. This feature introduces a `Workflow` model that captures the pipeline definition — stages, routing rules, assessment pod configuration, and team dispatch — so users can create, view, and manage workflow definitions. A visual flow diagram renders the workflow on the frontend, matching the reference image pattern.

Work items are associated with a workflow and processed through its stages. The system ships with a **Default Workflow** pre-seeded from the reference image pattern (inputs → backlog → router → fast-track/full-review → assessment pod → approved worklist → team dispatch).

## Reference Image Interpretation

The reference image (`GenericWorkflow.png`) shows:

```
[Inputs: Browser, Zendesk, Manual/Backfield, Automated/Events]
        ↓
  [Work Backlog] — docID/Title/Description/Type, with change history
        ↓
  <Work Router> — diamond decision point
   /          \
fast-track    full-review
  ↓              ↓
  |        [Proposed Work]
  |              ↓
  |        (Assessment Pod)
  |         - Pod Lead
  |         - Requirements Reviewer
  |         - Domain Expert
  |         - Work Definer
  |              ↓
  |        <Reviewed Work>
  |         approve / reject
  ↓              ↓
 [Worklist — Approved Work]
        ↓
  <Team Dispatch>
   /          \
TheATeam    TheFixer
```

Key rules from the image:
- All items are simple docID/Title/Description/Type objects with change history
- Any agent can change type/queue of an item
- New items can only be created into the work backlog
- Fast-track path bypasses assessment for trivial bugs and small improvements
- Assessment pod adds clarity and detail before implementation

## Domain Model

### Workflow

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `name` | string | Human-readable name (e.g., "Feature Processing Pipeline") |
| `description` | string | What this workflow does |
| `stages` | WorkflowStage[] | Ordered list of pipeline stages |
| `routingRules` | RoutingRule[] | Rules for the router stage |
| `assessmentConfig` | AssessmentConfig | Pod roles and consensus rules |
| `teamTargets` | string[] | Valid team names for dispatch (e.g., ["TheATeam", "TheFixer"]) |
| `isDefault` | boolean | Whether this is the system default workflow |
| `isActive` | boolean | Whether new items can use this workflow |
| `createdAt` | string (datetime) | When created |
| `updatedAt` | string (datetime) | Last modified |

### WorkflowStage

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique stage identifier (e.g., "intake", "routing", "assessment", "dispatch") |
| `name` | string | Display name |
| `type` | enum | `intake`, `queue`, `router`, `assessment`, `worklist`, `dispatch` |
| `order` | number | Position in the pipeline (0-based) |
| `description` | string | What happens at this stage |
| `statusMapping` | WorkItemStatus | Which work item status corresponds to this stage |

### RoutingRule

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Rule identifier |
| `name` | string | Rule display name (e.g., "Fast-track trivial bugs") |
| `path` | enum | `fast-track` or `full-review` |
| `conditions` | RuleCondition[] | Conditions to match (AND logic) |
| `priority` | number | Evaluation order (lower = first) |

### RuleCondition

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Work item field to check (e.g., "type", "complexity") |
| `operator` | enum | `equals`, `in`, `not-equals`, `not-in` |
| `value` | string or string[] | Value(s) to match |

### AssessmentConfig

| Field | Type | Description |
|-------|------|-------------|
| `roles` | AssessmentRole[] | Pod roles (pod-lead, requirements-reviewer, etc.) |
| `consensusRule` | enum | `all-approve`, `majority-approve`, `lead-decides` |

### AssessmentRole

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Role identifier |
| `name` | string | Display name |
| `description` | string | What this role evaluates |

## Changes to WorkItem

Add a `workflowId` field:

| Field | Type | Description |
|-------|------|-------------|
| `workflowId` | string (optional) | ID of the workflow this item follows. Defaults to the default workflow. |

## API Endpoints

### Workflows CRUD
- `POST /api/workflows` — Create a new workflow definition
- `GET /api/workflows` — List all workflows (`{data: Workflow[]}`)
- `GET /api/workflows/:id` — Get single workflow with full configuration
- `PATCH /api/workflows/:id` — Update workflow fields
- `DELETE /api/workflows/:id` — Soft delete workflow (cannot delete default)

### Workflow Visualization
- `GET /api/workflows/:id/flow` — Returns workflow as a structured flow graph (nodes + edges) for frontend rendering

### Seed Data
- On first startup, seed a "Default Workflow" matching the reference image pipeline

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/workflows` | `WorkflowListPage` | List of all workflow definitions |
| `/workflows/:id` | `WorkflowDetailPage` | Visual flow diagram + configuration details |
| `/workflows/new` | `CreateWorkflowPage` | Form to create a new workflow definition |

### Visual Flow Diagram

The `WorkflowDetailPage` renders an interactive flow diagram showing:
- Input sources as left-side entry nodes
- Work Backlog as a queue node
- Work Router as a diamond decision node
- Fast-track path as a direct arrow to worklist
- Assessment Pod as a circle containing pod role nodes
- Worklist as a collection node
- Team Dispatch as a final diamond leading to team nodes

This is rendered with CSS/SVG — no external diagramming libraries required for v1. Uses a `WorkflowFlowDiagram` component that takes the workflow's stages and renders them as positioned nodes with connecting arrows.

## Non-Functional Requirements
- Workflow definitions are persisted in the same in-memory + file store pattern
- Default workflow cannot be deleted
- Existing work items without a workflowId use the default workflow
- The router service and assessment service should read rules from the workflow definition (not hardcoded)
- Structured logging for workflow CRUD operations
- Prometheus metrics: `workflow_definitions_created_total`, `workflow_definitions_active`
