// Verifies: FR-WF-004 — Work Router service (fast-track vs full-review classification)

import {
  WorkItem,
  WorkItemType,
  WorkItemComplexity,
  WorkItemRoute,
  WorkItemStatus,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { buildChangeEntry } from '../models/WorkItem';
import { itemsRoutedCounter } from '../metrics';
import logger from '../logger';

// Verifies: FR-WF-004 — Fast-track criteria from spec
function isFastTrack(item: WorkItem): boolean {
  // Type is bug AND complexity is trivial or small
  if (
    item.type === WorkItemType.Bug &&
    (item.complexity === WorkItemComplexity.Trivial || item.complexity === WorkItemComplexity.Small)
  ) {
    return true;
  }

  // Type is improvement AND estimated change < 3 files (heuristic: trivial/small complexity)
  if (
    item.type === WorkItemType.Improvement &&
    (item.complexity === WorkItemComplexity.Trivial || item.complexity === WorkItemComplexity.Small)
  ) {
    return true;
  }

  // Explicitly flagged as fast-track via request body
  // This is handled by the overrideRoute parameter in the route action

  return false;
}

// Verifies: FR-WF-004 — Full-review criteria (default path)
function isFullReview(item: WorkItem): boolean {
  // All feature type items
  if (item.type === WorkItemType.Feature) return true;

  // All bug items with medium+ complexity
  if (
    item.type === WorkItemType.Bug &&
    item.complexity &&
    [WorkItemComplexity.Medium, WorkItemComplexity.Large, WorkItemComplexity.Complex].includes(item.complexity)
  ) {
    return true;
  }

  // All issue type items
  if (item.type === WorkItemType.Issue) return true;

  // Default: full-review for anything not matching fast-track
  return true;
}

export interface RouteResult {
  route: WorkItemRoute;
  targetStatus: WorkItemStatus;
}

// Verifies: FR-WF-004 — Classify work item route
export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus:
        overrideRoute === WorkItemRoute.FastTrack
          ? WorkItemStatus.Approved
          : WorkItemStatus.Proposed,
    };
  }

  if (isFastTrack(item)) {
    return {
      route: WorkItemRoute.FastTrack,
      targetStatus: WorkItemStatus.Approved,
    };
  }

  return {
    route: WorkItemRoute.FullReview,
    targetStatus: WorkItemStatus.Proposed,
  };
}

// Verifies: FR-WF-004 — Route a work item: backlog → routing → (proposed | approved)
export function routeWorkItem(
  itemId: string,
  overrideRoute?: WorkItemRoute,
): WorkItem {
  const item = store.findById(itemId);
  if (!item) {
    throw new Error(`Work item ${itemId} not found`);
  }

  if (item.status !== WorkItemStatus.Backlog) {
    throw new Error(
      `Cannot route work item in status '${item.status}'. Must be in 'backlog' status.`,
    );
  }

  // Transition to routing (transient state)
  const routingEntry = buildChangeEntry('status', item.status, WorkItemStatus.Routing, 'router-service', 'Routing initiated');
  item.changeHistory.push(routingEntry);

  // Classify route
  const result = classifyRoute(item, overrideRoute);

  // Apply route result
  const routeEntry = buildChangeEntry('route', item.route, result.route, 'router-service', `Classified as ${result.route}`);
  const statusEntry = buildChangeEntry('status', WorkItemStatus.Routing, result.targetStatus, 'router-service',
    result.route === WorkItemRoute.FastTrack
      ? 'Fast-tracked: bypasses assessment pod'
      : 'Requires full review by assessment pod',
  );

  item.changeHistory.push(routeEntry);
  item.changeHistory.push(statusEntry);

  const updated = store.updateWorkItem(itemId, {
    status: result.targetStatus,
    route: result.route,
    changeHistory: item.changeHistory,
  });

  if (!updated) {
    throw new Error(`Failed to update work item ${itemId}`);
  }

  // Verifies: FR-WF-013 — Prometheus metric
  itemsRoutedCounter.inc({ route: result.route });

  logger.info({
    msg: 'Work item routed',
    workItemId: itemId,
    docId: updated.docId,
    route: result.route,
    targetStatus: result.targetStatus,
  });

  return updated;
}

// Verifies: FR-WF-004 — Team assignment rules
export function assignTeam(item: WorkItem): string {
  // TheATeam: features, complex work
  if (item.type === WorkItemType.Feature) return 'TheATeam';
  if (
    item.complexity &&
    [WorkItemComplexity.Large, WorkItemComplexity.Complex].includes(item.complexity)
  ) {
    return 'TheATeam';
  }

  // TheFixer: bugs, improvements, refactoring, small changes
  return 'TheFixer';
}
