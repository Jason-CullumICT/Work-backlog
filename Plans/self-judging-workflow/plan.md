# Plan: Self-Judging Workflow Engine

## Phase 1: Shared Types (api-contract)
- [ ] Define WorkItem, ChangeHistoryEntry, AssessmentRecord types
- [ ] Define all enum types (status, priority, type, source, route, complexity)
- [ ] Define API request/response types for all endpoints
- [ ] Define dashboard response types

## Phase 2: Backend — Data Layer (backend-coder-1)
- [ ] WorkItem model with all spec fields
- [ ] In-memory store with file persistence
- [ ] CRUD operations with pagination and filtering
- [ ] Auto-generated docId (WI-XXX)
- [ ] Tests for all store operations

## Phase 3: Backend — Workflow Engine (backend-coder-2)
- [ ] Router service with fast-track/full-review classification
- [ ] Assessment pod service with 4 roles
- [ ] Workflow action endpoints (route/assess/approve/reject/dispatch)
- [ ] Status transition enforcement
- [ ] Tests for router logic, assessment, and endpoints

## Phase 4: Backend — API & Observability (backend-coder-3)
- [ ] Work item CRUD endpoints
- [ ] Change history tracking service
- [ ] Dashboard API endpoints
- [ ] Intake webhook endpoints
- [ ] Structured logging and Prometheus metrics
- [ ] Tests for all endpoints

## Phase 5: Frontend — Dashboard & Creation (frontend-coder-1)
- [ ] Dashboard page with summary cards, queues, activity
- [ ] Create work item form
- [ ] React Router setup with all routes
- [ ] Tests for dashboard and form components

## Phase 6: Frontend — List & Detail (frontend-coder-2)
- [ ] Work item list page with pagination and filters
- [ ] Work item detail page with history and assessments
- [ ] Action buttons with status-conditional display
- [ ] Tests for list and detail components

## Phase 7: QA & Review
- [ ] All Stage 4 QA agents run against implementation
- [ ] Feedback loop if issues found (max 2 iterations)
