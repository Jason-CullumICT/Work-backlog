# Feature: Self-Judging Workflow Engine

## Problem

The project lacks a structured workflow for managing work items (features, bugs, issues) from intake through delivery. Work needs to flow through classification, optional assessment by a review pod, and dispatch to existing implementation teams — with a dashboard for visibility.

## Desired Outcome

A complete workflow engine where:
1. Work items enter from multiple sources (browser, zendesk, manual, automated) into a backlog
2. A work router classifies items and decides the path: fast-track (simple bugs/small changes) or full-review
3. Full-review items pass through an assessment pod of agents that add clarity and detail
4. Approved items are dispatched to existing teams (TheATeam or TheFixer) for implementation
5. A dashboard provides visibility into all queues, statuses, and team workloads

## Reference

- See `.attachments/GenericWorkflow.png` for the workflow diagram
- Existing teams defined in `Teams/TheATeam/` and `Teams/TheFixer/` (not to be modified)
- Specification: `Specifications/workflow-engine.md`

## Key Constraints

- Use existing team definitions (TheATeam/TheFixer) — do NOT create new teams
- Fast-track path bypasses the assessment pod for simple bugs/small changes
- All work items are simple objects: docID/Title/Description/Type with change history
- Any agent can change type/queue of an item
- New items can only be created to the work backlog
