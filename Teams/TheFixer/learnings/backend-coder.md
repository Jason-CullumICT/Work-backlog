# Backend Coder Learnings (TheFixer)

## Store Pattern
- The work item store uses in-memory Map with JSON file persistence
- `persistToFile()` is called after every mutation (create, update, delete)
- `loadFromFile()` restores state on startup, including the docId counter
- Persistence path configurable via `WORK_ITEMS_FILE` env var

## Change History
- `updateWorkItem` now tracks per-field changes in changeHistory automatically
- Only trackable domain fields are logged (title, description, type, status, priority, source, complexity, route, assignedTeam)
- Changes with same old/new value are skipped (no-op detection)

## Validation
- `createWorkItem` validates title and description are non-empty (throws on blank/whitespace)
- Validation happens at the store layer, before the model factory

## Test Environment
- Tests use `resetStore()` in beforeEach and clean up persistence files
- jest.config.js maps `@shared/*` to `../Shared/*`
- Backend tests run with `npx jest --forceExit --detectOpenHandles`

## Pipeline Optimisations (2026-03-27)
- Pipeline optimisation changes are to Teams/ markdown files, not Source/Backend/ — no backend code changes needed
- E2E test failures from `net::ERR_CONNECTION_REFUSED` at localhost:5173 are frontend server issues, not backend
- All 6 pipeline optimisation items mapped to Teams/ files: model downgrades, conditional Inspector, early commit, scoped feedback loops, dead code removal (N/A), Playwright chromium guard
