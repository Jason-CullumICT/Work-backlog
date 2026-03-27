# Design QA Report: Pipeline Optimisations

**Reviewer:** design (TheFixer)
**Date:** 2026-03-27
**RISK_LEVEL: medium**

---

## Executive Summary

All 6 planned changes have been reviewed against the plan at `Plans/pipeline-optimisations/plan.md`. Five changes were implemented correctly. One change (Change 5 — LearningsSync removal) was correctly identified as N/A during planning (no `lib/` directory or `LearningsSync` class exists). The traceability enforcer **PASSED**.

The implementation is **correct and complete**. No critical issues found. Two medium findings and two low findings noted below.

---

## Change Verification Matrix

| Change | Description | Plan File | Status | Notes |
|--------|-------------|-----------|--------|-------|
| 1 | Downgrade mechanical agents to haiku | `TheATeam/README.md`, `TheFixer/README.md` | **IMPLEMENTED** | traceability-reporter and verify-reporter both changed to haiku |
| 2 | Conditional Inspector | `TheFixer/team-leader.md` | **IMPLEMENTED** | Skip logic added at §5.5, TheATeam always-run rule added |
| 3 | Early commit checkpoint | Both `team-leader.md` files | **IMPLEMENTED** | Stage 3.9 (TheATeam) and Stage 2.9 (TheFixer) added |
| 4 | Scoped feedback loops | Both `team-leader.md` files | **IMPLEMENTED** | 4-rule layer parsing added to both teams |
| 5 | Remove dead LearningsSync | N/A | **N/A — CORRECT** | No `lib/` or `LearningsSync` exists in codebase |
| 6 | Playwright chromium guard | `Shared/design-critic.md` | **IMPLEMENTED** | Prerequisites section with install guard added |

---

## Traceability

```
python3 tools/traceability-enforcer.py
TRACEABILITY PASSED: All requirements have implementation references.
```

No regressions introduced to FR traceability by these changes (changes are to Teams/ markdown, not Source/).

---

## Findings

### MEDIUM

#### M1 — Early commit uses `git add -A Source/` which may stage unrelated files

**Files:** `Teams/TheATeam/team-leader.md:153`, `Teams/TheFixer/team-leader.md:134`

The early commit checkpoint runs `git add -A Source/` which stages ALL changes under `Source/`, not just the changes made by the current pipeline run. If there are pre-existing unstaged changes in `Source/` from a prior failed run or manual edits, they will be swept into the checkpoint commit.

**Impact:** Could conflate unrelated changes into a wip commit. Low likelihood in CI (clean workspace), higher likelihood in local dev.

**Recommendation:** Consider scoping to specific files from the plan's file list, or document the assumption that the workspace is clean at pipeline start.

#### M2 — Conditional Inspector logic has no fallback for missing planner fields

**File:** `Teams/TheFixer/team-leader.md:166-175`

The Inspector skip logic depends on `planner.confidence` and `scope_tag` values. If the planner agent fails to report these fields (e.g., crash, timeout, or format change), the conditional logic has no explicit default behavior.

**Recommendation:** Add a fallback rule: "If confidence or scope_tag is missing/undefined, treat as high-risk and run Inspector." This aligns with fail-safe design.

---

### LOW

#### L1 — "Team routing" downgrade noted as N/A but not documented in plan output

**File:** `Plans/pipeline-optimisations/plan.md:23`

The plan correctly notes that no team-routing agent exists (it's application code in `Source/Backend/src/services/router.ts`). However, the task description mentions "team routing" as item (1). The plan documents this gap, but the dispatch plan doesn't explicitly call it out as a resolved N/A. No action needed — just noting for completeness.

#### L2 — Chromium guard `--dry-run` flag may not exist in all Playwright versions

**File:** `Teams/Shared/design-critic.md:12`

The guard uses `npx playwright install --dry-run chromium`. The `--dry-run` flag was added in Playwright 1.30+. If the project pins an older version, this check would fail and always trigger a reinstall (safe but noisy).

**Impact:** No functional harm — worst case is an unnecessary reinstall. The guard still saves time in the happy path.

---

### INFO

#### I1 — All changes are consistent across both teams

The early commit, feedback scoping, and model downgrade changes mirror correctly between TheATeam and TheFixer with appropriate team-specific adjustments (Stage 3.9 vs 2.9, coder vs fixer terminology).

#### I2 — Pipeline DAG diagrams updated consistently

Both `team-leader.md` files and both `README.md` files have their ASCII art pipeline diagrams and agent tables updated to reflect the new stages and model changes. No diagram/table mismatches.

#### I3 — No Source/ code changes

All changes are to Teams/ markdown files and the plan. No application source code was modified, eliminating risk of runtime regressions.

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | PASS | Changes are to orchestration config, not domain logic |
| No Source/ edits by non-pipeline agents | PASS | All edits are in Teams/ |
| Shared types unchanged | PASS | No type changes |
| Observability maintained | PASS | No observability regressions |
| Module ownership respected | PASS | Teams/ files edited by appropriate agents |

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 2 |
| INFO | 3 |

---

## E2E Tests

Regression E2E tests written to `Source/E2E/tests/cycle-run-1774572910837-a438fded/`:
- `dashboard.spec.ts` — Dashboard page renders, summary cards visible, no console errors
- `work-item-list.spec.ts` — List page renders, filter controls visible, no console errors
- `create-work-item.spec.ts` — Form renders, field validation, form submission, no console errors
- `full-workflow.spec.ts` — Cross-page navigation, API-based item creation and routing, no console errors

These tests verify the existing workflow feature is not regressed by the pipeline configuration changes.

---

## Verdict

**APPROVED.**

All planned changes implemented correctly. No critical or high severity issues. Two medium findings (M1: early commit scope, M2: Inspector fallback for missing planner fields) are acceptable for the current implementation but should be addressed in a follow-up if pipeline reliability issues surface.

RISK_LEVEL: medium
