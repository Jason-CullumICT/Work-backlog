import { getDb } from '../config/database';
import { WorkItem, WorkItemStatus, VALID_STATUSES } from '../models/types';
import { logger } from '../config/logger';

/**
 * DashboardService — provides summary and board views of work items.
 * Verifies: FR-WF-008, FR-WF-009
 */
export class DashboardService {
  /**
   * Get summary: count items per status, total items, throughput (done count).
   * Verifies: FR-WF-008
   */
  async getSummary(): Promise<{
    statusCounts: Record<string, number>;
    totalItems: number;
    throughput: number;
  }> {
    const db = getDb();

    const rows: { status: string; count: number }[] = await db('work_items')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const statusCounts: Record<string, number> = {};
    for (const s of VALID_STATUSES) {
      statusCounts[s] = 0;
    }

    let totalItems = 0;
    for (const row of rows) {
      const count = Number(row.count);
      statusCounts[row.status] = count;
      totalItems += count;
    }

    const throughput = statusCounts['done'] || 0;

    logger.info({ totalItems, throughput }, 'Dashboard summary generated');

    return { statusCounts, totalItems, throughput };
  }

  /**
   * Get board: items grouped by status as columns.
   * Verifies: FR-WF-009
   */
  async getBoard(): Promise<{
    columns: { status: string; items: WorkItem[] }[];
  }> {
    const db = getDb();

    const allItems: WorkItem[] = await db('work_items').orderBy('created_at', 'desc');

    const grouped: Record<string, WorkItem[]> = {};
    for (const s of VALID_STATUSES) {
      grouped[s] = [];
    }

    for (const item of allItems) {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      } else {
        grouped[item.status] = [item];
      }
    }

    const columns = VALID_STATUSES.map((status) => ({
      status,
      items: grouped[status],
    }));

    logger.info({ columnCount: columns.length }, 'Dashboard board generated');

    return { columns };
  }
}

export const dashboardService = new DashboardService();
