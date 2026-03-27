// Verifies: FR-CR-001, FR-CR-002, FR-CR-003, FR-CR-004, FR-CR-005 — Pipeline checkpoint-resume service

import {
  WorkItem,
  PipelineRun,
  PhaseResult,
  PhaseStatus,
  AssessmentVerdict,
} from '@shared/types/workflow';
import { generateId } from '../utils/id';
import logger from '../logger';

// Verifies: FR-CR-002 — Ordered pipeline phase names
export const PIPELINE_PHASES = ['routing', 'assessment', 'dispatch', 'implementation'] as const;
export type PhaseName = typeof PIPELINE_PHASES[number];

// Verifies: FR-CR-003 — Build a new PipelineRun for a retry, carrying forward completed phases
export function buildRetryRun(workItem: WorkItem, resumeFrom?: string): PipelineRun {
  const previousRun = workItem.pipelineRun;
  const attempt = previousRun ? previousRun.attempt + 1 : 1;
  const runId = generateId();

  // Determine the resume index
  let resumeIndex: number;
  if (resumeFrom) {
    resumeIndex = PIPELINE_PHASES.indexOf(resumeFrom as PhaseName);
    if (resumeIndex === -1) {
      throw new Error(`Invalid phase name: ${resumeFrom}. Valid phases: ${PIPELINE_PHASES.join(', ')}`);
    }
  } else if (previousRun) {
    // Default: resume from the first failed phase
    const firstFailedIndex = previousRun.phases.findIndex(p => p.status === PhaseStatus.Failed);
    resumeIndex = firstFailedIndex >= 0 ? firstFailedIndex : 0;
  } else {
    resumeIndex = 0;
  }

  // Verifies: FR-CR-003 — Build phases with skip logic and cascade rule
  let cascadeRerun = false;
  const phases: PhaseResult[] = PIPELINE_PHASES.map((phaseName, index) => {
    if (cascadeRerun || index >= resumeIndex) {
      // This phase and all downstream must re-execute
      cascadeRerun = true;
      return createPendingPhase(phaseName);
    }

    // Verifies: FR-CR-004 — Validate prior phase output before skipping
    const previousPhase = previousRun?.phases.find(p => p.name === phaseName);
    if (previousPhase?.status === PhaseStatus.Completed && shouldSkipPhase(phaseName, workItem)) {
      logger.info({
        msg: 'Phase skipped via checkpoint-resume',
        phase: phaseName,
        runId,
        attempt,
        reason: `Carried forward from run ${previousRun?.runId}`,
      });
      return {
        ...previousPhase,
        status: PhaseStatus.Skipped,
        skipReason: `Carried forward from run ${previousRun?.runId}`,
      };
    }

    // Validation failed — cascade re-run from here
    cascadeRerun = true;
    logger.info({
      msg: 'Phase skip validation failed, cascading re-execution',
      phase: phaseName,
      runId,
      attempt,
    });
    return createPendingPhase(phaseName);
  });

  const pipelineRun: PipelineRun = {
    runId,
    attempt,
    phases,
    resumedFrom: resumeIndex > 0 ? PIPELINE_PHASES[resumeIndex] : null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    progressLog: [],
  };

  // Verifies: FR-CR-005 — Write initial progress entry
  writeProgress(pipelineRun, `Pipeline run ${runId} started (attempt ${attempt})`);

  return pipelineRun;
}

// Verifies: FR-CR-004 — Lightweight validation gate per phase
export function shouldSkipPhase(phaseName: string, workItem: WorkItem): boolean {
  switch (phaseName) {
    case 'routing':
      // Verify the work item still has a valid route assigned
      return !!workItem.route;

    case 'assessment':
      // Verify assessments array is non-empty and has an approve verdict
      return (
        workItem.assessments.length > 0 &&
        workItem.assessments.some(a => a.verdict === AssessmentVerdict.Approve)
      );

    case 'dispatch':
      // Verify assignedTeam is set and valid
      return !!workItem.assignedTeam &&
        (workItem.assignedTeam === 'TheATeam' || workItem.assignedTeam === 'TheFixer');

    case 'implementation':
      // Verifies: FR-CR-004 — Implementation phases always re-run on retry
      return false;

    default:
      return false;
  }
}

// Verifies: FR-CR-005 — Record phase completion and write progress
export function recordPhaseCompletion(pipelineRun: PipelineRun, phaseName: string, output: unknown): void {
  const phase = pipelineRun.phases.find(p => p.name === phaseName);
  if (!phase) {
    throw new Error(`Phase ${phaseName} not found in pipeline run`);
  }

  phase.status = PhaseStatus.Completed;
  phase.completedAt = new Date().toISOString();
  phase.output = output;

  writeProgress(pipelineRun, `Phase '${phaseName}' completed successfully`);
}

// Verifies: FR-CR-005 — Record phase failure
export function recordPhaseFailure(pipelineRun: PipelineRun, phaseName: string, error: string): void {
  const phase = pipelineRun.phases.find(p => p.name === phaseName);
  if (!phase) {
    throw new Error(`Phase ${phaseName} not found in pipeline run`);
  }

  phase.status = PhaseStatus.Failed;
  phase.completedAt = new Date().toISOString();
  phase.output = { error };

  writeProgress(pipelineRun, `Phase '${phaseName}' failed: ${error}`);
}

// Verifies: FR-CR-005 — Write progress log entry
export function writeProgress(pipelineRun: PipelineRun, message: string): void {
  const entry = `[${new Date().toISOString()}] ${message}`;
  pipelineRun.progressLog.push(entry);
}

function createPendingPhase(name: string): PhaseResult {
  return {
    name,
    status: PhaseStatus.Pending,
    startedAt: null,
    completedAt: null,
    output: null,
    skipReason: null,
  };
}
