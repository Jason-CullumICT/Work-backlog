# Feature: Generic Workflow Management System

## Problem

There is no system to manage work items through a structured pipeline from intake to development. Work arrives from multiple sources (browser, Zendesk, manual bookmarks, integrations) but there is no unified backlog, review gate, or dashboard to track progress.

## Desired Outcome

A full-stack workflow management system implementing the pipeline shown in the GenericWorkflow diagram:

1. **Multi-source intake** -- work items from Browser, Zendesk, Manual/Bookmarked, and Integration sources all flow into a single Work Backlog
2. **Work Backlog** -- central queue where all items live as simple {id, title, description, type} objects with full change history
3. **Proposed Work** -- a stage where a Test Architect can attach proposed requirements and mock/prototypes to work items
4. **Panel/Fund Gate** -- a decision diamond where reviewers approve or reject proposed work
5. **Reviewed Work** -- approved items go through final work review producing a prioritized worklist
6. **Dev + Code Repository** -- approved work flows to development and ultimately to the code repository
7. **Dashboard** -- real-time view of all work items, queues, boards, sprints, and metrics

## Key Constraints from Diagram

- All work items are simple id/title/description/type objects with change history
- All agents can change the type/queue of an item
- New items can ONLY be created in the Work Backlog
- Items can be flagged as "worth doing a review for" to fast-track to review

## Reference

- Image: `.attachments/GenericWorkflow.png`
- Specification: `Specifications/workflow-management.md`
