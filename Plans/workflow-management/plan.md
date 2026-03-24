# Plan: Generic Workflow Management System

## Phase 1: Backend Core -- Data Model & CRUD (backend-only)

- [ ] Initialize Express project with TypeScript, Knex, SQLite
- [ ] Create database migrations for work_items, change_history, proposals, reviews
- [ ] Implement WorkItem model with validation
- [ ] Implement ChangeHistory service (auto-records field changes)
- [ ] Create WorkItemService with CRUD operations
- [ ] Add POST /api/work-items (enforces status=backlog on create)
- [ ] Add GET /api/work-items with filtering (status, type, queue, priority, source)
- [ ] Add GET /api/work-items/:id (includes change history)
- [ ] Add PATCH /api/work-items/:id (records change history for each field)
- [ ] Add observability: structured logging, /metrics endpoint
- [ ] Write tests for all CRUD operations

## Phase 2: Backend Pipeline -- State Machine & Transitions (backend-only)

- [ ] Implement state machine with valid transition map
- [ ] Add POST /api/work-items/:id/transition endpoint
- [ ] Add POST /api/work-items/:id/propose (attach requirements/prototype, move to proposed)
- [ ] Add POST /api/work-items/:id/review (approve/reject decision)
- [ ] Add GET /api/work-items/:id/history endpoint
- [ ] Enforce "new items only in backlog" invariant
- [ ] Implement "worth doing" fast-track (backlog -> under_review)
- [ ] Implement rejected -> backlog re-open path
- [ ] Write tests for all transitions and invalid transition rejection

## Phase 3: Backend Intake & Dashboard (backend-only)

- [ ] Implement IntakeService with dedup by source + external_id
- [ ] Add POST /api/intake/zendesk webhook handler
- [ ] Add POST /api/intake/integration generic webhook handler
- [ ] Implement DashboardService with aggregation queries
- [ ] Add GET /api/dashboard/summary (counts per status, throughput)
- [ ] Add GET /api/dashboard/board (items grouped by status)
- [ ] Write tests for intake dedup and dashboard aggregation

## Phase 4: Frontend -- Dashboard & Board (frontend-only)

- [ ] Initialize React project with TypeScript, React Router, Tailwind
- [ ] Create API client module for all backend endpoints
- [ ] Build Dashboard page with summary metrics cards (counts per stage)
- [ ] Build BoardView page with kanban columns per status
- [ ] Add drag-and-drop between columns (triggers transition API)
- [ ] Build shared components: WorkItemCard, StatusBadge, PriorityBadge
- [ ] Write tests for Dashboard and BoardView

## Phase 5: Frontend -- Item Management (frontend-only)

- [ ] Build BacklogView page with filterable table
- [ ] Build CreateItem form (title, description, type, priority, source)
- [ ] Build ItemDetail page with:
  - Item fields (editable inline)
  - Change history timeline
  - Proposal section (attach requirements/prototype)
  - Review section (approve/reject with feedback)
  - Status transition buttons
- [ ] Add routing for all pages
- [ ] Write tests for item CRUD and transitions

## Phase 6: Integration & Polish

- [ ] Connect frontend to backend, verify full pipeline flow
- [ ] Add loading states and error handling
- [ ] Responsive layout for dashboard and board
- [ ] End-to-end smoke test: create item -> propose -> review -> approve -> dev -> done
