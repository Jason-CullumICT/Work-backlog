// Work Item types -- single source of truth for backend
// Traces to: Specifications/workflow-management.md

export type WorkItemType = 'feature' | 'bug' | 'task' | 'improvement';
export type WorkItemStatus =
  | 'backlog'
  | 'proposed'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'in_dev'
  | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type IntakeSource = 'browser' | 'zendesk' | 'manual_bookmark' | 'integration';
export type ReviewDecision = 'approved' | 'rejected';

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  queue: string | null;
  priority: Priority;
  source: IntakeSource;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkItemWithHistory extends WorkItem {
  changeHistory: ChangeEntry[];
}

export interface ChangeEntry {
  id: string;
  work_item_id: string;
  field: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export interface Proposal {
  id: string;
  work_item_id: string;
  requirements: string;
  prototype_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Review {
  id: string;
  work_item_id: string;
  decision: ReviewDecision;
  feedback: string | null;
  reviewed_by: string;
  reviewed_at: string;
}

export interface CreateWorkItemInput {
  title: string;
  description?: string;
  type?: WorkItemType;
  queue?: string;
  priority?: Priority;
  source?: IntakeSource;
  external_id?: string;
}

export interface UpdateWorkItemInput {
  title?: string;
  description?: string;
  type?: WorkItemType;
  queue?: string | null;
  priority?: Priority;
  changed_by?: string;
}

export interface WorkItemFilters {
  status?: WorkItemStatus;
  type?: WorkItemType;
  queue?: string;
  priority?: Priority;
  source?: IntakeSource;
}

// API response wrappers
export interface DataResponse<T> {
  data: T[];
}

export interface ApiErrorResponse {
  error: string;
}

export const VALID_TYPES: WorkItemType[] = ['feature', 'bug', 'task', 'improvement'];
export const VALID_STATUSES: WorkItemStatus[] = [
  'backlog', 'proposed', 'under_review', 'approved', 'rejected', 'in_dev', 'done',
];
export const VALID_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
export const VALID_SOURCES: IntakeSource[] = ['browser', 'zendesk', 'manual_bookmark', 'integration'];
