// Verifies: FR-WF-010, FR-WF-011 (status display for work items)

import React from 'react';
import { WorkItemStatus } from '../../../Shared/types/workflow';

const STATUS_COLORS: Record<WorkItemStatus, string> = {
  [WorkItemStatus.Backlog]: '#6b7280',
  [WorkItemStatus.Routing]: '#8b5cf6',
  [WorkItemStatus.Proposed]: '#3b82f6',
  [WorkItemStatus.Reviewing]: '#f59e0b',
  [WorkItemStatus.Approved]: '#10b981',
  [WorkItemStatus.Rejected]: '#ef4444',
  [WorkItemStatus.InProgress]: '#6366f1',
  [WorkItemStatus.Completed]: '#059669',
  [WorkItemStatus.Failed]: '#dc2626',
};

interface StatusBadgeProps {
  status: WorkItemStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  return (
    <span
      data-testid="status-badge"
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
      {status}
    </span>
  );
};
