# Design: Generic Workflow Management System

## Approach

Full-stack application with a Node.js/Express backend, React frontend, and SQLite database (upgradeable to PostgreSQL). The system models a work item pipeline with intake, backlog, proposal, review, and development stages.

## Architecture

```
┌─────────────────────────────────────┐
│           React Frontend            │
│  Dashboard | Board | Item Detail    │
├─────────────────────────────────────┤
│          REST API (Express)         │
│  /api/work-items | /api/dashboard   │
│  /api/intake                        │
├─────────────────────────────────────┤
│          Service Layer              │
│  WorkItemService | DashboardService │
│  IntakeService | ReviewService      │
├─────────────────────────────────────┤
│         Database (SQLite/PG)        │
│  work_items | change_history        │
│  proposals | reviews                │
└─────────────────────────────────────┘
```

## Trade-offs

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Database | PostgreSQL vs SQLite | SQLite (dev), PG-ready | Faster bootstrap; Knex/Prisma abstracts dialect |
| State machine | Library vs custom | Custom with validation | Pipeline is simple (6 states); no library needed |
| Change history | Event sourcing vs audit table | Audit table | Simpler; sufficient for change tracking |
| Dashboard updates | WebSocket vs polling | Polling (v1) | Simpler; WebSocket can be added later |
| Intake webhooks | Queue vs direct | Direct processing | Low volume expected; queue adds complexity |

## Database Schema

### work_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| title | VARCHAR(255) | Required |
| description | TEXT | Optional |
| type | ENUM | feature, bug, task, improvement |
| status | ENUM | backlog, proposed, under_review, approved, rejected, in_dev, done |
| queue | VARCHAR(100) | Nullable, user-defined grouping |
| priority | ENUM | critical, high, medium, low |
| source | ENUM | browser, zendesk, manual_bookmark, integration |
| external_id | VARCHAR(255) | For dedup on intake sources |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### change_history
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| work_item_id | UUID | FK -> work_items |
| field | VARCHAR(100) | Field that changed |
| old_value | TEXT | Nullable (for creation) |
| new_value | TEXT | |
| changed_by | VARCHAR(100) | User/agent identifier |
| changed_at | TIMESTAMP | |

### proposals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| work_item_id | UUID | FK -> work_items |
| requirements | TEXT | Proposed requirements text |
| prototype_url | VARCHAR(500) | Optional link to prototype |
| created_by | VARCHAR(100) | |
| created_at | TIMESTAMP | |

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| work_item_id | UUID | FK -> work_items |
| decision | ENUM | approved, rejected |
| feedback | TEXT | Reviewer comments |
| reviewed_by | VARCHAR(100) | |
| reviewed_at | TIMESTAMP | |

## API Endpoints

### Work Items CRUD
- `POST /api/work-items` -- Create (always status=backlog)
- `GET /api/work-items` -- List with filters (status, type, queue, priority, source)
- `GET /api/work-items/:id` -- Single item with change history
- `PATCH /api/work-items/:id` -- Update fields (records change history)
- `DELETE /api/work-items/:id` -- Soft delete (status=archived) or 204

### Pipeline Transitions
- `POST /api/work-items/:id/transition` -- Move to next valid status
- `POST /api/work-items/:id/propose` -- Attach proposal, move to proposed
- `POST /api/work-items/:id/review` -- Submit review decision

### History
- `GET /api/work-items/:id/history` -- Change history for item

### Dashboard
- `GET /api/dashboard/summary` -- Aggregate counts per status, throughput metrics
- `GET /api/dashboard/board` -- Items grouped by status (kanban data)

### Intake Webhooks
- `POST /api/intake/zendesk` -- Zendesk webhook handler
- `POST /api/intake/integration` -- Generic webhook handler

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Summary metrics, stage counts, throughput |
| `/board` | BoardView | Kanban board with drag-drop between stages |
| `/backlog` | BacklogView | Filterable list of backlog items |
| `/items/:id` | ItemDetail | Single item view with history, proposal, review actions |
| `/items/new` | CreateItem | Form to create new work item |

## State Machine Transitions

```
backlog     -> proposed (via /propose with requirements)
backlog     -> under_review (fast-track "worth doing")
proposed    -> under_review (submit for review)
under_review -> approved (review decision = approved)
under_review -> rejected (review decision = rejected)
approved    -> in_dev (assigned to developer)
in_dev      -> done (development complete)
rejected    -> backlog (re-open for rework)
```
