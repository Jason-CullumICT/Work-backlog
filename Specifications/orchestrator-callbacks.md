# Specification: Orchestrator-to-Portal Callback Integration

## Overview

Extends the portal with three new domain entities (Cycle, Feature, Learning) and corresponding API endpoints that the external orchestrator calls at pipeline lifecycle points. Also adds frontend pages to browse features, learnings, and view active cycles on the dashboard.

## New Domain Entities

### Cycle

Represents a single orchestrator pipeline run.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `workItemId` | string | Reference to the source WorkItem |
| `team` | string | `TheATeam` or `TheFixer` |
| `status` | CycleStatus enum | Current pipeline phase |
| `branch` | string | Git branch name for this run |
| `startedAt` | datetime | When the run began |
| `updatedAt` | datetime | Last status update |
| `completedAt` | datetime? | When the run finished (success or failure) |
| `phases` | CyclePhase[] | Ordered list of phase transitions |
| `result` | CycleResult? | `passed` or `failed` — set on completion |
| `error` | string? | Error message if failed |

### CycleStatus Enum

| Value | Description |
|-------|-------------|
| `started` | Pipeline run initiated |
| `requirements` | Requirements review phase |
| `api-contract` | API contract definition phase |
| `implementation` | Coding phase |
| `review` | QA/review phase |
| `completed` | Pipeline finished successfully |
| `failed` | Pipeline failed |

### CyclePhase

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Phase name (matches CycleStatus values) |
| `startedAt` | datetime | When this phase began |
| `completedAt` | datetime? | When this phase ended |

### CycleResult Enum

`passed` | `failed`

### Feature

Represents a completed, delivered feature created when a pipeline run passes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `workItemId` | string | Reference to the source WorkItem |
| `cycleId` | string | Reference to the Cycle that built it |
| `title` | string | Feature title (from WorkItem) |
| `description` | string | Feature description (from WorkItem) |
| `branch` | string | Git branch with the implementation |
| `mergedAt` | datetime? | When code was merged |
| `createdAt` | datetime | When the Feature record was created |

### Learning

An agent learning discovered during a pipeline run.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `cycleId` | string | Reference to the Cycle |
| `team` | string | Team that produced this learning |
| `role` | string | Agent role (e.g., `backend-coder`, `qa-review`) |
| `content` | string | The learning text |
| `category` | string? | Optional category tag |
| `createdAt` | datetime | When the learning was recorded |

## API Endpoints

### Cycles

#### FR-CB-001: Create Cycle
```
POST /api/cycles
Body: { workItemId, team, branch }
Response: Cycle (201 Created)
```
Creates a new cycle record. Also transitions the referenced WorkItem to `in-progress` status if it is currently `approved`.

#### FR-CB-002: Update Cycle Phase
```
PATCH /api/cycles/:id
Body: { status, error? }
Response: Cycle (200 OK)
```
Updates the cycle status. Appends a new CyclePhase entry. If status is `completed` or `failed`, sets `completedAt` and `result`.

#### FR-CB-003: List Cycles
```
GET /api/cycles
Query: ?workItemId=X&status=Y&page=N&limit=N
Response: { data: Cycle[], page, limit, total, totalPages }
```

#### FR-CB-004: Get Cycle by ID
```
GET /api/cycles/:id
Response: Cycle
```

### Features

#### FR-CB-005: Create Feature
```
POST /api/features
Body: { workItemId, cycleId, title, description, branch, mergedAt? }
Response: Feature (201 Created)
```
Creates a feature record. Transitions the referenced WorkItem to `completed` status if it is currently `in-progress`.

#### FR-CB-006: List Features
```
GET /api/features
Query: ?page=N&limit=N
Response: { data: Feature[], page, limit, total, totalPages }
```

#### FR-CB-007: Get Feature by ID
```
GET /api/features/:id
Response: Feature
```

### Learnings

#### FR-CB-008: Create Learning
```
POST /api/learnings
Body: { cycleId, team, role, content, category? }
Response: Learning (201 Created)
```

#### FR-CB-009: Batch Create Learnings
```
POST /api/learnings/batch
Body: { learnings: [{ cycleId, team, role, content, category? }] }
Response: { data: Learning[] } (201 Created)
```

#### FR-CB-010: List Learnings
```
GET /api/learnings
Query: ?cycleId=X&team=Y&role=Z&page=N&limit=N
Response: { data: Learning[], page, limit, total, totalPages }
```

### Dashboard Extensions

#### FR-CB-011: Active Cycles
```
GET /api/dashboard/active-cycles
Response: { data: Cycle[] }
```
Returns cycles with status NOT `completed` or `failed`.

## Frontend Pages

### FR-CB-012: Features Browser Page
- Route: `/features`
- Paginated list of delivered features
- Each row shows: title, description (truncated), branch, merged date, link to source work item
- Add "Features" to the main navigation

### FR-CB-013: Learnings Page
- Route: `/learnings`
- Paginated list of agent learnings
- Filterable by team, role
- Each row shows: content, team, role, category, date
- Add "Learnings" to the main navigation

### FR-CB-014: Active Cycle Dashboard Section
- Add an "Active Cycles" section to the existing DashboardPage
- Shows cycles that are currently running (not completed/failed)
- Each card shows: work item title, team, current phase, time elapsed
- Links to the source work item

## Observability Requirements

### Metrics (FR-CB-015)
- `portal_cycles_created_total{team}` — Counter for cycles created
- `portal_cycles_completed_total{team,result}` — Counter for cycles completed (passed/failed)
- `portal_features_created_total` — Counter for features created
- `portal_learnings_created_total{team,role}` — Counter for learnings created

### Logging (FR-CB-016)
- All callback endpoints must log structured JSON with the entity ID, action, and caller info
- Log at `info` level for successful operations, `warn` for validation failures

## Non-Functional Requirements

- **FR-CB-017**: All new endpoints follow existing API response patterns (`{data: T[]}` wrappers for lists, direct `T` for single items)
- **FR-CB-018**: All new stores use the same in-memory Map pattern as `workItemStore`
- **FR-CB-019**: All new routes go through the service layer (no direct store access from route handlers)
- **FR-CB-020**: The `PORTAL_URL` configuration is an orchestrator-side concern, not implemented in this portal feature — the portal just exposes the endpoints
