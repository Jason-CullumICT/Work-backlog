export const WorkItemStatus = {
  BACKLOG: 'backlog',
  PROPOSED: 'proposed',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_DEV: 'in_dev',
  DONE: 'done',
} as const;
export type WorkItemStatus = (typeof WorkItemStatus)[keyof typeof WorkItemStatus];

export const WorkItemType = {
  FEATURE: 'feature',
  BUG: 'bug',
  TASK: 'task',
  IMPROVEMENT: 'improvement',
} as const;
export type WorkItemType = (typeof WorkItemType)[keyof typeof WorkItemType];

export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Source = {
  BROWSER: 'browser',
  ZENDESK: 'zendesk',
  MANUAL_BOOKMARK: 'manual_bookmark',
  INTEGRATION: 'integration',
} as const;
export type Source = (typeof Source)[keyof typeof Source];

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  queue: string;
  priority: Priority;
  source: Source;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  changeHistory?: ChangeEntry[];
}

export interface ChangeEntry {
  id: string;
  work_item_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface Proposal {
  id: string;
  work_item_id: string;
  requirements: string;
  prototype_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  work_item_id: string;
  decision: 'approved' | 'rejected';
  feedback: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface DashboardSummary {
  statusCounts: Record<string, number>;
  totalItems: number;
  throughput: number;
}

export interface BoardColumn {
  status: string;
  items: WorkItem[];
}

export interface BoardData {
  columns: BoardColumn[];
}

export interface DataResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
