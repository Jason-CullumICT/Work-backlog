# Dispatch Plan: Self-Judging Workflow Engine

## Task Summary

Implement a workflow engine for managing work items through intake → routing → assessment → dispatch pipeline. Work enters from multiple sources, gets classified by a router (fast-track vs full-review), optionally passes through an assessment pod, and gets dispatched to existing teams (TheATeam/TheFixer).

## Specification

- `Specifications/workflow-engine.md` — Full domain model, status lifecycle, routing rules, API endpoints

## Plans

- `Plans/self-judging-workflow/prompt.md` — Original feature request
- `Plans/self-judging-workflow/design.md` — Architecture, API shapes, frontend pages
- `Plans/self-judging-workflow/requirements.md` — FR table with scoping and assignments

## RISK_LEVEL: high

Rationale: New feature with greenfield architecture, >20 files across backend and frontend, new data model, new service layer, new API surface, new UI pages.

---

## Stage 1: API Contract

The api-contract agent should read the specification and design docs to produce shared TypeScript types for:
- `WorkItem`, `ChangeHistoryEntry`, `AssessmentRecord` types
- All API request/response types
- Enum types for status, priority, type, source, route, complexity
- Dashboard response types

Output: `Source/Shared/types/workflow.ts`

---

## Stage 2: Implementation (Parallel)

### backend-coder-1

**FRs:** FR-WF-001 [L] — Work Item data model and in-memory store

**Task:** Build the foundational data layer.

- Create `WorkItem` model with all fields from `Specifications/workflow-engine.md`
- Implement in-memory store with file persistence (JSON file)
- CRUD operations: create, findById, findAll (with pagination/filtering), update, softDelete
- Auto-generate `docId` in `WI-XXX` format (auto-incrementing)
- UUID generation for `id` field
- All mutations must be tracked (prepare for change history integration)
- Write tests first for each operation

**Files:** `Source/Backend/src/models/`, `Source/Backend/src/store/`, `Source/Backend/tests/`

**Read first:**
- `Specifications/workflow-engine.md`
- `Source/Shared/types/workflow.ts` (shared types from api-contract)
- `CLAUDE.md`

---

### backend-coder-2

**FRs:** FR-WF-004 [M], FR-WF-005 [L], FR-WF-006 [M] — Router, Assessment Pod, Workflow Actions

**Task:** Build the workflow engine core — routing logic, assessment pod, and workflow action endpoints.

- **Router Service:** Implement fast-track vs full-review classification based on spec rules (bug+trivial/small → fast-track; features always full-review; etc.)
- **Assessment Pod Service:** Model 4 pod roles (pod-lead, requirements-reviewer, domain-expert, work-definer). Each role produces an `AssessmentRecord`. Pod-lead aggregates verdicts — all approve = approved, any reject = rejected with synthesized feedback.
- **Workflow Action Endpoints:**
  - `POST /api/work-items/:id/route` — runs router, transitions status
  - `POST /api/work-items/:id/assess` — triggers assessment pod
  - `POST /api/work-items/:id/approve` — manual approve
  - `POST /api/work-items/:id/reject` — reject with feedback
  - `POST /api/work-items/:id/dispatch` — dispatch to team (TheATeam or TheFixer based on router rules)
- Enforce valid status transitions (e.g., can only route from `backlog`, can only dispatch from `approved`)
- Write tests first for each service and endpoint

**Files:** `Source/Backend/src/services/`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/tests/`

**Read first:**
- `Specifications/workflow-engine.md`
- `Source/Shared/types/workflow.ts`
- `CLAUDE.md`

---

### backend-coder-3

**FRs:** FR-WF-002 [M], FR-WF-003 [M], FR-WF-007 [S], FR-WF-008 [S], FR-WF-013 [S] — CRUD endpoints, Change History, Dashboard API, Intake, Observability

**Task:** Build the CRUD API, change history tracking, dashboard endpoints, intake webhooks, and observability.

- **CRUD Routes:**
  - `POST /api/work-items` — create (always status=backlog)
  - `GET /api/work-items` — list with pagination (`PaginatedResponse`), filter by status/type/priority/source
  - `GET /api/work-items/:id` — single item with full changeHistory and assessments
  - `PATCH /api/work-items/:id` — update fields
  - `DELETE /api/work-items/:id` — soft delete, 204 response
- **Change History Service:** Intercept all mutations and append `ChangeHistoryEntry` with timestamp, agent, field, oldValue, newValue
- **Dashboard Endpoints:**
  - `GET /api/dashboard/summary` — counts by status, team, priority
  - `GET /api/dashboard/activity` — recent change history entries (paginated)
  - `GET /api/dashboard/queue` — items grouped by status
- **Intake Webhooks:**
  - `POST /api/intake/zendesk` — creates work item with source=zendesk
  - `POST /api/intake/automated` — creates work item with source=automated
- **Observability:** Structured JSON logger (not console.log); Prometheus metrics for `workflow_items_created_total`, `workflow_items_routed_total`, `workflow_items_assessed_total`, `workflow_items_dispatched_total`
- Write tests first

**Files:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/dashboard.ts`, `Source/Backend/src/routes/intake.ts`, `Source/Backend/src/services/`, `Source/Backend/src/middleware/`, `Source/Backend/tests/`

**Read first:**
- `Specifications/workflow-engine.md`
- `Source/Shared/types/workflow.ts`
- `CLAUDE.md`

---

### frontend-coder-1

**FRs:** FR-WF-009 [L], FR-WF-012 [S] — Dashboard Page, Create Work Item Form

**Task:** Build the dashboard page and work item creation form.

- **Dashboard Page (`/`):**
  - Summary cards: total items, items by status (backlog, reviewing, approved, in-progress, completed)
  - Queue breakdown: items per status as a visual list/table
  - Team workload: items assigned to TheATeam vs TheFixer
  - Priority distribution: counts by priority level
  - Recent activity feed: last 10 change history entries with timestamps
  - Auto-refresh or manual refresh button
- **Create Work Item Page (`/work-items/new`):**
  - Form fields: title (required), description (textarea, required), type (select: feature/bug/issue/improvement), priority (select: critical/high/medium/low), source (select: browser/manual)
  - Submit calls `POST /api/work-items`
  - On success, navigate to the new item's detail page
  - Validation: title and description required
- Set up React Router with all page routes
- Write tests first using Testing Library

**Files:** `Source/Frontend/src/pages/`, `Source/Frontend/src/components/`, `Source/Frontend/src/hooks/`, `Source/Frontend/src/App.tsx`, `Source/Frontend/tests/`

**Read first:**
- `Specifications/workflow-engine.md`
- `Plans/self-judging-workflow/design.md`
- `Source/Shared/types/workflow.ts`
- `CLAUDE.md`

---

### frontend-coder-2

**FRs:** FR-WF-010 [M], FR-WF-011 [M] — Work Item List Page, Work Item Detail Page

**Task:** Build the work item list and detail pages.

- **Work Item List Page (`/work-items`):**
  - Paginated table showing: docId, title, type, status, priority, assignedTeam, updatedAt
  - Filter controls: status dropdown, type dropdown, priority dropdown
  - Pagination controls (prev/next, page size)
  - Click row to navigate to detail page
  - Calls `GET /api/work-items` with query params for filtering/pagination
- **Work Item Detail Page (`/work-items/:id`):**
  - Header: docId, title, status badge, priority badge
  - Detail section: description, type, source, complexity, route, assignedTeam
  - Change History timeline: chronological list of all changes with agent, field, old→new, timestamp
  - Assessment Records: cards for each assessment showing role, verdict, notes
  - Action buttons (conditionally shown based on current status):
    - "Route" (when status=backlog)
    - "Approve" (when status=proposed or reviewing)
    - "Reject" (when status=proposed or reviewing)
    - "Dispatch" (when status=approved) — with team selection (TheATeam/TheFixer)
  - Each action calls the corresponding `POST /api/work-items/:id/{action}` endpoint
- Write tests first using Testing Library

**Files:** `Source/Frontend/src/pages/`, `Source/Frontend/src/components/`, `Source/Frontend/src/hooks/`, `Source/Frontend/tests/`

**Read first:**
- `Specifications/workflow-engine.md`
- `Plans/self-judging-workflow/design.md`
- `Source/Shared/types/workflow.ts`
- `CLAUDE.md`

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
