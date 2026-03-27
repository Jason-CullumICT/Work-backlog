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

// --- Callback Integration Types (Orchestrator-to-Portal) ---

// Verifies: FR-CB-001 — Cycle status enum
export enum CycleStatus {
  Started = 'started',
  Requirements = 'requirements',
  ApiContract = 'api-contract',
  Implementation = 'implementation',
  Review = 'review',
  Completed = 'completed',
  Failed = 'failed',
}

// Verifies: FR-CB-002 — Cycle result enum
export enum CycleResult {
  Passed = 'passed',
  Failed = 'failed',
}

// Verifies: FR-CB-001 — CyclePhase interface
export interface CyclePhase {
  name: string;
  startedAt: string;
  completedAt?: string;
}

// Verifies: FR-CB-001 — Cycle entity
export interface Cycle {
  id: string;
  workItemId: string;
  team: string;
  status: CycleStatus;
  branch: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  phases: CyclePhase[];
  result?: CycleResult;
  error?: string;
}

// Verifies: FR-CB-005 — Feature entity
export interface Feature {
  id: string;
  workItemId: string;
  cycleId: string;
  title: string;
  description: string;
  branch: string;
  mergedAt?: string;
  createdAt: string;
}

// Verifies: FR-CB-001 — Create Cycle request
export interface CreateCycleRequest {
  workItemId: string;
  team: string;
  branch: string;
}

// Verifies: FR-CB-002 — Update Cycle request
export interface UpdateCycleRequest {
  status: CycleStatus;
  error?: string;
}

// Verifies: FR-CB-005 — Create Feature request
export interface CreateFeatureRequest {
  workItemId: string;
  cycleId: string;
  title: string;
  description: string;
  branch: string;
  mergedAt?: string;
}

// Verifies: FR-CB-003 — Cycle filters
export interface CycleFilters {
  workItemId?: string;
  status?: CycleStatus;
}

// Verifies: FR-CB-003, FR-CB-017 — Paginated Cycles response
export interface PaginatedCyclesResponse {
  data: Cycle[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Verifies: FR-CB-006, FR-CB-017 — Paginated Features response
export interface PaginatedFeaturesResponse {
  data: Feature[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Verifies: FR-CB-011, FR-CB-017 — Active Cycles response
export interface ActiveCyclesResponse {
  data: Cycle[];
}

// Verifies: FR-CB-008, FR-CB-009, FR-CB-010 — Learning entity
export interface Learning {
  id: string;
  cycleId: string;
  team: string;
  role: string;
  content: string;
  category?: string;
  createdAt: string;
}

// Verifies: FR-CB-008 — Create Learning request
export interface CreateLearningRequest {
  cycleId: string;
  team: string;
  role: string;
  content: string;
  category?: string;
}

// Verifies: FR-CB-009 — Batch Create Learnings request
export interface BatchCreateLearningsRequest {
  learnings: CreateLearningRequest[];
}

// Verifies: FR-CB-010 — Learning filters
export interface LearningFilters {
  cycleId?: string;
  team?: string;
  role?: string;
}

// Verifies: FR-CB-010 — Paginated Learnings response
export interface PaginatedLearningsResponse {
  data: Learning[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
