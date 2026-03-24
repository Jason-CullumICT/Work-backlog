# Chaos Monkey Learnings — TheInspector

## Run: run-20260324-232923
## Date: 2026-03-24
## Mode: Static (services down)

---

## System Overview

- **Stack:** Express.js + Knex + better-sqlite3 (SQLite) backend, TypeScript throughout
- **Architecture:** Route -> Service layer -> Knex DB. No framework bypass violations found.
- **State machine:** `stateMachine.ts` with explicit `TRANSITION_MAP` and `validateTransition()`.
- **Observability:** pino structured logging, prom-client Prometheus metrics, request logger middleware.

---

## Critical Findings Summary

### P1 Findings (2)
1. **No SIGTERM/SIGINT graceful shutdown** — `server.ts` calls `app.listen()` with no shutdown handlers. SQLite WAL-mode writes in flight at kill time can corrupt the database. The server module never captures `process.on('SIGTERM')` or `process.on('SIGINT')`.
2. **No `process.on('uncaughtException')` / `process.on('unhandledRejection')` handlers** — Any unexpected throw or rejected promise outside Express middleware will crash Node without a structured log entry.

### P2 Findings (3)
3. **Race condition in `propose()` — no transaction wrapping** — `workflowService.propose()` performs three sequential DB writes (insert proposal, insert change_history, update work_item status) without a transaction. A crash between any two writes leaves the database in an inconsistent state.
4. **Race condition in `review()` — no transaction wrapping** — Same pattern as `propose()`: insert review, insert change_history, update work_item status are three separate awaits with no wrapping transaction.
5. **Race condition in `transition()` — no transaction wrapping** — `workflowService.transition()` records change history then updates status in two separate awaits without a transaction. Concurrent transitions on the same item could produce duplicate state machine jumps.

### P3 Findings (4)
6. **No request body size limit** — `app.ts` uses `express.json()` with no `limit` option. A large JSON payload (>1 MB, up to Node's default) can cause OOM on a constrained host.
7. **`/health` endpoint does not check DB liveness** — Reports `{status: "ok"}` regardless of DB state. A corrupted or locked SQLite file will not be detected until a real request fails.
8. **Intake dedup is not atomic** — `findBySourceAndExternalId` + `workItemService.create` are two separate operations. Under concurrent webhook delivery of the same ticket, two identical work items can be created (TOCTOU).
9. **`update()` in `workItemService` is non-atomic** — read-then-write of `work_items` and sequential inserts into `change_history` are not wrapped in a transaction. Partial writes produce orphaned change history entries.

### P4 Findings (2)
10. **No query timeout / statement timeout configured** — Knex/better-sqlite3 has no `acquireConnectionTimeout` or per-query timeout set. A slow filesystem (e.g., network-mounted SQLite) can block the event loop indefinitely.
11. **`getBoard()` fetches all work items with no LIMIT** — `db('work_items').orderBy('created_at', 'desc')` with no pagination. As the dataset grows this will serialize large objects into memory and onto the wire.

---

## Invariants Checked (12 total)

1. SIGTERM/SIGINT handler presence
2. uncaughtException/unhandledRejection handler presence
3. Express error handler registration order
4. All async route handlers wrapped in try/catch -> next(err)
5. State machine TRANSITION_MAP completeness (all statuses present, terminal state enforced)
6. validateTransition guards unknown current status
7. DB writes in multi-step workflows wrapped in transactions
8. Request body size limits configured
9. Health endpoint DB probe
10. Dedup atomicity (TOCTOU)
11. Query/connection timeouts
12. Unbounded list queries

---

## Patterns and Lessons Learned

- **SQLite + Knex**: `better-sqlite3` is synchronous at the driver level; Knex wraps it asynchronously. Transactions are critical to avoid partial-write corruption, especially for workflow state transitions that span multiple tables.
- **No external services**: This backend has no outbound HTTP calls, so circuit breaker / retry analysis is N/A. All chaos risk is internal (DB, process signals, memory).
- **State machine is clean**: `TRANSITION_MAP` covers all 7 statuses including terminal `done: []`. `validateTransition` guards unknown statuses. The only gap is concurrency — the guard runs outside a transaction.
- **Error handler is well-structured**: `errorHandler.ts` correctly handles `ValidationError` (400) and `NotFoundError` (404) and logs everything else as 500. All routes use `next(err)` pattern consistently — no swallowed errors found.
- **No graceful shutdown = data loss risk on restart**: This is the single most impactful gap for the "backend restart" chaos scenario.
