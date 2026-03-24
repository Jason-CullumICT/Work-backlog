import type { WorkItemStatus } from '../types';

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  proposed: 'bg-purple-100 text-purple-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  in_dev: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  proposed: 'Proposed',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  in_dev: 'In Dev',
  done: 'Done',
};

interface StatusBadgeProps {
  status: WorkItemStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
