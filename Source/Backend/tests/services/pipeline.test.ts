// Verifies: FR-CR-001, FR-CR-002, FR-CR-003, FR-CR-004, FR-CR-005 — Pipeline service tests

import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemRoute,
  PhaseStatus,
  PipelineRun,
  AssessmentVerdict,
} from '@shared/types/workflow';
import {
  buildRetryRun,
  shouldSkipPhase,
  recordPhaseCompletion,
  recordPhaseFailure,
  writeProgress,
  PIPELINE_PHASES,
} from '../../src/services/pipeline';

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-id-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description that is long enough',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Failed,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePipelineRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    runId: 'prev-run-id',
    attempt: 1,
    phases: PIPELINE_PHASES.map(name => ({
      name,
      status: PhaseStatus.Completed,
      startedAt: '2026-03-27T00:00:00.000Z',
      completedAt: '2026-03-27T00:01:00.000Z',
      output: { result: `${name} done` },
      skipReason: null,
    })),
    resumedFrom: null,
    startedAt: '2026-03-27T00:00:00.000Z',
    completedAt: '2026-03-27T00:05:00.000Z',
    progressLog: [],
    ...overrides,
  };
}

describe('Pipeline Service', () => {
  describe('PIPELINE_PHASES', () => {
    // Verifies: FR-CR-002 — Phase ordering
    it('should have 4 phases in the correct order', () => {
      expect(PIPELINE_PHASES).toEqual(['routing', 'assessment', 'dispatch', 'implementation']);
    });
  });

  describe('shouldSkipPhase', () => {
    // Verifies: FR-CR-004 — Routing skip gate
    it('should skip routing when work item has a valid route', () => {
      const item = makeWorkItem({ route: WorkItemRoute.FastTrack });
      expect(shouldSkipPhase('routing', item)).toBe(true);
    });

    // Verifies: FR-CR-004 — Routing skip gate fails
    it('should not skip routing when work item has no route', () => {
      const item = makeWorkItem({ route: undefined });
      expect(shouldSkipPhase('routing', item)).toBe(false);
    });

    // Verifies: FR-CR-004 — Assessment skip gate
    it('should skip assessment when item has approved assessment', () => {
      const item = makeWorkItem({
        assessments: [{
          role: 'pod-lead',
          verdict: AssessmentVerdict.Approve,
          notes: 'Looks good',
          suggestedChanges: [],
          timestamp: new Date().toISOString(),
        }],
      });
      expect(shouldSkipPhase('assessment', item)).toBe(true);
    });

    // Verifies: FR-CR-004 — Assessment skip gate fails (no approve verdict)
    it('should not skip assessment when no approve verdict exists', () => {
      const item = makeWorkItem({
        assessments: [{
          role: 'pod-lead',
          verdict: AssessmentVerdict.Reject,
          notes: 'Needs work',
          suggestedChanges: [],
          timestamp: new Date().toISOString(),
        }],
      });
      expect(shouldSkipPhase('assessment', item)).toBe(false);
    });

    // Verifies: FR-CR-004 — Assessment skip gate fails (empty)
    it('should not skip assessment when assessments are empty', () => {
      const item = makeWorkItem({ assessments: [] });
      expect(shouldSkipPhase('assessment', item)).toBe(false);
    });

    // Verifies: FR-CR-004 — Dispatch skip gate
    it('should skip dispatch when assignedTeam is valid', () => {
      const item = makeWorkItem({ assignedTeam: 'TheATeam' });
      expect(shouldSkipPhase('dispatch', item)).toBe(true);
    });

    // Verifies: FR-CR-004 — Dispatch skip gate (TheFixer)
    it('should skip dispatch when assignedTeam is TheFixer', () => {
      const item = makeWorkItem({ assignedTeam: 'TheFixer' });
      expect(shouldSkipPhase('dispatch', item)).toBe(true);
    });

    // Verifies: FR-CR-004 — Dispatch skip gate fails
    it('should not skip dispatch when no team assigned', () => {
      const item = makeWorkItem({ assignedTeam: undefined });
      expect(shouldSkipPhase('dispatch', item)).toBe(false);
    });

    // Verifies: FR-CR-004 — Implementation never skips
    it('should never skip implementation phase', () => {
      const item = makeWorkItem({ assignedTeam: 'TheATeam', route: WorkItemRoute.FullReview });
      expect(shouldSkipPhase('implementation', item)).toBe(false);
    });

    // Verifies: FR-CR-004 — Unknown phases
    it('should not skip unknown phases', () => {
      const item = makeWorkItem();
      expect(shouldSkipPhase('unknown-phase', item)).toBe(false);
    });
  });

  describe('buildRetryRun', () => {
    // Verifies: FR-CR-002 — First attempt with no previous run
    it('should create a fresh run when no previous pipeline run exists', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      expect(run.attempt).toBe(1);
      expect(run.runId).toBeDefined();
      expect(run.resumedFrom).toBeNull();
      expect(run.completedAt).toBeNull();
      expect(run.phases).toHaveLength(4);
      expect(run.phases.every(p => p.status === PhaseStatus.Pending)).toBe(true);
    });

    // Verifies: FR-CR-003 — Skip completed phases before first failed
    it('should skip phases before the first failed phase', () => {
      const prevRun = makePipelineRun();
      prevRun.phases[2].status = PhaseStatus.Failed; // dispatch failed
      prevRun.phases[3].status = PhaseStatus.Pending; // implementation never started

      const item = makeWorkItem({
        pipelineRun: prevRun,
        route: WorkItemRoute.FastTrack,
        assessments: [{
          role: 'pod-lead',
          verdict: AssessmentVerdict.Approve,
          notes: 'ok',
          suggestedChanges: [],
          timestamp: new Date().toISOString(),
        }],
      });

      const run = buildRetryRun(item);

      expect(run.attempt).toBe(2);
      expect(run.resumedFrom).toBe('dispatch');
      expect(run.phases[0].status).toBe(PhaseStatus.Skipped); // routing skipped
      expect(run.phases[1].status).toBe(PhaseStatus.Skipped); // assessment skipped
      expect(run.phases[2].status).toBe(PhaseStatus.Pending); // dispatch re-runs
      expect(run.phases[3].status).toBe(PhaseStatus.Pending); // implementation re-runs
    });

    // Verifies: FR-CR-001 — Explicit resumeFrom parameter
    it('should resume from the specified phase', () => {
      const prevRun = makePipelineRun();
      const item = makeWorkItem({
        pipelineRun: prevRun,
        route: WorkItemRoute.FullReview,
        assessments: [{
          role: 'pod-lead',
          verdict: AssessmentVerdict.Approve,
          notes: 'ok',
          suggestedChanges: [],
          timestamp: new Date().toISOString(),
        }],
        assignedTeam: 'TheATeam',
      });

      const run = buildRetryRun(item, 'assessment');

      expect(run.resumedFrom).toBe('assessment');
      expect(run.phases[0].status).toBe(PhaseStatus.Skipped); // routing skipped
      expect(run.phases[1].status).toBe(PhaseStatus.Pending); // assessment re-runs
      expect(run.phases[2].status).toBe(PhaseStatus.Pending); // cascade: dispatch re-runs
      expect(run.phases[3].status).toBe(PhaseStatus.Pending); // cascade: implementation re-runs
    });

    // Verifies: FR-CR-001 — Invalid resumeFrom throws
    it('should throw on invalid resumeFrom phase name', () => {
      const item = makeWorkItem();
      expect(() => buildRetryRun(item, 'invalid-phase')).toThrow('Invalid phase name');
    });

    // Verifies: FR-CR-003 — Cascade rule: if upstream re-executes, all downstream re-execute
    it('should cascade re-execution when skip validation fails', () => {
      const prevRun = makePipelineRun();
      prevRun.phases[3].status = PhaseStatus.Failed; // implementation failed

      // Item has no route, so routing skip validation will fail → cascade all
      const item = makeWorkItem({
        pipelineRun: prevRun,
        route: undefined,
        assessments: [],
        assignedTeam: undefined,
      });

      const run = buildRetryRun(item);

      // routing validation fails (no route) → all cascade to pending
      expect(run.phases.every(p => p.status === PhaseStatus.Pending)).toBe(true);
    });

    // Verifies: FR-CR-003 — Partial cascade from mid-pipeline
    it('should cascade from the point where validation fails', () => {
      const prevRun = makePipelineRun();
      prevRun.phases[3].status = PhaseStatus.Failed;

      // routing passes (has route), assessment fails (no approved assessment)
      const item = makeWorkItem({
        pipelineRun: prevRun,
        route: WorkItemRoute.FastTrack,
        assessments: [],
        assignedTeam: 'TheATeam',
      });

      const run = buildRetryRun(item);

      expect(run.phases[0].status).toBe(PhaseStatus.Skipped); // routing ok
      expect(run.phases[1].status).toBe(PhaseStatus.Pending); // assessment validation fails
      expect(run.phases[2].status).toBe(PhaseStatus.Pending); // cascade
      expect(run.phases[3].status).toBe(PhaseStatus.Pending); // cascade
    });

    // Verifies: FR-CR-005 — Progress log has initial entry
    it('should write an initial progress log entry', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      expect(run.progressLog.length).toBeGreaterThanOrEqual(1);
      expect(run.progressLog[0]).toContain('Pipeline run');
      expect(run.progressLog[0]).toContain('started');
    });

    // Verifies: FR-CR-002 — Attempt increments
    it('should increment attempt from previous run', () => {
      const prevRun = makePipelineRun({ attempt: 3 });
      prevRun.phases[3].status = PhaseStatus.Failed;
      const item = makeWorkItem({ pipelineRun: prevRun });

      const run = buildRetryRun(item);
      expect(run.attempt).toBe(4);
    });
  });

  describe('recordPhaseCompletion', () => {
    // Verifies: FR-CR-005 — Records completion
    it('should mark a phase as completed with output', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);
      const output = { route: 'fast-track' };

      recordPhaseCompletion(run, 'routing', output);

      const phase = run.phases.find(p => p.name === 'routing')!;
      expect(phase.status).toBe(PhaseStatus.Completed);
      expect(phase.output).toEqual(output);
      expect(phase.completedAt).toBeDefined();
    });

    // Verifies: FR-CR-005 — Progress log updated
    it('should add a progress log entry on completion', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);
      const initialLogLength = run.progressLog.length;

      recordPhaseCompletion(run, 'routing', {});

      expect(run.progressLog.length).toBe(initialLogLength + 1);
      expect(run.progressLog[run.progressLog.length - 1]).toContain("'routing' completed");
    });

    it('should throw for unknown phase', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      expect(() => recordPhaseCompletion(run, 'nonexistent', {})).toThrow('Phase nonexistent not found');
    });
  });

  describe('recordPhaseFailure', () => {
    // Verifies: FR-CR-005 — Records failure
    it('should mark a phase as failed with error', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      recordPhaseFailure(run, 'routing', 'Something went wrong');

      const phase = run.phases.find(p => p.name === 'routing')!;
      expect(phase.status).toBe(PhaseStatus.Failed);
      expect(phase.output).toEqual({ error: 'Something went wrong' });
      expect(phase.completedAt).toBeDefined();
    });

    // Verifies: FR-CR-005 — Progress log updated on failure
    it('should add a progress log entry on failure', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);
      const initialLogLength = run.progressLog.length;

      recordPhaseFailure(run, 'assessment', 'Timed out');

      expect(run.progressLog.length).toBe(initialLogLength + 1);
      expect(run.progressLog[run.progressLog.length - 1]).toContain("'assessment' failed");
    });

    it('should throw for unknown phase', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      expect(() => recordPhaseFailure(run, 'nonexistent', 'err')).toThrow('Phase nonexistent not found');
    });
  });

  describe('writeProgress', () => {
    // Verifies: FR-CR-005 — Progress log format
    it('should append timestamped entries to progress log', () => {
      const item = makeWorkItem();
      const run = buildRetryRun(item);

      writeProgress(run, 'Custom message');

      const lastEntry = run.progressLog[run.progressLog.length - 1];
      expect(lastEntry).toContain('Custom message');
      expect(lastEntry).toMatch(/^\[.*\]/); // starts with timestamp
    });
  });
});
