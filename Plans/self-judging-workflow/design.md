# Design: Self-Judging Workflow Engine

## Approach

A full-stack workflow engine with a Node/Express backend and React frontend. The backend manages work items through a state machine with routing logic and assessment orchestration. The frontend provides a dashboard and work item management UI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Dashboard     │ │ Work Items   │ │ Create/Edit Item     │ │
│  │ (summary,     │ │ (list, filter│ │ (form, status        │ │
│  │  queues,      │ │  detail view)│ │  actions)            │ │
│  │  activity)    │ │              │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
┌────────────────────────────┴────────────────────────────────┐
│ Backend (Node + Express)                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Routes        │ │ Services     │ │ Models               │ │
│  │ - workItems   │ │ - workItem   │ │ - WorkItem           │ │
│  │ - dashboard   │ │ - router     │ │ - ChangeHistory      │ │
│  │ - intake      │ │ - assessment │ │ - Assessment         │ │
│  │ - workflow    │ │ - dashboard  │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Trade-offs

### State Management
- **Chosen: In-memory store with file persistence** — suitable for v1, avoids database dependency
- Alternative: Full database (Prisma + SQLite) — would be the v2 approach
- Rationale: Faster to ship, spec says "simple objects", can migrate later

### Assessment Pod
- **Chosen: Synchronous sequential assessment** — pod members assess one at a time, results aggregated
- Alternative: Parallel async assessment — more complex but faster
- Rationale: Simpler to implement and debug, matches the diagram flow

### Routing Logic
- **Chosen: Rule-based router in service layer** — configurable rules, no ML
- Alternative: AI-based classification — overkill for v1
- Rationale: Predictable, testable, transparent

## API Shape

All endpoints follow the project's API response patterns from CLAUDE.md.

### Work Items CRUD
```
POST   /api/work-items          → WorkItem
GET    /api/work-items           → { data: WorkItem[], page, limit, total, totalPages }
GET    /api/work-items/:id       → WorkItem (with changeHistory and assessments)
PATCH  /api/work-items/:id       → WorkItem
DELETE /api/work-items/:id       → 204 No Content
```

### Workflow Actions
```
POST   /api/work-items/:id/route    → WorkItem (status: routing → proposed|approved)
POST   /api/work-items/:id/assess   → WorkItem (triggers assessment pod)
POST   /api/work-items/:id/approve  → WorkItem (status → approved)
POST   /api/work-items/:id/reject   → WorkItem (status → rejected)
POST   /api/work-items/:id/dispatch → WorkItem (status → in-progress, assignedTeam set)
```

### Dashboard
```
GET    /api/dashboard/summary    → { statusCounts, teamCounts, priorityCounts }
GET    /api/dashboard/activity   → { data: ChangeHistoryEntry[] }
GET    /api/dashboard/queue      → { data: QueueGroup[] }
```

### Intake Webhooks
```
POST   /api/intake/zendesk       → WorkItem
POST   /api/intake/automated     → WorkItem
```

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DashboardPage` | Summary cards, queue breakdown, recent activity |
| `/work-items` | `WorkItemListPage` | Filterable list of all work items |
| `/work-items/:id` | `WorkItemDetailPage` | Full detail with history, assessments, actions |
| `/work-items/new` | `CreateWorkItemPage` | Form to create new work items |

## Key Implementation Notes

- Work items use UUID for `id`, auto-incrementing `WI-XXX` for `docId`
- Change history is append-only — every field mutation creates an entry
- Assessment pod is modeled as service functions, not separate processes
- The router service contains the fast-track vs full-review decision logic
- Existing team definitions in `Teams/` are referenced but NOT modified
