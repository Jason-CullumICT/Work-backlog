import type { WorkItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature',
  bug: 'Bug',
  task: 'Task',
  improvement: 'Improvement',
};

interface WorkItemCardProps {
  item: WorkItem;
}

export function WorkItemCard({ item }: WorkItemCardProps) {
  const typeLabel = TYPE_LABELS[item.type] || item.type;

  return (
    <div
      data-testid="work-item-card"
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="mb-2 text-sm font-medium text-gray-900">{item.title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {typeLabel}
        </span>
        <PriorityBadge priority={item.priority} />
        <StatusBadge status={item.status} />
        <span className="ml-auto text-xs text-gray-400">{item.source}</span>
      </div>
    </div>
  );
}
