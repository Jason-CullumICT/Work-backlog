# Red Teamer Learnings — TheInspector

**Run ID:** run-20260324-232923
**Date:** 2026-03-24
**Mode:** Static analysis (services DOWN)

## Project Context

- Workflow management system (Express/TypeScript backend, React/Vite frontend)
- SQLite via Knex ORM — no raw SQL used, parameterized queries throughout
- No authentication system exists at all — this is the most critical finding
- No payment, PII, or admin-specific routes — threat model from config.yml was hypothetical

## Key Findings Summary

### P1 Issues
1. **Complete absence of authentication** — every API endpoint is publicly accessible with zero credentials required
2. **No authorization middleware** — any anonymous client can create, update, delete, and transition any work item
3. **Unauthenticated metrics endpoint** — `/metrics` exposes Prometheus internal metrics publicly

### P2 Issues
1. **Mass assignment vulnerability** in PATCH `/api/work-items/:id` — `UpdateWorkItemInput` loop does not whitelist fields; any key sent in JSON body (except `changed_by`) becomes a DB update column
2. **Webhook endpoints have no authentication** — `/api/intake/zendesk` and `/api/intake/integration` accept payloads from any anonymous caller
3. **Missing CORS policy** — no cors middleware; browser policy not defined server-side
4. **No request size limits** — `express.json()` used without `limit` option; enables memory pressure / DoS

### P3 Issues
1. **`changedBy` user identity is fully client-controlled** — callers supply arbitrary strings; no user session validates identity
2. **No rate limiting** on any endpoint — no protection against brute force or resource exhaustion
3. **`.env` file not excluded by .gitignore** — no root `.gitignore` and no backend `.gitignore`; risk of committing credentials

## Technical Observations

- Knex ORM parameterizes all queries correctly; no SQL injection vectors found
- React frontend uses `dangerouslySetInnerHTML` nowhere; XSS surface is low
- Error handler correctly returns generic "Internal server error" for 500s — no stack leakage to clients
- UUIDs used for all IDs — enumeration attacks are mitigated
- Validation of enums (type, priority, source) is correct but applied only where backend cares

## Attack Surface Map

| Endpoint | Auth Required | Notes |
|----------|-------------|-------|
| GET /api/work-items | No | Lists all work items to any caller |
| POST /api/work-items | No | Creates items as any identity |
| PATCH /api/work-items/:id | No | Mass assignment risk + no auth |
| DELETE /api/work-items/:id | No | Deletes any item, no auth |
| POST /api/work-items/:id/transition | No | Advances workflow with any identity |
| POST /api/work-items/:id/propose | No | Submits proposal with any identity |
| POST /api/work-items/:id/review | No | Approves/rejects with any identity |
| POST /api/intake/zendesk | No | No HMAC signature verification |
| POST /api/intake/integration | No | No auth, source can be any string |
| GET /metrics | No | Internal metrics exposed publicly |

## Recommendations for Future Audits

- When auth is added, verify: JWT secret strength, token expiry, refresh token security
- When roles/RBAC added, test: privilege escalation paths, horizontal access controls
- Watch for N+1 queries as work item counts grow (dashboardService loads all items)
- The `getBoard()` query has no LIMIT — unbounded result set risk at scale
