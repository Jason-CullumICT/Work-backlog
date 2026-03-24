# Performance Profiler Learnings
## Project: Workflow Management System (Express.js + Knex + better-sqlite3)
## Audit Date: 2026-03-24 | Run: run-20260324-232923 | Mode: Static

---

## Stack Summary

- Runtime: Node.js / Express.js
- ORM: Knex (query builder, not full ORM)
- Database: better-sqlite3 (single-file, synchronous driver)
- Migration count: 1 (001_initial_schema.ts)
- Tables: work_items, change_history, proposals, reviews

---

## Key Findings (First Audit Baseline)

### Critical Missing Indexes (P1)

1. `change_history.work_item_id` — FK column with no index. Every getByWorkItemId, cascade delete, and history lookup performs a full table scan. This is the single highest-risk finding because the table grows with every field update on every work item (unbounded growth).

2. `work_items.status` — Used in WHERE clause on all list/board queries but has no index.

3. `work_items.type`, `work_items.priority`, `work_items.queue`, `work_items.source` — All used as filter columns in WorkItemFilters; none are indexed.

4. `proposals.work_item_id` — FK with no index.

5. `reviews.work_item_id` — FK with no index.

6. Composite dedup query: `work_items WHERE source = ? AND external_id = ?` — no composite index on (source, external_id). The intake dedup path hits this on every webhook.

### N+1 / Sequential DB Writes (P2)

- `changeHistoryService.recordChanges()` calls `recordChange()` in a `for` loop, issuing one INSERT per changed field. An update touching 5 fields = 5 sequential round-trips. Fix: batch insert with `db('change_history').insert([...entries])`.

### Unbounded Queries (P2)

- `workItemService.list()` — no LIMIT. Returns all rows matching filters. In production with thousands of items this will be a full table scan + large payload.
- `changeHistoryService.getByWorkItemId()` — no LIMIT. All history for a work item is returned unbounded.
- `dashboardService.getBoard()` — fetches ALL work_items with `db('work_items').orderBy(...)`, no LIMIT, then groups in JS. This is both an unbounded DB query and an application-layer grouping that should be done in SQL.

### Extra DB Round-Trips (P2)

- `workItemService.update()` issues: SELECT (existence check) + N INSERTs (change history) + UPDATE + SELECT (re-fetch). The final SELECT is unnecessary — Knex/SQLite does not natively support RETURNING but the updated values are known; the service could construct the updated object without a 4th query.
- `workflowService.transition()` issues: SELECT + INSERT (history) + UPDATE + SELECT (re-fetch). Same extra re-fetch.
- `workflowService.propose()` issues: SELECT + INSERT (proposals) + INSERT (change_history) + UPDATE.
- `workflowService.review()` issues: SELECT + INSERT (reviews) + INSERT (change_history) + UPDATE.
- `GET /api/work-items/:id/history` — first calls `workItemService.getById()` which itself issues 2 queries (work_item + change_history), then calls `getByWorkItemId()` again — fetching change_history twice.

### No Pagination on List Endpoints (P2)

- `GET /api/work-items` has no page/limit parameters.
- `GET /api/dashboard/board` returns all items across all statuses.

---

## Profiling Commands for This Stack

```bash
# Check SQLite indexes on a database file
sqlite3 /path/to/db.sqlite ".indexes"
sqlite3 /path/to/db.sqlite ".schema work_items"

# Query explain plan (for a running instance)
sqlite3 /path/to/db.sqlite "EXPLAIN QUERY PLAN SELECT * FROM change_history WHERE work_item_id = 'xxx'"

# Count rows per table
sqlite3 /path/to/db.sqlite "SELECT 'work_items', count(*) FROM work_items UNION ALL SELECT 'change_history', count(*) FROM change_history"
```

---

## Recommended Index Migration

A second migration should add:

```sql
CREATE INDEX idx_change_history_work_item_id ON change_history(work_item_id);
CREATE INDEX idx_proposals_work_item_id ON proposals(work_item_id);
CREATE INDEX idx_reviews_work_item_id ON reviews(work_item_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_source_external_id ON work_items(source, external_id);
CREATE INDEX idx_work_items_type ON work_items(type);
CREATE INDEX idx_work_items_priority ON work_items(priority);
```

---

## Notes on better-sqlite3

- The driver is synchronous. Knex wraps it in promises but all I/O blocks the Node.js event loop. Under concurrent load this can cause event loop lag.
- SQLite with WAL mode performs better under concurrent reads. Current config does not enable WAL mode — should add `db.pragma('journal_mode = WAL')` in `database.ts`.
- Connection pooling is irrelevant for SQLite (single writer), but WAL allows concurrent readers.

---

## Endpoint Inventory (Static Analysis)

| Method | Path | Issues Noted |
|--------|------|-------------|
| GET | /health | Clean |
| GET | /metrics | Clean |
| POST | /api/work-items | 1 INSERT — fine |
| GET | /api/work-items | Unbounded, unindexed filter columns |
| GET | /api/work-items/:id | 2 queries (item + history) |
| PATCH | /api/work-items/:id | 4+ queries, N+1 history inserts |
| DELETE | /api/work-items/:id | 1 DELETE — fine |
| GET | /api/work-items/:id/history | history fetched twice (double query) |
| POST | /api/work-items/:id/transition | 4 queries + extra re-fetch |
| POST | /api/work-items/:id/propose | 4 queries |
| POST | /api/work-items/:id/review | 4 queries |
| POST | /api/intake/zendesk | dedup query on unindexed (source, external_id) |
| POST | /api/intake/integration | same as above |
| GET | /api/dashboard/summary | GROUP BY — efficient |
| GET | /api/dashboard/board | full table scan, no LIMIT |

Total endpoints analysed: 15
