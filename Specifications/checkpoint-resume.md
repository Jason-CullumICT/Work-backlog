# Specification: Checkpoint-Resume for Pipeline Retries

## Overview

When a work item pipeline run fails and is retried, the system should resume from the point of failure rather than re-running the entire pipeline from scratch. This requires tracking per-phase completion state, validating that prior phase outputs are still valid, and providing an API to trigger retries with optional resume points.

## Functional Requirements

### FR-CR-001: Retry Endpoint
- `POST /api/work-items/:id/retry` — Retry a failed work item's pipeline
- Only allowed when work item status is `failed`
- Accepts optional `resumeFrom` body parameter to explicitly set the resume phase
- Carries forward phases/results from the original run into the new attempt
- Transitions status: `failed` → `in-progress` with a change history entry noting the retry
- Returns the updated work item
- If `resumeFrom` is invalid (unknown phase name), returns 400 error

### FR-CR-002: Run Phase Tracking
- Each work item gains a `pipelineRun` field tracking the current/latest pipeline execution
- `pipelineRun` contains:
  - `runId`: string (UUID) — unique per attempt
  - `attempt`: number — retry count (starts at 1)
  - `phases`: array of `PhaseResult` objects
  - `resumedFrom`: string | null — phase name if this was a resumed run
  - `startedAt`: string (ISO datetime)
  - `completedAt`: string | null (ISO datetime)
- `PhaseResult` contains:
  - `name`: string — phase identifier (e.g., `routing`, `assessment`, `dispatch`, `implementation`)
  - `status`: enum — `pending`, `skipped`, `running`, `completed`, `failed`
  - `startedAt`: string | null
  - `completedAt`: string | null
  - `output`: unknown | null — phase-specific result data
  - `skipReason`: string | null — why this phase was skipped (e.g., "carried forward from run abc")

### FR-CR-003: Phase Skip Logic
- When a retry occurs, phases that completed successfully in the previous run are candidates for skipping
- A phase is skipped only if:
  1. It completed successfully in the previous run (`status === 'completed'`)
  2. Its position is before the `resumeFrom` point (if specified) or before the first failed phase
  3. A lightweight validation confirms the phase output is still valid (see FR-CR-004)
- If an upstream phase is re-executed (not skipped), all downstream phases MUST also re-execute (cascade rule)
- The cascade boolean propagates: once one phase re-executes, all subsequent phases re-execute regardless of prior success

### FR-CR-004: Phase Validation Gates
- Before skipping a phase, a validation check confirms the prior output is still usable
- Validation is intentionally lightweight — not a full re-execution:
  - `routing`: Verify the work item still has a valid route assigned
  - `assessment`: Verify assessments array is non-empty and has an approve verdict
  - `dispatch`: Verify assignedTeam is set and valid
  - `implementation`: No skip — implementation phases always re-run on retry
- If validation fails, the phase (and all downstream) must re-execute

### FR-CR-005: Progress File
- After each phase completes, a `progress.md` file is written/updated for the work item
- Location: stored as part of the pipelineRun data (not filesystem — this is an in-memory app)
- The progress record contains: phase name, status, timestamp, and a summary line
- This provides an audit trail of phase-by-phase execution for debugging

### FR-CR-006: Retry Metrics
- New Prometheus counter: `workflow_items_retried_total` with label `resumed` (true/false)
- New counter: `workflow_phases_skipped_total` with label `phase`
- These counters track retry frequency and how often checkpoint-resume saves work

### FR-CR-007: Status Transition Update
- Add `failed → in-progress` to `VALID_STATUS_TRANSITIONS` to support direct retry without going through backlog
- The existing `failed → backlog` transition remains available for full re-queue

## Non-Functional Requirements

- All retry operations must be logged with structured logging including runId and attempt number
- Phase skip decisions must be logged (skipped vs re-executed and why)
- The retry endpoint follows the project's API response patterns (returns WorkItem directly)
- Error responses follow `{error: "message"}` pattern

## API Contract

### POST /api/work-items/:id/retry

**Request Body (all fields optional):**
```typescript
interface RetryWorkItemRequest {
  resumeFrom?: string;  // Phase name to resume from (skip earlier completed phases)
  reason?: string;      // Why the retry is being initiated
}
```

**Success Response (200):**
```typescript
WorkItem  // Updated work item with new pipelineRun populated
```

**Error Responses:**
- `404` — Work item not found
- `400` — Invalid status (not `failed`) or invalid `resumeFrom` phase name
- `500` — Internal error

## Data Model Changes

### WorkItem (additions)
```typescript
interface WorkItem {
  // ... existing fields ...
  pipelineRun?: PipelineRun;  // Current/latest pipeline execution state
}
```

### New Types
```typescript
enum PhaseStatus {
  Pending = 'pending',
  Skipped = 'skipped',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

interface PhaseResult {
  name: string;
  status: PhaseStatus;
  startedAt: string | null;
  completedAt: string | null;
  output: unknown | null;
  skipReason: string | null;
}

interface PipelineRun {
  runId: string;
  attempt: number;
  phases: PhaseResult[];
  resumedFrom: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface RetryWorkItemRequest {
  resumeFrom?: string;
  reason?: string;
}
```

### Pipeline Phase Names (ordered)
1. `routing`
2. `assessment`
3. `dispatch`
4. `implementation`
