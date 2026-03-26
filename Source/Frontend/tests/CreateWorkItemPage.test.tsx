// Verifies: FR-WF-012 (Create Work Item page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { CreateWorkItemPage } from '../src/pages/CreateWorkItemPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../src/api/client', () => ({
  workItemsApi: {
    create: vi.fn(),
  },
  dashboardApi: {
    summary: vi.fn(),
    activity: vi.fn(),
    queue: vi.fn(),
  },
}));

import { workItemsApi } from '../src/api/client';

function renderCreatePage() {
  return render(
    <MemoryRouter>
      <CreateWorkItemPage />
    </MemoryRouter>,
  );
}

describe('CreateWorkItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-WF-012 — Form renders all fields
  it('renders the form with all fields', () => {
    renderCreatePage();
    expect(screen.getByTestId('create-form')).toBeInTheDocument();
    expect(screen.getByTestId('input-title')).toBeInTheDocument();
    expect(screen.getByTestId('input-description')).toBeInTheDocument();
    expect(screen.getByTestId('select-type')).toBeInTheDocument();
    expect(screen.getByTestId('select-priority')).toBeInTheDocument();
    expect(screen.getByTestId('select-source')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  // Verifies: FR-WF-012 — Client-side validation: title required
  it('shows validation error when title is empty', async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await user.type(screen.getByTestId('input-description'), 'Some description');
    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-title')).toHaveTextContent('Title is required');
    expect(workItemsApi.create).not.toHaveBeenCalled();
  });

  // Verifies: FR-WF-012 — Client-side validation: description required
  it('shows validation error when description is empty', async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await user.type(screen.getByTestId('input-title'), 'Some title');
    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-description')).toHaveTextContent('Description is required');
    expect(workItemsApi.create).not.toHaveBeenCalled();
  });

  // Verifies: FR-WF-012 — Successful submission navigates to detail page
  it('submits the form and navigates on success', async () => {
    const user = userEvent.setup();
    const mockItem = { id: 'abc-123', docId: 'WI-001', title: 'Test Feature' };
    (workItemsApi.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);

    renderCreatePage();
    await user.type(screen.getByTestId('input-title'), 'Test Feature');
    await user.type(screen.getByTestId('input-description'), 'A test feature description');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(workItemsApi.create).toHaveBeenCalledWith({
        title: 'Test Feature',
        description: 'A test feature description',
        type: 'feature',
        priority: 'medium',
        source: 'browser',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/work-items/abc-123');
    });
  });

  // Verifies: FR-WF-012 — Error display on submission failure
  it('shows error message when API call fails', async () => {
    const user = userEvent.setup();
    (workItemsApi.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'));

    renderCreatePage();
    await user.type(screen.getByTestId('input-title'), 'Test');
    await user.type(screen.getByTestId('input-description'), 'Description');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toHaveTextContent('Server error');
    });
  });

  // Verifies: FR-WF-012 — Type selection works
  it('allows selecting a work item type', async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await user.selectOptions(screen.getByTestId('select-type'), 'bug');
    expect((screen.getByTestId('select-type') as HTMLSelectElement).value).toBe('bug');
  });

  // Verifies: FR-WF-012 — Priority selection works
  it('allows selecting a priority', async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await user.selectOptions(screen.getByTestId('select-priority'), 'high');
    expect((screen.getByTestId('select-priority') as HTMLSelectElement).value).toBe('high');
  });
});
