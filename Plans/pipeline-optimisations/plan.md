# Plan: Pipeline Optimisations

## Summary

Reduce token waste, prevent work loss on timeout, and remove dead code from the agent pipeline orchestration system. Six changes across team definition files and tooling.

## Risk Assessment

RISK_LEVEL: medium

Rationale: Changes span 8-10 team definition files affecting orchestration behavior. No schema migrations, no auth/security changes, no application source code changes. All changes are to Teams/ markdown files and tools/ scripts.

## Changes

### Change 1: Downgrade mechanical agents to haiku model

**Problem:** `traceability-reporter` (TheATeam) and `verify-reporter` (TheFixer) run on sonnet but perform mechanical/classification tasks (test running, report generation, traceability checking). This wastes expensive sonnet tokens.

**Files to modify:**
- `Teams/TheATeam/README.md` — Change traceability-reporter model from `sonnet` to `haiku` (line 19)
- `Teams/TheFixer/README.md` — Change verify-reporter model from `sonnet` to `haiku` (line 14)

**Note on "team routing":** The task mentions downgrading "team routing" to haiku. The work router is implemented in `Source/Backend/src/services/router.ts` as application code (not an agent). No agent role file exists for team routing. If a routing agent is added to the orchestrator layer in the future, it should default to haiku. No changes needed now.

### Change 2: Make Inspector conditional

**Problem:** TheInspector runs a full audit suite on every cycle, including low-risk TheFixer runs where it adds latency without proportional value.

**Files to modify:**
- `Teams/TheFixer/team-leader.md` — Add a section after Stage 3 verification that makes TheInspector dispatch conditional:
  - **Skip** for TheFixer cycles where planner reports `confidence: high` AND scope is `backend-only` or `frontend-only` (low-risk)
  - **Run** for TheFixer cycles where planner reports `confidence: low` OR scope is `fullstack` (higher risk)
- `Teams/TheATeam/team-leader.md` — Add a note that TheInspector always runs for TheATeam cycles (no change to behavior, just document the rule)

**Logic:** After Stage 3 verification completes, the team leader evaluates risk:
```
IF team == TheFixer AND planner.confidence == "high" AND scope_tag IN ["backend-only", "frontend-only"]:
  SKIP Inspector
ELSE:
  DISPATCH Inspector (full suite)
```

### Change 3: Add early commit after implementation (Phase 3.9)

**Problem:** If the pipeline times out during validation (Stage 3/4), all implementation work is lost because code hasn't been pushed to the remote yet.

**Files to modify:**
- `Teams/TheATeam/team-leader.md` — Add Stage 3.9 between implementation (Stage 3) and QA (Stage 4):
  ```
  Stage 3.9: early-commit (team leader runs git add + git commit + git push)
  ```
- `Teams/TheFixer/team-leader.md` — Add Stage 2.9 between fixing (Stage 2) and verification (Stage 3):
  ```
  Stage 2.9: early-commit (team leader runs git add + git commit + git push)
  ```

**Commit message format:** `wip: <task_title> [pipeline-checkpoint]` — clearly marked as work-in-progress so it can be squashed later.

**Implementation:** The team leader (as orchestrator) runs bash commands to commit and push. This is an exception to the "no implementation work" rule — it's a checkpoint operation, not code editing.

### Change 4: Scope feedback loops to failed layer only

**Problem:** When a QA agent rejects, the feedback loop re-runs ALL coders/fixers instead of only the layer (frontend/backend) that failed.

**Current behavior in TheATeam (line 167):** "Only re-run the coder(s) whose layer is affected" — this is already documented but needs enforcement language.

**Files to modify:**
- `Teams/TheATeam/team-leader.md` — Strengthen feedback loop section (lines 163-168):
  - Add explicit rule: "Parse the rejecting agent's feedback to identify which layer (backend/frontend) is affected"
  - Add rule: "If feedback mentions only backend files/tests → re-run backend-coder(s) only"
  - Add rule: "If feedback mentions only frontend files/tests → re-run frontend-coder(s) only"
  - Add rule: "If feedback mentions both or is ambiguous → re-run both layers"
- `Teams/TheFixer/team-leader.md` — Mirror the same scoped feedback rules in the feedback loop section (lines ~143-148)

### Change 5: Remove dead LearningsSync class from lib/

**Status: N/A — Already resolved.**

No `lib/` directory exists in the repository. No `LearningsSync` class was found anywhere in the codebase via grep. Learnings sync already operates as in-worker bash scripts (agents read/write `Teams/{team}/learnings/{role}.md` directly). No action needed.

### Change 6: Skip Playwright chromium install if already present

**Problem:** Playwright chromium install runs on every pipeline cycle even when the Docker image already has it cached.

**Files to modify:**
- `Teams/Shared/design-critic.md` — Add a prerequisite check section:
  ```
  Before running any Playwright commands, check if chromium is already installed:
  npx playwright install --dry-run chromium 2>/dev/null || npx playwright install chromium
  ```
- Any visual-playwright role file (currently inline in team-leader.md) — Add the same guard

**Note:** No dedicated `visual-playwright.md` role file exists. The visual-playwright agent is referenced in team-leader.md files but has no standalone role definition. The chromium install guard should be added to `Teams/Shared/design-critic.md` (the only Playwright-using agent with a role file) and documented as a standard practice in both team READMEs.

## File Change Summary

| File | Change Type | Change Description |
|------|------------|-------------------|
| `Teams/TheATeam/README.md` | Edit | traceability-reporter model: sonnet → haiku |
| `Teams/TheFixer/README.md` | Edit | verify-reporter model: sonnet → haiku |
| `Teams/TheATeam/team-leader.md` | Edit | Add Stage 3.9 early commit, strengthen feedback loop scoping, document Inspector always-run rule |
| `Teams/TheFixer/team-leader.md` | Edit | Add Stage 2.9 early commit, add conditional Inspector logic, add scoped feedback loop rules |
| `Teams/Shared/design-critic.md` | Edit | Add chromium install guard |
