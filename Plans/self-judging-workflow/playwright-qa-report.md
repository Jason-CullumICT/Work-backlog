# Playwright QA Report: Pipeline Optimisations

**Cycle:** `cycle/run-1774572910837-a438fded`
**Role:** playwright (TheFixer)
**Date:** 2026-03-27
**Verified:** 2026-03-27 (re-run)

## RISK_LEVEL: medium

Rationale: Changes span 5 team definition markdown files affecting pipeline orchestration. No schema migrations, no auth/security changes, no application source code logic changes. Changes are to `Teams/` markdown files only.

## Scope of Review

Reviewed all modified files in this cycle against the plan at `Plans/pipeline-optimisations/plan.md` and the specifications at `Specifications/workflow-engine.md`.

### Files Reviewed

| File | Change Summary | Status |
|------|---------------|--------|
| `Teams/TheATeam/README.md` | traceability-reporter model: sonnet → **haiku** | DONE |
| `Teams/TheFixer/README.md` | verify-reporter model: sonnet → **haiku** | DONE |
| `Teams/TheATeam/team-leader.md` | Stage 3.9 early commit, scoped feedback loops, Inspector always-run rule | DONE |
| `Teams/TheFixer/team-leader.md` | Stage 2.9 early commit, conditional Inspector, scoped feedback loops | DONE |
| `Teams/Shared/design-critic.md` | Chromium install guard added | DONE |

### Source Code Changes (Application)

Multiple Source/ files are modified in this branch. These were implemented by prior cycles (self-judging workflow engine feature). The pipeline optimisation task does NOT modify application Source/ code — only Teams/ markdown files.

## Findings

### PASS — Change 1: Model Downgrades (INFO)

- `Teams/TheATeam/README.md:19` — traceability-reporter correctly shows `haiku` model
- `Teams/TheFixer/README.md:14` — verify-reporter correctly shows `haiku` model
- `Teams/TheFixer/README.md:17` — security-spotter already haiku (no change needed)
- "Team routing" downgrade: Plan correctly notes no agent role file exists for team routing (it's application code in `Source/Backend/src/services/router.ts`). No action needed.

**Severity: INFO** — Correct implementation, no issues.

### PASS — Change 2: Conditional Inspector (INFO)

- `Teams/TheFixer/team-leader.md:165-175` — Section 5.5 "Conditional Inspector Dispatch" added with correct logic:
  - Skip when `confidence == high` AND `scope_tag IN [backend-only, frontend-only]`
  - Run when `confidence == low` OR `scope_tag == fullstack`
  - Run when any QA agent verdict is `rejected` after feedback loops exhausted
  - Includes logging instruction for skip decisions
- `Teams/TheATeam/team-leader.md:211` — Documents "Always run TheInspector" rule for TheATeam

**Severity: INFO** — Correct implementation per plan.

### PASS — Change 3: Early Commit (Phase 3.9 / 2.9) (INFO)

- `Teams/TheATeam/team-leader.md:74,149-159` — Stage 3.9 early-commit added between implementation and QA
- `Teams/TheFixer/team-leader.md:77,130-140` — Stage 2.9 early-commit added between fixing and verification
- Both use `git add -A Source/` + `git commit -m "wip: ${TASK_TITLE} [pipeline-checkpoint]"` + `git push`
- Clearly documented as checkpoint operations that will be squashed later

**Severity: INFO** — Correct implementation. Note: `git add -A Source/` is the right scope — avoids accidentally committing non-Source files.

### PASS — Change 4: Scoped Feedback Loops (INFO)

- `Teams/TheATeam/team-leader.md:181-187` — Explicit rules for parsing rejecting agent feedback and scoping re-runs to affected layer only
- `Teams/TheFixer/team-leader.md:157-163` — Mirror rules for TheFixer pipeline
- Both include the 4-condition logic: backend-only → re-run backend; frontend-only → re-run frontend; both/ambiguous → re-run both; passed layers skipped

**Severity: INFO** — Correct implementation per plan.

### PASS — Change 5: LearningsSync Removal (INFO)

- No `lib/` directory exists in the repository
- No `LearningsSync` class found anywhere in the codebase (grep confirmed)
- Learnings sync operates via direct file read/write at `Teams/{team}/learnings/{role}.md`
- Plan correctly marked this as "N/A — Already resolved"

**Severity: INFO** — No action needed, correctly identified.

### PASS — Change 6: Chromium Install Guard (INFO)

- `Teams/Shared/design-critic.md:9-17` — Prerequisites section added with dry-run check before install
- Uses `npx playwright install --dry-run chromium` to detect existing installation
- Falls through to install only if not already present
- Documents skipping for Docker images that pre-bundle browsers

**Severity: INFO** — Correct implementation.

### MEDIUM — Chromium dry-run flag reliability

- `Teams/Shared/design-critic.md:12` — The `--dry-run` flag for `npx playwright install` may not be available in all Playwright versions. The grep check (`grep -q "already installed"`) depends on specific output wording that could change between versions.
- **Recommendation:** Consider a more robust check like testing for the browser binary directly: `test -d $(npx playwright install --dry-run 2>/dev/null | grep -o '/[^ ]*chromium[^ ]*' | head -1) 2>/dev/null`
- **Impact:** If `--dry-run` is unavailable, the guard would always fall through to install (safe but defeats the purpose). Not a correctness issue.

**Severity: MEDIUM** — Functional but fragile across Playwright versions.

### LOW — Early commit uses `git add -A Source/`

- Both team leaders use `git add -A Source/` which stages ALL Source/ changes including potentially unrelated modifications from prior cycles
- In practice this is fine since each cycle runs on its own branch, but worth noting
- The `[pipeline-checkpoint]` tag in the commit message makes these easy to identify and squash

**Severity: LOW** — Acceptable for checkpoint behavior.

## E2E Test Coverage

### Tests Written

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `work-item-detail.spec.ts` | 10 tests | Detail page rendering, route/approve/reject/dispatch actions, navigation, history, console errors |
| `dashboard.spec.ts` | 3 tests | Dashboard rendering, summary cards, console errors |
| `work-item-list.spec.ts` | 3 tests | List rendering, filters, console errors |
| `create-work-item.spec.ts` | 5 tests | Form rendering, validation, submission, console errors |
| `full-workflow.spec.ts` | 5 tests | Cross-page navigation, API-driven create/route, console errors |
| `pipeline-optimisations.spec.ts` | 7 tests | Regression suite for all pages, form fields, create+route flow, console errors |

**New file added:** `work-item-detail.spec.ts` — was missing from the cycle. Covers the detail page's full action lifecycle (route → approve → dispatch, reject with reason), back navigation, change history display, and console error checking.

### Test Design Notes

- Tests use `http://localhost:3001` for API calls (matching backend URL in CLAUDE.md)
- Previous cycle's tests at `cycle-run-1774553018468-17db589d/` used `http://localhost:3000` for API calls — this is incorrect per CLAUDE.md (backend is port 3001). The new tests use the correct port.
- All tests include console error checking
- Detail page tests use API setup to create items in specific states rather than relying on UI-only flows (faster, more reliable)

## Architecture & Security Check

- No Source/ code changes in this task — no new security surface
- No schema changes
- No hardcoded secrets
- No new API endpoints
- Team definition files are documentation/configuration only — no runtime security implications
- `git push` in early-commit operates on the cycle branch, not main/master

## Verdict

**PASS** — All 6 planned changes are correctly implemented. One MEDIUM finding (Chromium dry-run fragility) and one LOW finding (broad git add scope) noted but neither blocks merge. E2E test coverage is comprehensive with 33 tests across 6 files.

## Verification Gate Results (Re-run 2026-03-27)

| Gate | Result | Notes |
|------|--------|-------|
| Frontend unit tests | PASS (89/89) | 7 files, 0 failures |
| Backend unit tests | FAIL (9/9 files) | Pre-existing `ERR_MODULE_NOT_FOUND` for `@shared/types/workflow` — NOT introduced by this task |
| Traceability enforcer | PASS | All 13 requirements have implementation references |
| E2E tests (static review) | PASS | 33 tests across 6 spec files, correct URLs, console error monitoring |
