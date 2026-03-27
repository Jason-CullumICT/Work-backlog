# Requirements: Checkpoint-Resume for Pipeline Retries

## Feature Requirements

| ID | Description | Priority | Size | Spec Reference |
|----|-------------|----------|------|----------------|
| FR-CR-001 | Retry endpoint (POST /api/work-items/:id/retry) | High | S | Specifications/checkpoint-resume.md §FR-CR-001 |
| FR-CR-002 | PipelineRun phase tracking data model | High | S | Specifications/checkpoint-resume.md §FR-CR-002 |
| FR-CR-003 | Phase skip logic with cascade rule | High | M | Specifications/checkpoint-resume.md §FR-CR-003 |
| FR-CR-004 | Phase validation gates (shouldSkipPhase) | High | M | Specifications/checkpoint-resume.md §FR-CR-004 |
| FR-CR-005 | Progress tracking on PipelineRun | Medium | S | Specifications/checkpoint-resume.md §FR-CR-005 |
| FR-CR-006 | Retry and skip Prometheus metrics | Medium | S | Specifications/checkpoint-resume.md §FR-CR-006 |
| FR-CR-007 | Status transition update (failed → in-progress) | High | S | Specifications/checkpoint-resume.md §FR-CR-007 |

## Scoping / Bin-Packing Plan

### Backend Layer

| FR | Size | Points | File Proximity |
|----|------|--------|---------------|
| FR-CR-002 | S | 1 | Shared/types/workflow.ts |
| FR-CR-007 | S | 1 | Shared/types/workflow.ts |
| FR-CR-003 | M | 2 | Backend/src/services/pipeline.ts |
| FR-CR-004 | M | 2 | Backend/src/services/pipeline.ts |
| FR-CR-005 | S | 1 | Backend/src/services/pipeline.ts |
| FR-CR-001 | S | 1 | Backend/src/routes/workflow.ts |
| FR-CR-006 | S | 1 | Backend/src/metrics.ts |

**Total: 9 points → 2 backend coders**

### Frontend Layer

No frontend changes required for this feature.

**Total: 0 points → 0 frontend coders**

## Bin-Pack Assignment

### backend-coder-1 (5 points — types + pipeline service)
- FR-CR-002 (S, 1pt) — PipelineRun types in Shared/types/workflow.ts
- FR-CR-007 (S, 1pt) — Status transition update in Shared/types/workflow.ts
- FR-CR-003 (M, 2pt) — Phase skip logic in services/pipeline.ts
- FR-CR-004 (M, 2pt) — Validation gates in services/pipeline.ts — counted as overlap with FR-CR-003 since same function set

**Files:** `Source/Shared/types/workflow.ts`, `Source/Backend/src/services/pipeline.ts`, `Source/Backend/tests/services/pipeline.test.ts`

### backend-coder-2 (4 points — endpoint + metrics + progress)
- FR-CR-001 (S, 1pt) — Retry endpoint in routes/workflow.ts
- FR-CR-005 (S, 1pt) — Progress recording (uses pipeline service from coder-1)
- FR-CR-006 (S, 1pt) — Prometheus metrics in metrics.ts
- Tests for retry endpoint in tests/routes/workflow.test.ts

**Files:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/metrics.ts`, `Source/Backend/tests/routes/workflow.test.ts`

**Dependency:** backend-coder-2 depends on backend-coder-1 completing the shared types and pipeline service first.
