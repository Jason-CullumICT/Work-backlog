// Verifies: FR-WF-010, FR-WF-011 (priority display for work items)

import React from 'react';
import { WorkItemPriority } from '../../../Shared/types/workflow';

const PRIORITY_COLORS: Record<WorkItemPriority, string> = {
  [WorkItemPriority.Critical]: '#dc2626',
  [WorkItemPriority.High]: '#f97316',
  [WorkItemPriority.Medium]: '#eab308',
  [WorkItemPriority.Low]: '#22c55e',
};

interface PriorityBadgeProps {
  priority: WorkItemPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const color = PRIORITY_COLORS[priority] ?? '#6b7280';
  return (
    <span
      data-testid="priority-badge"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: color,
        textTransform: 'capitalize',
      }}
    >
      {priority}
    </span>
  );
};
