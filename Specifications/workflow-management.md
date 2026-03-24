# Specification: Generic Workflow Management System

## Overview

A work item lifecycle management system that captures work from multiple intake sources, manages items through a backlog/proposal/review pipeline, and delivers approved work to development. A real-time dashboard provides visibility across all stages.

## Domain Model

### Work Item (Core Entity)

Every work item is a simple object with change history tracking.

```
WorkItem {
  id: string (UUID)
  title: string
  description: string
  type: WorkItemType
  status: WorkItemStatus
  queue: string (nullable)
  priority: Priority
  source: IntakeSource
  createdAt: datetime
  updatedAt: datetime
  changeHistory: ChangeEntry[]
}
```

**Invariants:**
- New items can ONLY be created in the Work Backlog (status = `backlog`)
- Any agent/user can change the type or queue of an item at any stage
- Every state transition is recorded in the change history

### Work Item Types

| Type | Description |
|------|-------------|
| `feature` | New functionality |
| `bug` | Defect report |
| `task` | General work task |
| `improvement` | Enhancement to existing functionality |

### Work Item Statuses (Pipeline Stages)

```
backlog -> proposed -> under_review -> approved -> in_dev -> done
                    \-> rejected (terminal)
```

| Status | Stage | Description |
|--------|-------|-------------|
| `backlog` | Work Backlog | Newly created, awaiting triage |
| `proposed` | Proposed Work | Has requirements/prototype, ready for review |
| `under_review` | Panel/Fund Gate | Being evaluated by review panel |
| `approved` | Reviewed Work | Passed review, queued for development |
| `rejected` | Terminal | Did not pass review gate |
| `in_dev` | Dev | Actively being developed |
| `done` | Code Repository | Completed and merged |

### Change Entry

```
ChangeEntry {
  id: string
  workItemId: string
  field: string
  oldValue: string (nullable)
  newValue: string
  changedBy: string
  changedAt: datetime
}
```

### Priority

`critical | high | medium | low`

## Intake Sources

Work items can originate from four sources:

| Source | Description |
|--------|-------------|
| `browser` | Manual creation via web UI |
| `zendesk` | Imported from Zendesk tickets |
| `manual_bookmark` | Bookmarked/flagged from external systems |
| `integration` | Automated ingestion via API/webhook |

All sources funnel into the Work Backlog as the single point of entry.

## Pipeline Stages

### 1. Work Backlog
- Central intake queue for all new work items
- Items can be reordered, re-typed, and re-queued
- Agents and users can triage items here

### 2. Proposed Work
- Work items move here when they have been elaborated
- **Test Architect** role: generates proposed requirements and mock/prototype artifacts for the item
- Artifacts produced:
  - Proposed Requirements (text description of what the item needs)
  - Mock/Prototype (optional visual or technical prototype)
- Items remain here until submitted for review

### 3. Panel/Fund Gate (Decision Diamond)
- Review checkpoint where a panel evaluates proposed work
- Binary outcome: **approve** or **reject**
- Approved items advance to Reviewed Work
- Rejected items are returned with feedback

### 4. Reviewed Work (Work Review)
- Final review stage before development
- Items undergo a "Work Review" to confirm scope and readiness
- Produces a prioritized worklist of approved items

### 5. Dev
- Approved work items are assigned to developers
- Items transition to `in_dev` status
- Development produces code committed to the Code Repository

### 6. Code Repository (Output)
- Final destination for completed work
- Items marked as `done`

## Dashboard

A real-time dashboard providing:
- **All work items** across all pipeline stages
- **Queue views** with filtering by type, status, priority, source
- **Board view** (kanban-style) showing items per stage
- **Sprint tracking** (optional grouping of items into time-boxed sprints)
- **Metrics**: counts per stage, throughput, cycle time

## Cross-Cutting Rules

1. **Single entry point**: New items can ONLY be created in the Work Backlog
2. **Universal mutability**: Any agent/user can change the type or queue of any item at any stage
3. **Full audit trail**: Every field change is recorded with who, when, old value, new value
4. **"Worth doing" shortcut**: Items can be flagged as "worth doing a review for" to fast-track from backlog to review
5. **Idempotent intake**: Duplicate detection by source + external ID for integration/zendesk sources

## API Surface (High-Level)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/work-items | Create a new work item (always in backlog) |
| GET | /api/work-items | List/filter work items |
| GET | /api/work-items/:id | Get single work item with history |
| PATCH | /api/work-items/:id | Update fields (type, queue, priority, etc.) |
| POST | /api/work-items/:id/transition | Advance item to next pipeline stage |
| POST | /api/work-items/:id/propose | Attach proposed requirements/prototype |
| POST | /api/work-items/:id/review | Submit review decision (approve/reject) |
| GET | /api/work-items/:id/history | Get change history |
| GET | /api/dashboard/summary | Dashboard metrics |
| GET | /api/dashboard/board | Board view (items grouped by status) |
| POST | /api/intake/zendesk | Webhook for Zendesk intake |
| POST | /api/intake/integration | Generic webhook intake |
