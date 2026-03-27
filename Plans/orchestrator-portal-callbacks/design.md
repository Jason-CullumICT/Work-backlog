# Design: Orchestrator-to-Portal Callback Integration

## Architecture Decision

The portal exposes new REST endpoints that the orchestrator calls at lifecycle points. No WebSocket or pub/sub — simple HTTP POST/PATCH callbacks. This matches the existing intake webhook pattern.

## Backend Architecture

### Layer Structure (per entity: Cycle, Feature, Learning)

```
routes/{entity}.ts        → HTTP handlers (validation, response formatting)
services/{entity}.ts      → Business logic (state transitions, cross-entity coordination)
store/{entity}Store.ts    → In-memory Map<id, Entity> storage (same pattern as workItemStore)
```

### Store Pattern

Each store follows the existing `workItemStore.ts` pattern:
- `Map<string, Entity>` as the backing store
- `create()`, `findById()`, `findAll()`, `update()` methods
- `findAll()` supports filtering and pagination
- UUID generation via `crypto.randomUUID()`

### Service Layer Responsibilities

**cycleService.ts:**
- `createCycle(data)` → creates cycle, optionally transitions WorkItem to `in-progress`
- `updateCyclePhase(id, status, error?)` → appends phase, updates status/timestamps
- `getActiveCycles()` → returns non-terminal cycles
- Uses `workItemStore` to update WorkItem status on cycle creation

**featureService.ts:**
- `createFeature(data)` → creates feature record, transitions WorkItem to `completed`
- `listFeatures(filters, pagination)` → paginated list
- Uses `workItemStore` to update WorkItem status on feature creation

**learningService.ts:**
- `createLearning(data)` → creates single learning
- `batchCreateLearnings(items)` → creates multiple learnings in one call
- `listLearnings(filters, pagination)` → paginated list with team/role/cycle filters

### Route Registration

In `app.ts`, add three new route mounts:
```typescript
app.use('/api/cycles', cyclesRouter);
app.use('/api/features', featuresRouter);
app.use('/api/learnings', learningsRouter);
```

Also add a new dashboard route for active cycles in the existing `dashboardRouter`.

### Metrics

Add to existing `metrics.ts`:
- 4 new Prometheus counters (see spec FR-CB-015)
- Increment in service layer, not route handlers

## Frontend Architecture

### New Pages

**FeaturesPage.tsx** (`/features`):
- Uses `useFeatures()` hook → calls `GET /api/features?page=N&limit=N`
- Renders paginated table: title, description (truncated to 100 chars), branch, merged date
- Each row links to `/work-items/{workItemId}`

**LearningsPage.tsx** (`/learnings`):
- Uses `useLearnings()` hook → calls `GET /api/learnings?team=X&role=Y&page=N&limit=N`
- Filter bar: team dropdown, role dropdown
- Renders paginated list cards: content, team badge, role badge, category tag, date

### Dashboard Extension

Add `ActiveCycles` section to existing `DashboardPage.tsx`:
- Uses `useActiveCycles()` hook → calls `GET /api/dashboard/active-cycles`
- Renders cycle cards: work item title (fetched via workItemId), team, current status/phase, elapsed time
- Positioned above the existing Summary section

### Navigation Update

Add to `Layout.tsx` `NAV_ITEMS`:
```typescript
{ path: '/features', label: 'Features' },
{ path: '/learnings', label: 'Learnings' },
```

### API Client Extensions

Add to `client.ts`:
```typescript
export const cyclesApi = { list(), getById() }
export const featuresApi = { list(), getById() }
export const learningsApi = { list() }
export const dashboardApi = { ...existing, activeCycles() }
```

## Shared Types

Add to `Source/Shared/types/workflow.ts`:
- `CycleStatus` enum
- `CycleResult` enum
- `CyclePhase` interface
- `Cycle` interface
- `Feature` interface
- `Learning` interface
- Request types: `CreateCycleRequest`, `UpdateCycleRequest`, `CreateFeatureRequest`, `CreateLearningRequest`, `BatchCreateLearningsRequest`
- Response types: `PaginatedCyclesResponse`, `PaginatedFeaturesResponse`, `PaginatedLearningsResponse`, `ActiveCyclesResponse`

## File Inventory

### New Files (Backend)
1. `Source/Backend/src/store/cycleStore.ts`
2. `Source/Backend/src/store/featureStore.ts`
3. `Source/Backend/src/store/learningStore.ts`
4. `Source/Backend/src/services/cycle.ts`
5. `Source/Backend/src/services/feature.ts`
6. `Source/Backend/src/services/learning.ts`
7. `Source/Backend/src/routes/cycles.ts`
8. `Source/Backend/src/routes/features.ts`
9. `Source/Backend/src/routes/learnings.ts`

### Modified Files (Backend)
10. `Source/Backend/src/app.ts` — mount new routers
11. `Source/Backend/src/routes/dashboard.ts` — add active-cycles endpoint
12. `Source/Backend/src/services/dashboard.ts` — add getActiveCycles()
13. `Source/Backend/src/metrics.ts` — add new counters

### New Files (Frontend)
14. `Source/Frontend/src/pages/FeaturesPage.tsx`
15. `Source/Frontend/src/pages/LearningsPage.tsx`
16. `Source/Frontend/src/hooks/useFeatures.ts`
17. `Source/Frontend/src/hooks/useLearnings.ts`
18. `Source/Frontend/src/hooks/useActiveCycles.ts`

### Modified Files (Frontend)
19. `Source/Frontend/src/App.tsx` — add routes
20. `Source/Frontend/src/components/Layout.tsx` — add nav items
21. `Source/Frontend/src/api/client.ts` — add API functions
22. `Source/Frontend/src/pages/DashboardPage.tsx` — add ActiveCycles section

### Modified Files (Shared)
23. `Source/Shared/types/workflow.ts` — add new types

### Test Files
24. `Source/Backend/src/__tests__/cycles.test.ts`
25. `Source/Backend/src/__tests__/features.test.ts`
26. `Source/Backend/src/__tests__/learnings.test.ts`
27. `Source/Frontend/src/__tests__/FeaturesPage.test.tsx`
28. `Source/Frontend/src/__tests__/LearningsPage.test.tsx`
29. `Source/Frontend/src/__tests__/ActiveCycles.test.tsx`

**Total: ~29 files (23 source + 6 test)**
