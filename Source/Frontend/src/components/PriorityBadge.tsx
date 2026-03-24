import type { Priority } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface PriorityBadgeProps {
  priority: Priority | string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colorClass = PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-500';
  const label = PRIORITY_LABELS[priority] || priority;

  return (
    <span
      data-testid="priority-badge"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
