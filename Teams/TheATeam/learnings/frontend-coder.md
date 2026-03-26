# Frontend Coder Learnings

## 2026-03-26: Self-Judging Workflow Engine

- Shared types at `Source/Shared/types/workflow.ts` were created by api-contract agent — use relative imports `../../../Shared/types/workflow`
- API client and hooks (`useWorkItems`, `useWorkItem`) were created by frontend-coder-2 — reuse them, don't duplicate
- StatusBadge and PriorityBadge components also created by frontend-coder-2
- Vite proxy config points `/api` to `http://localhost:3000` for dev
- React Router v6 future flag warnings are benign in tests — no action needed
- When testing with mocked pages that render text matching nav links (e.g. "Dashboard"), use `getAllByText` instead of `getByText`
- DashboardActivityResponse has extended ChangeHistoryEntry with `workItemId` and `workItemDocId` fields

## frontend-coder-2 Learnings (WorkItemListPage + WorkItemDetailPage)

- When testing pages with filter dropdowns, `getByText` matches both filter `<option>` elements and badge content. Use `within(row).getByTestId()` to scope queries.
- HistoryEntry renders reason with an em-dash prefix in a `<span>`, so use regex patterns (`/Auto-routed/`) for partial text matching in tests.
- Avoid identical values in test fixtures when a field value might collide with a badge value (e.g. priority "medium" and complexity "medium").
- Layout component already applies padding and max-width to `<main>`, so page components should not add their own outer padding.
- tsconfig has `noUnusedLocals: true` — with `jsx: "react-jsx"`, don't add `import React from 'react'` in test files (not needed, causes TS6133)
- E2E tests require both frontend dev server (port 5173) and backend (port 3000) running — `net::ERR_CONNECTION_REFUSED` means servers aren't started, not a code bug
