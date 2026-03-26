# Requirements: Self-Judging Workflow Engine

## Verdict: APPROVED

### Functional Requirements

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-WF-001 | Work Item data model and in-memory store | [backend] | L | WorkItem type with all spec fields; CRUD operations on in-memory store with file persistence; auto-generated docId (WI-XXX format) |
| FR-WF-002 | Work Item CRUD API endpoints | [backend] | M | POST/GET/PATCH/DELETE endpoints; list supports pagination and filtering by status/type/priority; responses follow project API patterns |
| FR-WF-003 | Change history tracking | [backend] | M | Every field mutation on a work item appends to changeHistory; entries include timestamp, agent, field, oldValue, newValue |
| FR-WF-004 | Work Router service | [backend] | M | Router classifies items as fast-track or full-review based on spec rules; fast-track items go directly to approved; full-review items go to proposed status |
| FR-WF-005 | Assessment Pod service | [backend] | L | Pod with 4 roles (pod-lead, requirements-reviewer, domain-expert, work-definer); each produces assessment record; pod-lead aggregates and makes final verdict |
| FR-WF-006 | Workflow action endpoints (route/assess/approve/reject/dispatch) | [backend] | M | POST endpoints for each action; proper status transitions enforced; dispatch sets assignedTeam to TheATeam or TheFixer |
| FR-WF-007 | Dashboard API endpoints | [backend] | S | GET summary (counts by status/team/priority), activity (recent changes), queue (items grouped by status) |
| FR-WF-008 | Intake webhook endpoints | [backend] | S | POST /api/intake/zendesk and /api/intake/automated; both create work items with correct source field |
| FR-WF-009 | Dashboard page | [frontend] | L | Summary cards showing queue counts; breakdown by status, team, priority; recent activity feed |
| FR-WF-010 | Work Item list page | [frontend] | M | Paginated table of work items; filters for status, type, priority, team; click to navigate to detail |
| FR-WF-011 | Work Item detail page | [frontend] | M | Shows all work item fields; displays change history timeline; shows assessment records; action buttons (route, approve, reject, dispatch) |
| FR-WF-012 | Create Work Item form | [frontend] | S | Form with title, description, type, priority, source fields; submits to POST /api/work-items; navigates to detail on success |
| FR-WF-013 | Observability: structured logging and metrics | [backend] | S | Structured JSON logging for all workflow transitions; Prometheus metrics for items created/routed/assessed/dispatched |

### Scoping Plan

**Backend: 4 + 2 + 2 + 2 + 4 + 2 + 1 + 1 + 1 = 19 points → 3 coders**
**Frontend: 4 + 2 + 2 + 1 = 9 points → 2 coders**

### Assignment

**Backend:**
- Backend Coder 1: FR-WF-001 [L] (4 pts) — Data model and store (foundational, must go first conceptually but all coders build concurrently)
- Backend Coder 2: FR-WF-004 [M], FR-WF-005 [L], FR-WF-006 [M] (8 pts) — Router, assessment pod, workflow actions (tightly coupled)
- Backend Coder 3: FR-WF-002 [M], FR-WF-003 [M], FR-WF-007 [S], FR-WF-008 [S], FR-WF-013 [S] (7 pts) — CRUD endpoints, history, dashboard API, intake, observability

**Frontend:**
- Frontend Coder 1: FR-WF-009 [L], FR-WF-012 [S] (5 pts) — Dashboard page, create form
- Frontend Coder 2: FR-WF-010 [M], FR-WF-011 [M] (4 pts) — List page, detail page
