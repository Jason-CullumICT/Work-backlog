import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreateItem from '../CreateItem';
import * as client from '../../api/client';
import { WorkItemStatus, WorkItemType, Priority, Source } from '../../types';
import type { WorkItem } from '../../types';

vi.mock('../../api/client');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <CreateItem />
    </MemoryRouter>,
  );
}

describe('CreateItem', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Verifies: FR-WF-013
  it('validates that title is required', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const submitButton = screen.getByRole('button', { name: 'Create' });
    await user.click(submitButton);

    expect(await screen.findByTestId('title-error')).toHaveTextContent('Title is required');
    expect(client.createWorkItem).not.toHaveBeenCalled();
  });

  // Verifies: FR-WF-013
  it('submits form with valid data and redirects', async () => {
    const user = userEvent.setup();
    const createdItem: WorkItem = {
      id: 'new-1',
      title: 'New feature',
      description: '',
      type: WorkItemType.TASK,
      status: WorkItemStatus.BACKLOG,
      queue: 'default',
      priority: Priority.MEDIUM,
      source: Source.BROWSER,
      external_id: null,
      created_at: '2026-03-24T10:00:00Z',
      updated_at: '2026-03-24T10:00:00Z',
    };
    vi.mocked(client.createWorkItem).mockResolvedValue(createdItem);

    renderWithRouter();

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New feature');

    const submitButton = screen.getByRole('button', { name: 'Create' });
    await user.click(submitButton);

    expect(client.createWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New feature' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/items/new-1');
  });

  // Verifies: FR-WF-013
  it('renders all form fields', () => {
    renderWithRouter();

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  // Verifies: FR-WF-013
  it('has a cancel button that navigates to backlog', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/backlog');
  });
});
