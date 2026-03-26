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

## 2026-03-26: Workflow Definitions (frontend-coder-1)

- Shared types are now available — `useWorkflows.ts` imports from `../../../Shared/types/workflow` and re-exports for consumers
- When switching from local type stubs to shared enum types, all test fixtures using string literals must be updated to use enum values (e.g., `StageType.Intake` instead of `'intake'`)
- Shared types use enums (`StageType`, `WorkItemRoute`, `RuleOperator`, `ConsensusRule`, `WorkItemStatus`) not string literals — form state and handlers must use enum values
- `WorkflowFlowDiagram` is a pure SVG component taking `nodes: FlowNode[]` and `edges: FlowEdge[]` — no external diagram libs needed
- SVG node shapes: input=rounded-rect, queue/worklist=rect, router/dispatch=diamond(polygon), assessment-pod/team=circle
- Edges use cubic bezier curves with arrowhead markers; dashed `strokeDasharray="6,4"` for fast-track path
- `useWorkflowFlow(id)` is a separate hook from `useWorkflow(id)` — fetches from `/api/workflows/:id/flow`
- Mock `WorkflowFlowDiagram` in page tests to isolate concerns — test SVG rendering separately in component tests
- Workflow routes added: `/workflows/:id` (detail). List/create pages handled by frontend-coder-2

## 2026-03-26: Workflow Definitions (frontend-coder-2)

- Workflow types and API client already in `useWorkflows.ts` (by frontend-coder-1) — import types and `workflowsApi` from there, don't duplicate in `api/client.ts`
- Mock `useWorkflows` hook in WorkflowListPage tests (mock the module), mock `workflowsApi` in CreateWorkflowPage tests
- The `useWorkflows()` hook returns `{ workflows, loading, error, refresh }` — note `workflows` not `data`
- CreateWorkflowPage uses `workflowsApi.create()` directly (not through a hook mutation) for simpler control flow
- All stage types pre-checked by default in create form to match the default workflow pattern
- Default assessment roles: pod-lead, requirements-reviewer, domain-expert, work-definer
- `tsconfig.noUnusedLocals` — be careful with `waitFor` import in test files that don't use async assertions
- App.tsx was missing `/workflows` and `/workflows/new` routes — frontend-coder-1 only added `/workflows/:id`. Always check wiring audit for all route registrations
- Route order matters: `/workflows/new` must come before `/workflows/:id` so "new" isn't matched as a param
