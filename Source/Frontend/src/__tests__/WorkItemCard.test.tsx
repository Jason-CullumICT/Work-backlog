import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkItemCard } from '../components/WorkItemCard';
import { WorkItemStatus, WorkItemType, Priority, Source } from '../types';

const mockItem = {
  id: '1',
  title: 'Fix login bug',
  description: 'Users cannot log in with special chars',
  type: WorkItemType.BUG,
  status: WorkItemStatus.IN_DEV,
  queue: 'default',
  priority: Priority.HIGH,
  source: Source.BROWSER,
  external_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('WorkItemCard', () => {
  it('renders title', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('renders type badge', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('High');
  });

  it('renders status badge', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('In Dev');
  });

  it('renders source', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByText('browser')).toBeInTheDocument();
  });

  it('has card test id', () => {
    render(<WorkItemCard item={mockItem} />);
    expect(screen.getByTestId('work-item-card')).toBeInTheDocument();
  });
});
