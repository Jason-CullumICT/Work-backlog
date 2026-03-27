# Dispatch Plan: Checkpoint-Resume for Pipeline Retries

RISK_LEVEL: medium

## Summary

Backend-only feature adding checkpoint-resume to pipeline retries. Two backend coders (sequential — coder-2 depends on coder-1's types), no frontend coders. Touches ~6 files including 2 new ones.

## Dependencies

```
backend-coder-1 (types + service) → backend-coder-2 (endpoint + metrics)
```

backend-coder-2 MUST wait for backend-coder-1 to complete because it depends on the shared types (PipelineRun, PhaseResult, PhaseStatus, RetryWorkItemRequest) and the pipeline service functions.

## Implementation Agents

### backend-coder-1

**Assigned FRs:** FR-CR-002, FR-CR-007, FR-CR-003, FR-CR-004, FR-CR-005

**Module scope:** `Source/Shared/types/workflow.ts`, `Source/Backend/src/services/pipeline.ts`, `Source/Backend/tests/services/pipeline.test.ts`

**Task:**

1. **Update shared types** (`Source/Shared/types/workflow.ts`):
   - Add `PhaseStatus` enum with values: `pending`, `skipped`, `running`, `completed`, `failed`
   - Add `PhaseResult` interface with fields: `name`, `status`, `startedAt`, `completedAt`, `output`, `skipReason`
   - Add `PipelineRun` interface with fields: `runId`, `attempt`, `phases`, `resumedFrom`, `startedAt`, `completedAt`
   - Add `RetryWorkItemRequest` interface with optional fields: `resumeFrom`, `reason`
   - Add `pipelineRun?: PipelineRun` to the `WorkItem` interface
   - Add `WorkItemStatus.InProgress` to `VALID_STATUS_TRANSITIONS[WorkItemStatus.Failed]` array (currently only `[WorkItemStatus.Backlog]`, becomes `[WorkItemStatus.Backlog, WorkItemStatus.InProgress]`)

2. **Create pipeline service** (`Source/Backend/src/services/pipeline.ts`):
   - Export `PIPELINE_PHASES = ['routing', 'assessment', 'dispatch', 'implementation']` as ordered array
   - Export `buildRetryRun(workItem: WorkItem, resumeFrom?: string): PipelineRun` — creates a new PipelineRun:
     - Generates new runId (UUID)
     - Sets attempt = previous attempt + 1 (or 1 if no previous run)
     - Determines resume point: `resumeFrom` param, or first failed phase, or first phase
     - For each phase before resume point: calls `shouldSkipPhase()` — if valid, copies result with status `skipped`; if invalid, triggers cascade
     - Cascade rule: once any phase needs re-execution, all subsequent phases get status `pending`
     - Sets `resumedFrom` field
   - Export `shouldSkipPhase(phaseName: string, workItem: WorkItem): boolean` — validation gates:
     - `routing`: returns `!!workItem.route`
     - `assessment`: returns `workItem.assessments.length > 0 && workItem.assessments.some(a => a.verdict === 'approve')`
     - `dispatch`: returns `!!workItem.assignedTeam && ['TheATeam', 'TheFixer'].includes(workItem.assignedTeam)`
     - `implementation`: always returns `false` (never skip)
   - Export `recordPhaseCompletion(workItem: WorkItem, phaseName: string, output?: unknown): WorkItem` — updates the phase in pipelineRun.phases to `completed` status with timestamp and output
   - Export `recordPhaseFailure(workItem: WorkItem, phaseName: string, error?: string): WorkItem` — updates the phase to `failed` status
   - Use structured logging (import logger) for all skip/execute decisions

3. **Write tests** (`Source/Backend/tests/services/pipeline.test.ts`):
   - Test `buildRetryRun` with no previous run (all phases pending)
   - Test `buildRetryRun` with previous run that failed at `implementation` (routing/assessment/dispatch skipped)
   - Test `buildRetryRun` with explicit `resumeFrom` parameter
   - Test cascade rule: if `assessment` validation fails, dispatch and implementation also re-run
   - Test `shouldSkipPhase` for each phase type
   - Test `shouldSkipPhase` returns false for implementation always
   - Test `recordPhaseCompletion` updates phase status and timestamp
   - Test `recordPhaseFailure` updates phase status
   - All tests use `// Verifies: FR-CR-XXX` traceability comments

**Verification:** Run `npx vitest run tests/services/pipeline.test.ts` — all tests must pass.

### backend-coder-2

**Assigned FRs:** FR-CR-001, FR-CR-006

**Module scope:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/metrics.ts`, `Source/Backend/tests/routes/workflow.test.ts`

**Dependencies:** Requires backend-coder-1 to have completed shared types and pipeline service.

**Task:**

1. **Add retry metrics** (`Source/Backend/src/metrics.ts`):
   - Add `itemsRetriedCounter`: `workflow_items_retried_total` with label `resumed` (values: `true`/`false`)
   - Add `phasesSkippedCounter`: `workflow_phases_skipped_total` with label `phase`
   - Follow the exact same pattern as existing counters (same registry, same style)

2. **Add retry endpoint** (`Source/Backend/src/routes/workflow.ts`):
   - Import `RetryWorkItemRequest` from shared types
   - Import `buildRetryRun`, `PIPELINE_PHASES` from `../services/pipeline`
   - Import new metrics counters
   - Import `buildChangeEntry` (already imported)
   - Add `POST /:id/retry` handler:
     - Validate work item exists (404 if not)
     - Validate status is `failed` (400 if not)
     - If `resumeFrom` provided, validate it's in `PIPELINE_PHASES` (400 if not)
     - Call `buildRetryRun(item, body.resumeFrom)` to get new PipelineRun
     - Create change history entry: field `status`, from `failed` to `in-progress`, agent `retry-service`, reason includes attempt number and resume info
     - Create change history entry: field `pipelineRun`, from old run to new run, agent `retry-service`
     - Update work item via `store.updateWorkItem(id, { status: InProgress, pipelineRun: newRun, changeHistory })`
     - Increment `itemsRetriedCounter` with `resumed: (hasSkippedPhases ? 'true' : 'false')`
     - Increment `phasesSkippedCounter` for each skipped phase
     - Log retry event with structured logging
     - Return updated work item
   - Add `// Verifies: FR-CR-001` traceability comment

3. **Add retry endpoint tests** (append to `Source/Backend/tests/routes/workflow.test.ts`):
   - Test successful retry of failed work item → returns 200 with updated item
   - Test retry of non-failed work item → returns 400
   - Test retry of non-existent work item → returns 404
   - Test retry with valid `resumeFrom` parameter
   - Test retry with invalid `resumeFrom` → returns 400
   - Test that pipelineRun is populated on the response
   - Test that change history includes retry entry
   - All tests use `// Verifies: FR-CR-XXX` traceability comments
   - Follow the exact same test setup pattern as existing workflow tests (use supertest + app)

**Verification:** Run `npx vitest run tests/routes/workflow.test.ts` — all tests must pass (existing + new). Then run `npx vitest run` — zero new failures.

## Verification Gates

After all coders complete:
```bash
cd Source/Backend && npx vitest run
```

All existing tests must continue to pass. All new tests must pass. Zero new failures.

## Files Modified (complete list)

| File | Action | Agent |
|------|--------|-------|
| `Source/Shared/types/workflow.ts` | Modified — add types, update transitions | backend-coder-1 |
| `Source/Backend/src/services/pipeline.ts` | **New** — pipeline service | backend-coder-1 |
| `Source/Backend/tests/services/pipeline.test.ts` | **New** — pipeline service tests | backend-coder-1 |
| `Source/Backend/src/routes/workflow.ts` | Modified — add retry endpoint | backend-coder-2 |
| `Source/Backend/src/metrics.ts` | Modified — add retry metrics | backend-coder-2 |
| `Source/Backend/tests/routes/workflow.test.ts` | Modified — add retry endpoint tests | backend-coder-2 |
