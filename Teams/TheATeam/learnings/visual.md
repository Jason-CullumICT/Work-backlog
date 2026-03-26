# Visual (Playwright) Agent Learnings

## 2026-03-26: workflow-from-image cycle

- Backend tests all fail when `@shared/types/workflow` path alias isn't configured in vitest. Always check path alias resolution in test config, not just source code.
- Frontend tests can pass while backend is completely broken. Always run both.
- `npx tsc` doesn't work in this project — TypeScript is a devDependency, use the project's installed version via the correct path.
- The E2E playwright config uses `webServer` to start both backend and frontend. Tests depend on both services running.
- When multiple coders work in parallel, check that all routes are registered in App.tsx and app.ts — easy to miss route registration when one coder builds components and another builds routing.
- Check that frontend hooks import from shared types, not local stubs. The TODO "reconcile later" pattern is a common source of type divergence.
