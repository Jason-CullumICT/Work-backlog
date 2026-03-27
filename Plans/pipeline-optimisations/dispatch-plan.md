# Dispatch Plan: Pipeline Optimisations

RISK_LEVEL: medium

## Scope

scope_tag: fullstack
confidence: high

Changes are to team definition markdown files (Teams/) and shared agent configs — not application Source/ code. All files are in the "non-source" category per CLAUDE.md, so fixer agents can edit them directly.

## Stage 1: Planning (complete)

Plan file: `Plans/pipeline-optimisations/plan.md`

## Stage 2: Implementation

Two fixer agents, scoped by file ownership. Since all changes are to Teams/ markdown files (not Source/), both agents operate on the Teams/ directory.

### backend-fixer-1

**Scope:** Team leader pipeline logic changes (early commit, feedback scoping, Inspector conditional)

**Files to edit:**
1. `Teams/TheATeam/team-leader.md`
2. `Teams/TheFixer/team-leader.md`

**Task details:**

Read `Plans/pipeline-optimisations/plan.md` for full context, then apply these changes:

**A) Early commit checkpoint (Change 3)**

In `Teams/TheATeam/team-leader.md`:
- In the Pipeline DAG section (line 67-84), add between Stage 3 and Stage 4:
  ```
  Stage 3.9: early-commit                  (team leader checkpoint)
  ```
- In the Workflow section, add a new subsection `### 4.5. Stage 3.9 -- Early Commit Checkpoint` between sections 4 and 5:
  ```markdown
  ### 4.5. Stage 3.9 -- Early Commit Checkpoint

  After all coders complete successfully, commit and push implementation to the remote before starting QA. This prevents work loss if the pipeline times out during validation.

  ```bash
  git add -A Source/
  git commit -m "wip: ${TASK_TITLE} [pipeline-checkpoint]"
  git push
  ```

  This is a checkpoint operation — the commit will be squashed into the final commit after QA passes.
  ```
- Renumber subsequent sections (old 5 → 5.5, old 6 → 6, etc.)

In `Teams/TheFixer/team-leader.md`:
- In the Pipeline DAG section (line 72-85), add between Stage 2 and Stage 3:
  ```
  Stage 2.9: early-commit                  (team leader checkpoint)
  ```
- In the Workflow section, add a new subsection `### 3.5. Stage 2.9 -- Early Commit Checkpoint` between sections 3 and 4:
  ```markdown
  ### 3.5. Stage 2.9 -- Early Commit Checkpoint

  After all fixers complete successfully, commit and push to the remote before starting verification. This prevents work loss if the pipeline times out during validation.

  ```bash
  git add -A Source/
  git commit -m "wip: ${TASK_TITLE} [pipeline-checkpoint]"
  git push
  ```

  This is a checkpoint operation — the commit will be squashed into the final commit after verification passes.
  ```
- Renumber subsequent sections as needed.

**B) Scoped feedback loops (Change 4)**

In `Teams/TheATeam/team-leader.md`, replace the feedback loop section (lines 163-168) with:
```markdown
### 6. Feedback Loop Handling

After ALL Stage 4 agents complete, check verdicts:
- Maximum **2 feedback iterations** total
- **Scope to the failed layer only:**
  1. Parse the rejecting agent's feedback to identify affected layer(s)
  2. If feedback references only backend files/tests/services → re-run backend-coder(s) only
  3. If feedback references only frontend files/tests/components → re-run frontend-coder(s) only
  4. If feedback references both layers or is ambiguous → re-run both
- Include FULL feedback text from the rejecting agent
- Do NOT re-run coders for layers that passed all QA checks
```

In `Teams/TheFixer/team-leader.md`, replace the feedback loop section (lines ~143-148) with:
```markdown
### 5. Feedback Loop Handling
- Maximum **2 feedback iterations**
- **Scope to the failed layer only:**
  1. Parse the rejecting agent's feedback to identify affected layer(s)
  2. If feedback references only backend files/tests/services → re-run backend-fixer(s) only
  3. If feedback references only frontend files/tests/components → re-run frontend-fixer(s) only
  4. If feedback references both layers or is ambiguous → re-run both
- Include FULL feedback text from failing agent
- Do NOT re-run fixers for layers that passed all verification checks
```

**C) Conditional Inspector (Change 2)**

In `Teams/TheFixer/team-leader.md`, add a new section after the verification stage (before Completion):
```markdown
### 5.5. Conditional Inspector Dispatch

TheInspector audit is conditional for TheFixer cycles to save time on low-risk changes:

| Condition | Action |
|-----------|--------|
| planner.confidence == `high` AND scope_tag IN [`backend-only`, `frontend-only`] | **Skip** Inspector |
| planner.confidence == `low` OR scope_tag == `fullstack` | **Run** full Inspector audit |
| Any QA agent verdict is `rejected` after feedback loops exhausted | **Run** full Inspector audit |

When skipping Inspector, log the decision: "Inspector skipped: low-risk TheFixer cycle (confidence={confidence}, scope={scope_tag})"
```

In `Teams/TheATeam/team-leader.md`, add a note in the Important Rules section:
```
- **Always run TheInspector** for TheATeam cycles -- TheATeam handles greenfield features which are always high-risk
```

### frontend-fixer-1

**Scope:** Model downgrades in README files + Playwright chromium guard

**Files to edit:**
1. `Teams/TheATeam/README.md`
2. `Teams/TheFixer/README.md`
3. `Teams/Shared/design-critic.md`

**Task details:**

Read `Plans/pipeline-optimisations/plan.md` for full context, then apply these changes:

**A) Downgrade traceability-reporter to haiku (Change 1)**

In `Teams/TheATeam/README.md`:
- Line 19: Change `| `traceability-reporter` | sonnet |` to `| `traceability-reporter` | **haiku** |`
- In the pipeline ASCII art (lines 62-63): Change `| Traceability       [sonnet] |` to `| Traceability       [haiku]  |`

**B) Downgrade verify-reporter to haiku (Change 1)**

In `Teams/TheFixer/README.md`:
- Line 14: Change `| `verify-reporter` | sonnet |` to `| `verify-reporter` | **haiku** |`
- In the pipeline ASCII art (line 48): Change `Verify & Report  [sonnet]` to `Verify & Report  [haiku]`

**C) Playwright chromium install guard (Change 6)**

In `Teams/Shared/design-critic.md`, add a new section before the main workflow:
```markdown
## Prerequisites

Before running any Playwright browser commands, check if Chromium is already installed to avoid redundant downloads:

```bash
if npx playwright install --dry-run chromium 2>&1 | grep -q "already installed"; then
  echo "Chromium already present, skipping install"
else
  npx playwright install chromium
fi
```

Skip the install step if running in a Docker image that pre-bundles Playwright browsers.
```

## Stage 3: Verification

After both fixers complete, run verification:
- `verify-reporter`: Run a diff check on all modified files to confirm changes match the plan
- `security-spotter`: Read-only review of changed team definition files (low-risk, haiku)

## Notes

- **Change 5 (LearningsSync removal) is N/A** — no `lib/` directory or `LearningsSync` class exists in the codebase. Already resolved.
- **"Team routing" model downgrade** — no dedicated team-routing agent exists. The work router is application code in `Source/Backend/src/services/router.ts`. If an orchestrator-level routing agent is added later, it should default to haiku. No action needed now.
- All changes are to Teams/ markdown files, not Source/ code. Verification should focus on content correctness rather than test suites.
