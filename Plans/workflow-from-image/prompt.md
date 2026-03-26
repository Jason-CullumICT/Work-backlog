# Prompt: Create a new Workflow from an Image

## Original Request

Implement feature: Create a new Workflow from an image. The image describes a feature workflow processing pipeline:

- Work backlog receives features/bugs/issues from multiple input sources (Browser, Zendesk, Manual/Backfield, Automated/Events)
- Work Router classifies items into fast-track or full-review paths
- Fast-track path bypasses assessment for trivial/small changes
- Assessment Pod (Pod Lead, Requirements Reviewer, Domain Expert, Work Definer) adds clarity and detail
- Approved items go to a Worklist and are dispatched to existing teams (TheATeam, TheFixer)
- Dashboard shows all work items, queues, team workloads

## Key Clarifications from Task Context

- The image describes **feature workflow processing**, not a generic diagram editor
- The work backlog contains features/bugs/issues raised by defined input sources
- The work router chooses the type of team needed
- The assessment pod adds clarity and detail to work being done
- Fast-track arrow bypasses assessment for simple bugs/small changes that don't require rigor
- Use **existing team definitions** (TheATeam, TheFixer) — do NOT create new teams
- The "pod at the end" is the work agent team used for implementation

## Reference Image

`/workspace/.attachments/GenericWorkflow.png`

## Specification

`Specifications/workflow-definitions.md`
