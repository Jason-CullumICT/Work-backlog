# Design Agent Learnings

## 2026-03-27 — Orchestrator-to-Portal Callback Integration Review

- Backend uses Jest (not Vitest) — check `package.json` scripts before running tests. Running `vitest` on a Jest project shows misleading module resolution errors.
- The `@shared` path alias in `tsconfig.json` works for Jest via `ts-jest` module mapper but not necessarily for `vitest` — always verify the test runner matches the project config.
- When reviewing E2E tests, check for duplicate test suites covering the same feature (found 2 suites both testing Active Cycles dashboard section).
- FR-CB-014 spec requires "work item title" in cycle cards but the API only returns cycle data without denormalized work item info — this is a design gap that should be caught during API contract review, not after implementation.
- Hard waits (`page.waitForTimeout`) in E2E tests are a recurring anti-pattern — flag these as LOW findings.
