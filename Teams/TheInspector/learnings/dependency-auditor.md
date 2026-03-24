# Dependency Auditor Learnings
**Run ID:** run-20260324-232923
**Date:** 2026-03-24

## Project Context
- Workflow Management System (web-application domain)
- Backend: Node.js/TypeScript with Express + SQLite (better-sqlite3) + Knex
- Frontend: React 19 + Vite 8 + Tailwind CSS 4 + react-router-dom 7

## Audit Findings Summary
- Backend: 8 prod deps, 9 dev deps, ~239 transitive packages (well under 500 threshold)
- Frontend: 6 prod deps, 17 dev deps, ~203 transitive packages (well under 500 threshold)
- No critical or high CVEs in either project
- 4 moderate CVEs in backend (esbuild/vite/vitest chain, GHSA-67mh-4wv8-2f99) — dev-only impact
- All licenses are MIT, Apache-2.0, or BSD-2-Clause — no GPL/AGPL issues
- No abandoned packages detected
- Supply chain: esbuild has a postinstall script (standard behavior for this package), better-sqlite3 uses node-gyp (native module, expected)

## Key Version Gaps Found
- `better-sqlite3`: current 9.x, latest 12.x — 3 major versions behind (P2)
- `pino`: current 8.x, latest 10.x — 2 major versions behind (P2)
- `uuid`: current 9.x, latest 13.x — 4 major versions behind (P2)
- `express`: current 4.x, latest 5.x — 1 major version behind (P3)
- `vitest` (backend): current 1.x, latest 4.x — 3 major versions behind (P2, also has CVE chain)
- `typescript`: current 5.x, latest 6.x — 1 major behind in both backend and frontend (P3)
- `@types/express`: current 4.x, latest 5.x (matches express major, P3)
- `pino-http`: current 9.x, latest 11.x — 2 majors behind (P2)

## Methodology Notes
- `npm audit --json` works reliably for CVE detection
- `npm outdated --json` exit code 1 when outdated packages exist (normal behavior — don't treat as error)
- Transitive dep count: use `node_modules/.package-lock.json` with python3 parsing, or count `node_modules/` dir entries
- Install scripts check: glob `node_modules/*/package.json` and inspect `scripts.postinstall/preinstall/install`
- For major version gap calculation: compare `current` vs `latest` in npm outdated output

## Reusable Patterns
- `npm audit --json` + python3 parsing is the most reliable audit approach
- Check both package.json `license` field and spdx for compliance
- esbuild postinstall is standard (binary download) — not a supply chain concern
- native modules (better-sqlite3, canvas, etc.) will always have install scripts — document but don't flag unless unknown
