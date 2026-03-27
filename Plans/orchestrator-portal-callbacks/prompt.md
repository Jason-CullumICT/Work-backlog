# Orchestrator-to-Portal Callback Integration

## Problem Statement

The orchestrator pipeline completes work but never notifies the portal. This creates three visible gaps:

1. **Feature Browser is empty** - When a pipeline run completes successfully and code is merged, no Feature record is created in the portal DB.
2. **Learnings page is empty** - The orchestrator syncs agent learnings to git files but never pushes them to the portal database.
3. **Active Cycle not showing on dashboard** - The dashboard reads from the portal's own cycles table which is never populated by the orchestrator.

## Required Callbacks

The orchestrator should have a configurable `PORTAL_URL` (defaulting to `http://portal:3001` inside Docker network) and make HTTP callbacks at key lifecycle points:

- **Run started** → create cycle + update feature/bug to `in_development`
- **Phase changed** → update cycle status
- **Run completed** → create Feature record + parse and store learnings + update cycle to complete
- **Run failed** → update cycle to failed

## Goal

Make the portal a true dashboard for the pipeline rather than a disconnected submission form.
