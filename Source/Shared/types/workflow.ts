// Verifies: FR-WF-001 — Shared domain types for the Self-Judging Workflow Engine

// --- Enums ---

export enum WorkItemStatus {
  Backlog = 'backlog',
  Routing = 'routing',
  Proposed = 'proposed',
  Reviewing = 'reviewing',
  Approved = 'approved',
  Rejected = 'rejected',
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed',
}

export enum WorkItemType {
  Feature = 'feature',
  Bug = 'bug',
  Issue = 'issue',
  Improvement = 'improvement',
}

export enum WorkItemPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum WorkItemSource {
  Browser = 'browser',
  Zendesk = 'zendesk',
  Manual = 'manual',
  Automated = 'automated',
}

export enum WorkItemComplexity {
  Trivial = 'trivial',
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  Complex = 'complex',
}

export enum WorkItemRoute {
  FastTrack = 'fast-track',
  FullReview = 'full-review',
}

export enum AssessmentVerdict {
  Approve = 'approve',
  Reject = 'reject',
  NeedsClarification = 'needs-clarification',
}

// --- Entities ---

export interface ChangeHistoryEntry {
  timestamp: string;
  agent: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}

export interface AssessmentRecord {
  role: string;
  verdict: AssessmentVerdict;
  notes: string;
  suggestedChanges: string[];
  timestamp: string;
}

export interface WorkItem {
  id: string;
  docId: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  route?: WorkItemRoute;
  assignedTeam?: string;
  changeHistory: ChangeHistoryEntry[];
  assessments: AssessmentRecord[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

// --- API Request Types ---

export interface CreateWorkItemRequest {
  title: string;
  description: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  source: WorkItemSource;
  complexity?: WorkItemComplexity;
  fastTrack?: boolean;
}

export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  complexity?: WorkItemComplexity;
}

export interface RouteWorkItemRequest {
  overrideRoute?: WorkItemRoute;
}

export interface AssessWorkItemRequest {
  notes?: string;
}

export interface ApproveWorkItemRequest {
  reason?: string;
}

export interface RejectWorkItemRequest {
  reason: string;
}

export interface DispatchWorkItemRequest {
  team: string;
}

// --- API Response Types ---

export interface PaginatedWorkItemsResponse {
  data: WorkItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummaryResponse {
  statusCounts: Record<string, number>;
  teamCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}

export interface DashboardActivityResponse {
  data: (ChangeHistoryEntry & { workItemId: string; workItemDocId: string })[];
}

export interface DashboardQueueResponse {
  data: QueueGroup[];
}

export interface QueueGroup {
  status: WorkItemStatus;
  count: number;
  items: WorkItem[];
}

// --- Query Types ---

export interface WorkItemFilters {
  status?: WorkItemStatus;
  type?: WorkItemType;
  priority?: WorkItemPriority;
  source?: WorkItemSource;
  assignedTeam?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Verifies: FR-WF-006 — Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  [WorkItemStatus.Backlog]: [WorkItemStatus.Routing],
  [WorkItemStatus.Routing]: [WorkItemStatus.Proposed, WorkItemStatus.Approved],
  [WorkItemStatus.Proposed]: [WorkItemStatus.Reviewing, WorkItemStatus.Approved, WorkItemStatus.Rejected],
  [WorkItemStatus.Reviewing]: [WorkItemStatus.Approved, WorkItemStatus.Rejected],
  [WorkItemStatus.Approved]: [WorkItemStatus.InProgress],
  [WorkItemStatus.Rejected]: [WorkItemStatus.Backlog],
  [WorkItemStatus.InProgress]: [WorkItemStatus.Completed, WorkItemStatus.Failed],
  [WorkItemStatus.Completed]: [],
  [WorkItemStatus.Failed]: [WorkItemStatus.Backlog],
};
