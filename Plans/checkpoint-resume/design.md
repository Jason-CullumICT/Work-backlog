# Design: Checkpoint-Resume for Pipeline Retries

## Approach

Add checkpoint-resume capability to the existing workflow engine so that retrying a failed work item skips phases that already completed successfully. This is a backend-only change — no frontend work required for v1.

## Architecture

The feature introduces three concepts layered onto the existing architecture:

```
┌─────────────────────────────────────────────────────────────┐
│ Existing Workflow Routes (workflow.ts)                       │
│  + POST /:id/retry  ← NEW endpoint                         │
│    - validates failed status                                │
│    - builds new PipelineRun from previous run               │
│    - applies skip logic                                     │
│    - transitions to in-progress                             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│ Pipeline Service (NEW: services/pipeline.ts)                │
│  - buildRetryRun(): creates PipelineRun with skip decisions │
│  - shouldSkipPhase(): validation gate per phase             │
│  - recordPhaseCompletion(): updates phase status + progress │
│  - PIPELINE_PHASES: ordered phase definitions               │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│ Shared Types (workflow.ts)                                  │
│  + PipelineRun, PhaseResult, PhaseStatus, RetryRequest      │
│  + WorkItem.pipelineRun field                               │
│  + VALID_STATUS_TRANSITIONS update: failed → in-progress    │
└─────────────────────────────────────────────────────────────┘
```

## Trade-offs

### Pipeline Service vs WorkflowEngine Class
- **Chosen: Service module with pure functions** — matches the existing service pattern (router.ts, assessment.ts)
- Alternative: Class-based WorkflowEngine with methods — would require refactoring existing code
- Rationale: Consistency with codebase. The task description mentions "WorkflowEngine" but the actual codebase uses function-based services.

### Phase Tracking Location
- **Chosen: In-memory on WorkItem.pipelineRun** — matches existing in-memory store pattern
- Alternative: Filesystem progress.md files — doesn't fit this codebase (no filesystem persistence)
- Rationale: The spec mentions progress.md but this is an in-memory app. We track progress as structured data on the WorkItem instead.

### Skip Validation Depth
- **Chosen: Lightweight property checks** — verify output exists and is valid
- Alternative: Re-run phases in dry-run mode — too expensive for a skip check
- Rationale: The skip gate should be O(1), not O(n). If validation fails, the phase re-runs anyway.

## File Changes

### Shared Types (Source/Shared/types/workflow.ts)
- Add `PhaseStatus` enum
- Add `PhaseResult` interface
- Add `PipelineRun` interface
- Add `RetryWorkItemRequest` interface
- Add `pipelineRun?: PipelineRun` to `WorkItem` interface
- Add `failed → in-progress` to `VALID_STATUS_TRANSITIONS`

### New Service (Source/Backend/src/services/pipeline.ts)
- `PIPELINE_PHASES`: ordered array of phase names
- `buildRetryRun(workItem, resumeFrom?)`: creates a new PipelineRun carrying forward results
- `shouldSkipPhase(phaseName, workItem)`: validation gate — returns boolean
- `recordPhaseCompletion(workItem, phaseName, output)`: marks a phase complete
- `recordPhaseFailure(workItem, phaseName, error)`: marks a phase failed

### Route Addition (Source/Backend/src/routes/workflow.ts)
- `POST /:id/retry` endpoint handler
- Validates status is `failed`
- Calls `buildRetryRun()` to create new pipeline run
- Updates work item status to `in-progress`
- Records change history entry for the retry

### Metrics Addition (Source/Backend/src/metrics.ts)
- `workflow_items_retried_total` counter (label: `resumed`)
- `workflow_phases_skipped_total` counter (label: `phase`)

### Tests
- `Source/Backend/tests/services/pipeline.test.ts` — unit tests for pipeline service
- `Source/Backend/tests/routes/workflow.test.ts` — additional tests for retry endpoint

## Complexity Assessment

| Component | Size | Rationale |
|-----------|------|-----------|
| Shared types | S | Adding types and one enum, one transition |
| Pipeline service | M | Core logic with skip decisions, validation gates, cascade rule |
| Retry endpoint | S | Standard route handler following existing patterns |
| Metrics | S | Two new counters following existing pattern |
| Tests | M | Pipeline service tests need multiple scenarios (skip, cascade, validation failure) |

**Total backend points: 1+2+1+1+2 = 7 → 2 backend coders**
**Total frontend points: 0 → 0 frontend coders**
