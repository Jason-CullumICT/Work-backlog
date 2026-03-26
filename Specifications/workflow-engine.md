# Specification: Self-Judging Workflow Engine

## Overview

A workflow engine that manages work items (features, bugs, issues) through an intake-to-delivery pipeline. Work enters from multiple sources, gets classified by a router, optionally passes through an assessment pod for enrichment and review, and is dispatched to existing implementation teams (TheATeam or TheFixer).

## Domain Model

### Work Item

The central entity. A simple object with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `docId` | string | Human-readable document ID (e.g., `WI-001`) |
| `title` | string | Short summary |
| `description` | string | Full description of the work |
| `type` | enum | `feature`, `bug`, `issue`, `improvement` |
| `status` | enum | See Status Lifecycle below |
| `priority` | enum | `critical`, `high`, `medium`, `low` |
| `source` | enum | `browser`, `zendesk`, `manual`, `automated` |
| `complexity` | enum | `trivial`, `small`, `medium`, `large`, `complex` (set by router or assessment) |
| `route` | enum | `fast-track`, `full-review` (set by router) |
| `assignedTeam` | string | `TheATeam` or `TheFixer` (set after review) |
| `changeHistory` | array | Chronological log of all state changes |
| `assessments` | array | Assessment records from pod agents |
| `createdAt` | datetime | When item was created |
| `updatedAt` | datetime | Last modification |

### Status Lifecycle

```
backlog → routing → [fast-track → approved]
                   → [proposed → reviewing → approved/rejected]
approved → in-progress → completed
                       → failed → backlog (re-queue)
```

| Status | Description |
|--------|-------------|
| `backlog` | Newly created, awaiting routing |
| `routing` | Being classified by the work router |
| `proposed` | Sent to assessment pod for full review |
| `reviewing` | Assessment pod is actively evaluating |
| `approved` | Passed review (or fast-tracked), ready for implementation |
| `rejected` | Failed assessment — returned with feedback |
| `in-progress` | Dispatched to an implementation team |
| `completed` | Successfully implemented |
| `failed` | Implementation failed — can be re-queued |

### Change History Entry

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | datetime | When the change occurred |
| `agent` | string | Who made the change (user, system, agent name) |
| `field` | string | Which field changed |
| `oldValue` | any | Previous value |
| `newValue` | any | New value |
| `reason` | string | Optional reason for change |

### Assessment Record

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | Assessment agent role (e.g., `pod-lead`, `requirements-reviewer`, `domain-expert`) |
| `verdict` | enum | `approve`, `reject`, `needs-clarification` |
| `notes` | string | Detailed assessment feedback |
| `suggestedChanges` | array | Specific modifications recommended |
| `timestamp` | datetime | When assessment was made |

## Work Routing Rules

The Work Router classifies incoming work items and determines their path:

### Fast-Track Criteria (ANY of these)
- Type is `bug` AND complexity is `trivial` or `small`
- Type is `improvement` AND estimated change is < 3 files
- Item is explicitly flagged as `fast-track` by submitter

### Full-Review Criteria (DEFAULT)
- All `feature` type items
- All `bug` items with complexity `medium` or higher
- All `issue` type items
- Any item not matching fast-track criteria

### Team Assignment Rules
- `TheATeam`: New features, complex work requiring greenfield implementation
- `TheFixer`: Bug fixes, small improvements, refactoring, behavioral changes

## Assessment Pod

The assessment pod is a group of agents that evaluate proposed work items to add clarity, detail, and rigor before implementation begins.

### Pod Roles

| Role | Responsibility |
|------|---------------|
| **Pod Lead** | Coordinates assessment, makes final pass/fail decision |
| **Requirements Reviewer** | Validates completeness, testability, and spec alignment |
| **Domain Expert** | Checks domain correctness and edge cases |
| **Work Definer** | Enriches the work item with acceptance criteria, scope boundaries, and implementation hints |

### Assessment Process
1. Pod Lead receives proposed work item
2. All pod members assess in parallel
3. Pod Lead collects assessments
4. If all approve → status becomes `approved`
5. If any reject → Pod Lead synthesizes feedback, status becomes `rejected` with actionable notes
6. Rejected items return to `backlog` with assessment feedback attached

## Dashboard

A read-only view showing:
- All work items with current status
- Queue counts by status
- Recent activity/change history
- Team workload (items assigned to each team)
- Assessment pod activity

## Input Sources

| Source | Description |
|--------|-------------|
| **Browser** | Manual submission via web UI form |
| **Zendesk** | Webhook integration (future — define API shape now) |
| **Manual/Backfield** | Bulk import or admin creation |
| **Automated/Events** | System-generated items from monitoring or CI events |

## API Endpoints

### Work Items
- `POST /api/work-items` — Create a new work item (always enters backlog)
- `GET /api/work-items` — List work items with filtering/pagination
- `GET /api/work-items/:id` — Get single work item with full history
- `PATCH /api/work-items/:id` — Update work item fields
- `DELETE /api/work-items/:id` — Remove work item (soft delete)

### Workflow Actions
- `POST /api/work-items/:id/route` — Trigger routing for a backlog item
- `POST /api/work-items/:id/assess` — Submit to assessment pod
- `POST /api/work-items/:id/approve` — Manually approve (fast-track or override)
- `POST /api/work-items/:id/reject` — Reject with feedback
- `POST /api/work-items/:id/dispatch` — Dispatch approved item to implementation team

### Dashboard
- `GET /api/dashboard/summary` — Aggregate counts by status, team, priority
- `GET /api/dashboard/activity` — Recent change history across all items
- `GET /api/dashboard/queue` — Items grouped by current queue/status

### Webhook Intake
- `POST /api/intake/zendesk` — Zendesk webhook receiver
- `POST /api/intake/automated` — System event receiver

## Non-Functional Requirements
- All state transitions must be logged in change history
- Any agent (user or system) can change type/queue of a work item
- New items can ONLY be created into the work backlog (status=backlog)
- All list endpoints use `{data: T[]}` wrapper pattern
- Structured logging for all workflow transitions
- Prometheus metrics for: items created, items routed, items assessed, items dispatched
