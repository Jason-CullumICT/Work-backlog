# Frontend Coder Learnings (TheFixer)

## Import Path Aliases
- The frontend project has `@shared/*` alias configured in both `tsconfig.json` (paths) and `vite.config.ts` (resolve.alias). Always use `@shared/types/workflow` instead of relative `../../../Shared/types/workflow` paths.
- Tests still use relative paths (`../../src/` and `../../../Shared/`) since they run through Vitest which resolves aliases from vite.config.ts — both patterns work in tests.

## Test Timer Patterns
- When testing `setInterval`-based auto-refresh hooks, use `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.advanceTimersByTimeAsync()` + `vi.waitFor()` (not `@testing-library/react` `waitFor`). The `shouldAdvanceTime` option prevents `waitFor` from hanging.

## Existing Implementation Coverage
- FR-WF-010 (WorkItemListPage) and FR-WF-011 (WorkItemDetailPage) are fully implemented with comprehensive tests (89 total frontend tests across 7 test files, all passing).
- Badge components (StatusBadge, PriorityBadge, TypeBadge) all have `data-testid` attributes for reliable test targeting.

## E2E Test Infrastructure
- E2E tests in Source/E2E/ require both frontend (localhost:5173) and backend (localhost:3001) servers to be running. `net::ERR_CONNECTION_REFUSED` failures are infrastructure issues, not code bugs — verify servers are up before diagnosing E2E failures as code problems.
