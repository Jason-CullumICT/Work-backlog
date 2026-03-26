// Verifies: FR-WF-007 — Dashboard aggregation service
import {
  WorkItemStatus,
  DashboardSummaryResponse,
  DashboardActivityResponse,
  DashboardQueueResponse,
  QueueGroup,
  ChangeHistoryEntry,
} from '../../../Shared/types/workflow';
import { getAllItems } from '../store/workItemStore';

// Verifies: FR-WF-007 — Dashboard summary with counts by status, team, priority
export function getSummary(): DashboardSummaryResponse {
  const items = getAllItems();

  const statusCounts: Record<string, number> = {};
  const teamCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    if (item.assignedTeam) {
      teamCounts[item.assignedTeam] = (teamCounts[item.assignedTeam] || 0) + 1;
    }
  }

  return { statusCounts, teamCounts, priorityCounts };
}

// Verifies: FR-WF-007 — Recent activity across all work items
export function getActivity(page: number = 1, limit: number = 20): DashboardActivityResponse {
  const items = getAllItems();

  const allEntries: (ChangeHistoryEntry & { workItemId: string; workItemDocId: string })[] = [];

  for (const item of items) {
    for (const entry of item.changeHistory) {
      allEntries.push({
        ...entry,
        workItemId: item.id,
        workItemDocId: item.docId,
      });
    }
  }

  // Sort by timestamp descending
  allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const offset = (page - 1) * limit;
  const data = allEntries.slice(offset, offset + limit);

  return { data };
}

// Verifies: FR-WF-007 — Items grouped by status queue
export function getQueue(): DashboardQueueResponse {
  const items = getAllItems();

  const grouped: Record<string, typeof items> = {};

  for (const item of items) {
    if (!grouped[item.status]) {
      grouped[item.status] = [];
    }
    grouped[item.status].push(item);
  }

  const data: QueueGroup[] = Object.values(WorkItemStatus).map((status) => ({
    status,
    count: grouped[status]?.length || 0,
    items: grouped[status] || [],
  }));

  return { data };
}
