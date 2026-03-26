// Verifies: FR-WF-010 (type display in work item list)

import React from 'react';
import { WorkItemType } from '../../../Shared/types/workflow';

const TYPE_COLORS: Record<WorkItemType, string> = {
  [WorkItemType.Feature]: '#8b5cf6',
  [WorkItemType.Bug]: '#ef4444',
  [WorkItemType.Issue]: '#f59e0b',
  [WorkItemType.Improvement]: '#3b82f6',
};

interface TypeBadgeProps {
  type: WorkItemType;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const color = TYPE_COLORS[type] ?? '#6b7280';
  return (
    <span
      data-testid="type-badge"
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
      {type}
    </span>
  );
};
