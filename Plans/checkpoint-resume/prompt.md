# Prompt: Checkpoint-Resume for Pipeline Retries

## What
When a pipeline run is retried via `POST /api/work-items/:id/retry`, it should skip phases that already completed successfully instead of re-running the entire pipeline from scratch.

## Why
Failed pipeline runs currently require full re-execution from the beginning. For work items that fail late in the pipeline (e.g., during implementation after routing and assessment succeeded), re-running everything wastes time and resources. Checkpoint-resume allows retries to pick up where they left off.

## Scope
- Backend only (no frontend changes)
- New retry endpoint on the workflow routes
- New pipeline service for phase tracking and skip logic
- Shared type additions for PipelineRun data model
- Status transition update to allow `failed → in-progress`
- Prometheus metrics for retry and skip tracking
