# Backend Coder Learnings

## FR-WF-001: Work Item Data Model and Store

### Architecture Decisions
- Used `@shared/types/workflow` path alias for shared types — requires `moduleNameMapper` in Jest config and `paths` in tsconfig
- tsconfig `rootDir` set to `..` (Source/) to include Shared types in compilation scope
- In-memory Map for fast lookups, with optional JSON file persistence via constructor parameter
- All store methods return shallow copies to prevent external mutation of internal state

### Key Implementation Notes
- `docId` auto-increments as `WI-XXX` format; counter is restored from persisted data on load
- All field mutations tracked via `changeHistory` — the update method uses a list of trackable fields and compares old vs new values
- Soft delete sets `deleted: true`; `findById` and `findAll` filter these out; `getAll()` includes them for dashboard/metrics
- TypeScript strict mode requires `as unknown as Record<string, unknown>` double-cast for dynamic field access on interfaces

### Testing
- 30 tests covering: create, findById, findAll (with filters + pagination), update (with change tracking), softDelete, persistence, getAll/count
- Tests use a factory helper `makeRequest()` with sensible defaults and overrides
- Persistence tests use `os.tmpdir()` temp files with cleanup in `afterEach`

## FR-WF-004: Work Router Service

### Architecture Decisions
- Router is a pure-function service (`classifyRoute`) that returns route + target status, separated from the orchestration function (`routeWorkItem`) that mutates state
- Fast-track criteria: bug+trivial/small, improvement+trivial/small, or explicit override via `overrideRoute`
- Full-review is the default path — features, issues, and bugs with medium+ complexity all go through assessment
- Team assignment logic (`assignTeam`): TheATeam for features and complex work; TheFixer for bugs/improvements/small changes

### Key Implementation Notes
- Route action performs a transient `routing` status (logged in history) before settling to final status
- Override route (`overrideRoute` param) allows submitters to explicitly fast-track or force full-review
- Change history tracks all three transitions: status→routing, route assignment, status→final

## FR-WF-005: Assessment Pod Service

### Architecture Decisions
- Pod uses synchronous sequential assessment (per design doc) — simpler to implement and debug
- 4 roles: requirements-reviewer (validates completeness), domain-expert (checks domain/edge cases), work-definer (enriches with guidance), pod-lead (aggregates)
- Pod-lead aggregation: all approve → approved; any reject → rejected with synthesized feedback from rejecting roles
- `NeedsClarification` verdict treated same as reject for final status (goes to rejected)

### Key Implementation Notes
- Assessment records are appended (not replaced) — re-assessment accumulates records
- Threshold checks: title min 5 chars, description min 20 chars for requirements-reviewer approval
- Domain expert flags missing complexity as needs-clarification
- Work definer always approves but provides type-specific suggestions

## FR-WF-006: Workflow Action Endpoints

### Architecture Decisions
- All 5 endpoints follow consistent pattern: validate item exists → validate status → execute action → return updated item
- Status transitions validated against `VALID_STATUS_TRANSITIONS` map (defined in shared types)
- Dispatch validates team name is either 'TheATeam' or 'TheFixer'; auto-assigns if not provided

### Key Implementation Notes
- Duplicate store file casing issue discovered: `WorkItemStore.ts` (class-based, backend-coder-1) vs `workItemStore.ts` (function-based, backend-coder-3). Resolved by removing uppercase duplicate — all routes use lowercase import.
- Test imports must use `@shared/types/workflow` (jest moduleNameMapper), not relative `../../../../Shared/...` paths
- 50 tests across 3 suites: router (14 tests), assessment (11 tests), workflow routes (25 tests)

## FR-WF-002: Work Item CRUD API (backend-coder-3)

### Architecture Decisions
- Function-based store module (`workItemStore.ts`) used by all routes — all agents import from `../store/workItemStore`
- CRUD routes validate all enum fields before persisting; returns 400 for invalid values
- PATCH endpoint uses `trackUpdates` from changeHistory service to record field mutations before applying
- DELETE is soft-delete returning 204 No Content

### Key Implementation Notes
- The `src/logger.ts` adapter bridges two logger patterns: backend-coder-1's `utils/logger` (named export) and backend-coder-2's `import logger from '../logger'` (default export with `{msg: '...', ...ctx}` pattern)
- Casing conflict with `WorkItemStore.ts` vs `workItemStore.ts` resolved by removing class-based duplicate
- Express app mounts both CRUD and workflow routes on `/api/work-items` (different HTTP methods/paths prevent collisions)

## FR-WF-003: Change History Tracking (backend-coder-3)

### Key Implementation Notes
- `trackUpdates` iterates trackable fields, compares old vs new, creates ChangeHistoryEntry for each diff
- Double-cast `(item as unknown as Record<string, unknown>)[field]` required for dynamic field access on WorkItem interface
- Change tracking happens on the mutable item reference before store.updateWorkItem is called

## FR-WF-007: Dashboard API (backend-coder-3)

### Architecture Decisions
- Dashboard service reads from store (no caching layer for v1)
- Activity endpoint flattens all changeHistory entries across items, attaches workItemId/docId for traceability
- Queue endpoint groups by all WorkItemStatus values, even if count is 0

## FR-WF-008: Intake Webhooks (backend-coder-3)

### Key Implementation Notes
- Zendesk defaults to type=bug, automated defaults to type=issue (per workflow spec)
- Both endpoints force source field (source=zendesk/automated), preventing spoofing
- Validation limited to title+description required; type/priority have sensible defaults

## FR-WF-013: Observability (backend-coder-3)

### Architecture Decisions
- 4 Prometheus counters: items_created, items_routed, items_assessed, items_dispatched (with labels)
- Structured logger at `utils/logger.ts` with JSON output to stdout
- Error handler middleware logs unhandled errors with stack traces
- Request logging middleware at DEBUG level to avoid noise

## FR-WFD-001: Workflow Data Model and Store

### Architecture Decisions
- Workflow uses same in-memory Map + shallow-copy pattern as workItemStore
- `buildDefaultWorkflow()` uses hardcoded stage IDs (e.g., `stage-intake`) for the seed workflow — makes them deterministic for tests and references
- Store `softDelete` returns `{ success, error? }` object to distinguish between "not found" and "cannot delete default" cases
- Model validation split into 3 functions: `validateStages`, `validateRoutingRules`, `validateAssessmentConfig` — each returns string[] errors

### Key Implementation Notes
- Shared types extended with: `StageType`, `RuleOperator`, `ConsensusRule` enums; `Workflow`, `WorkflowStage`, `RoutingRule`, `RuleCondition`, `AssessmentConfig`, `AssessmentRole` interfaces; `FlowNode`, `FlowEdge`, `WorkflowFlowResponse` for flow graph; `CreateWorkflowRequest`, `UpdateWorkflowRequest` request types
- `workflowId` added as optional field to both `WorkItem` and `CreateWorkItemRequest` (FR-WFD-006)
- Store `updateWorkflow` uses inline `require('../utils/id')` for stages/rules update to generate new IDs when those arrays are replaced
- Default workflow has 4 routing rules: 2 fast-track (bug+trivial/small, improvement+trivial/small), 2 full-review (feature, issue)
- 46 tests across 2 suites: model (24 tests covering builders + validators), store (22 tests covering CRUD + seed + delete protection)

## FR-WFD-002/003/004/005/011: Workflow Definition API, Flow Graph, Service Integration

### Architecture Decisions
- WorkflowService acts as the orchestration layer between routes and store — validates inputs, delegates to store, manages metrics
- Flow graph generation (`generateFlowGraph`) converts workflow stages into positioned `FlowNode[]` and `FlowEdge[]` for frontend SVG rendering
- Columns layout: inputs(x=0) → queue(x=1) → router(x=2) → assessment(x=3) → worklist(x=4) → dispatch(x=5) → teams(x=6)
- Fast-track edge uses `style: 'dashed'`, full-review uses `style: 'solid'` — matches spec
- `routeWithWorkflow` evaluates workflow's `routingRules` with AND logic on conditions, sorted by priority
- `assessWithWorkflow` maps known role IDs to existing assessment functions, applies workflow's `consensusRule`
- Route file named `workflows.ts` (plural) to avoid conflict with existing `workflow.ts` (work item workflow actions)

### Key Implementation Notes
- Import logger as `import logger from '../logger'` (default export compat wrapper) — matches existing route pattern
- Import shared types via relative path `../../../Shared/types/workflow` in route files (same as workItems.ts)
- Import shared types via `@shared/types/workflow` in service/test files (jest moduleNameMapper)
- Metrics: added Counter `workflow_definitions_created_total` and Gauge `workflow_definitions_active` with `Gauge` import from prom-client
- `seedDefaultWorkflow()` called at module level in app.ts, after `errorHandler` registration
- Route registered as `app.use('/api/workflows', workflowDefinitionsRouter)` — import alias avoids naming conflict with existing `workflowRouter`
- 40 new tests across 2 suites: service (21 tests), routes (19 tests)
- `evaluateCondition` uses double-cast `(item as unknown as Record<string, unknown>)` for dynamic field access (same pattern as elsewhere)

## E2E Testing Infrastructure

### Key Discovery
- E2E Playwright tests require both backend (port 3001) and frontend (port 5173) to be running
- Missing `playwright.config.ts` causes all E2E tests to fail with `net::ERR_CONNECTION_REFUSED`
- Created `Source/E2E/playwright.config.ts` with `webServer` config to auto-start both services
- Use `reuseExistingServer: true` so config works whether services are pre-started or not
