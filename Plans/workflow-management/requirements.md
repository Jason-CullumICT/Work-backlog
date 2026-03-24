# Requirements: Generic Workflow Management System

## Verdict: APPROVED

### Functional Requirements

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-WF-001 | Work Item CRUD with enforced backlog creation | [backend] | M | POST /api/work-items creates item with status=backlog; GET returns filtered list as {data: T[]}; GET /:id returns item with history; PATCH updates fields |
| FR-WF-002 | Change history auto-recording | [backend] | M | Every PATCH to a work item creates a ChangeEntry with field, oldValue, newValue, changedBy, changedAt; GET /:id/history returns {data: ChangeEntry[]} |
| FR-WF-003 | Pipeline state machine with valid transitions | [backend] | L | POST /:id/transition validates against allowed transitions map; rejects invalid transitions with 400; records status change in history |
| FR-WF-004 | Proposal attachment (proposed work stage) | [backend] | M | POST /:id/propose accepts {requirements, prototypeUrl}; creates proposal record; transitions item to proposed status; rejects if item not in backlog |
| FR-WF-005 | Review decision gate | [backend] | M | POST /:id/review accepts {decision: approved/rejected, feedback}; transitions item accordingly; creates review record |
| FR-WF-006 | Fast-track "worth doing" shortcut | [backend] | S | POST /:id/transition with target=under_review from backlog status is allowed (bypasses proposed stage) |
| FR-WF-007 | Intake webhooks with dedup | [backend] | M | POST /api/intake/zendesk and /api/intake/integration create work items; duplicate detection by source+external_id returns existing item instead of creating new |
| FR-WF-008 | Dashboard summary API | [backend] | S | GET /api/dashboard/summary returns {data: {statusCounts, totalItems, throughput}}; statusCounts has count per status |
| FR-WF-009 | Dashboard board API | [backend] | S | GET /api/dashboard/board returns {data: {columns: [{status, items: WorkItem[]}]}} |
| FR-WF-010 | Dashboard page with metrics | [frontend] | M | Renders summary cards showing item counts per pipeline stage; refreshes on interval; shows throughput metric |
| FR-WF-011 | Kanban board view | [frontend] | L | Displays columns for each pipeline status; items shown as cards with title, type badge, priority badge; drag-drop moves items between columns via transition API |
| FR-WF-012 | Backlog list view with filters | [frontend] | M | Filterable/sortable table of backlog items; filters for type, priority, source; pagination |
| FR-WF-013 | Work item creation form | [frontend] | S | Form with title (required), description, type dropdown, priority dropdown; submits to POST /api/work-items; validates required fields |
| FR-WF-014 | Item detail page | [frontend] | L | Shows all item fields (inline editable); change history timeline; proposal section; review section with approve/reject buttons; status transition actions |
| FR-WF-015 | Observability middleware | [backend] | S | Structured JSON logging for all requests; Prometheus metrics at GET /metrics; request latency tracking |

### Scoping Plan

**Backend: 14 points -> 2 coders**
- S=1 x3 = 3pts, M=2 x5 = 10pts, L=4 x1 = 4pts => 17 points total -> 3 coders (but consolidating to 2 for manageable coordination)

**Frontend: 10 points -> 2 coders**
- S=1 x1 = 1pt, M=2 x2 = 4pts, L=4 x2 = 8pts => 13 points total -> 2 coders

### Assignment

**Backend Coder 1:** FR-WF-001 [M], FR-WF-002 [M], FR-WF-015 [S] (5 pts)
- Focus: Core CRUD, change history, observability middleware

**Backend Coder 2:** FR-WF-003 [L], FR-WF-004 [M], FR-WF-005 [M], FR-WF-006 [S] (9 pts)
- Focus: State machine, proposals, reviews, fast-track

**Backend Coder 3:** FR-WF-007 [M], FR-WF-008 [S], FR-WF-009 [S] (4 pts)
- Focus: Intake webhooks, dashboard APIs

**Frontend Coder 1:** FR-WF-010 [M], FR-WF-011 [L] (6 pts)
- Focus: Dashboard page, kanban board with drag-drop

**Frontend Coder 2:** FR-WF-012 [M], FR-WF-013 [S], FR-WF-014 [L] (7 pts)
- Focus: Backlog list, creation form, item detail page
