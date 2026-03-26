// Verifies: FR-WFD-009 (tests for Create Workflow page)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateWorkflowPage } from '../../src/pages/CreateWorkflowPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCreate = vi.fn();
vi.mock('../../src/hooks/useWorkflows', () => ({
  workflowsApi: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateWorkflowPage />
    </MemoryRouter>,
  );
}

describe('CreateWorkflowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-WFD-009 — Form renders all sections
  it('renders the form with all sections', () => {
    renderPage();
    expect(screen.getByTestId('create-workflow-form')).toBeInTheDocument();
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-description')).toBeInTheDocument();
    expect(screen.getByTestId('stage-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('select-consensus')).toBeInTheDocument();
    expect(screen.getByTestId('team-targets')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — All stages pre-checked by default
  it('has all stages checked by default', () => {
    renderPage();
    const stages = ['intake', 'queue', 'router', 'assessment', 'worklist', 'dispatch'];
    for (const stage of stages) {
      expect((screen.getByTestId(`stage-${stage}`) as HTMLInputElement).checked).toBe(true);
    }
  });

  // Verifies: FR-WFD-009 — Default assessment roles pre-populated
  it('shows default assessment roles', () => {
    renderPage();
    expect(screen.getByTestId('role-pod-lead')).toBeInTheDocument();
    expect(screen.getByTestId('role-requirements-reviewer')).toBeInTheDocument();
    expect(screen.getByTestId('role-domain-expert')).toBeInTheDocument();
    expect(screen.getByTestId('role-work-definer')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — Team targets pre-checked
  it('has all team targets checked by default', () => {
    renderPage();
    expect((screen.getByTestId('team-TheATeam') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('team-TheFixer') as HTMLInputElement).checked).toBe(true);
  });

  // Verifies: FR-WFD-009 — Validation: name required
  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByTestId('input-description'), 'Some description');
    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-name')).toHaveTextContent('Name is required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Verifies: FR-WFD-009 — Validation: description required
  it('shows validation error when description is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test Workflow');
    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-description')).toHaveTextContent('Description is required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Verifies: FR-WFD-009 — Validation: at least one stage required
  it('shows validation error when all stages are unchecked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test');
    await user.type(screen.getByTestId('input-description'), 'Desc');

    // Uncheck all stages
    const stages = ['intake', 'queue', 'router', 'assessment', 'worklist', 'dispatch'];
    for (const stage of stages) {
      await user.click(screen.getByTestId(`stage-${stage}`));
    }

    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-stages')).toHaveTextContent('At least one stage is required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Verifies: FR-WFD-009 — Validation: at least one team target required
  it('shows validation error when all team targets are unchecked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test');
    await user.type(screen.getByTestId('input-description'), 'Desc');

    // Uncheck all teams
    await user.click(screen.getByTestId('team-TheATeam'));
    await user.click(screen.getByTestId('team-TheFixer'));

    await user.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-team-targets')).toHaveTextContent('At least one team target is required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Verifies: FR-WFD-009 — Successful submission navigates to detail page
  it('submits the form and navigates on success', async () => {
    const user = userEvent.setup();
    const mockWorkflow = { id: 'wf-new-123', name: 'Test Workflow' };
    mockCreate.mockResolvedValue(mockWorkflow);

    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test Workflow');
    await user.type(screen.getByTestId('input-description'), 'A test workflow description');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Workflow',
          description: 'A test workflow description',
          teamTargets: expect.arrayContaining(['TheATeam', 'TheFixer']),
        }),
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workflows/wf-new-123');
    });
  });

  // Verifies: FR-WFD-009 — Error display on submission failure
  it('shows error message when API call fails', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error('Server error'));

    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test');
    await user.type(screen.getByTestId('input-description'), 'Description');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toHaveTextContent('Server error');
    });
  });

  // Verifies: FR-WFD-009 — Can toggle stages
  it('allows toggling stages on and off', async () => {
    const user = userEvent.setup();
    renderPage();

    const intakeCheckbox = screen.getByTestId('stage-intake') as HTMLInputElement;
    expect(intakeCheckbox.checked).toBe(true);
    await user.click(intakeCheckbox);
    expect(intakeCheckbox.checked).toBe(false);
    await user.click(intakeCheckbox);
    expect(intakeCheckbox.checked).toBe(true);
  });

  // Verifies: FR-WFD-009 — Can add routing rules
  it('allows adding routing rules', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('add-rule-button'));
    expect(screen.getByTestId('routing-rule-0')).toBeInTheDocument();
    expect(screen.getByTestId('rule-field-0')).toBeInTheDocument();
    expect(screen.getByTestId('rule-operator-0')).toBeInTheDocument();
    expect(screen.getByTestId('rule-path-0')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — Can remove routing rules
  it('allows removing routing rules', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('add-rule-button'));
    expect(screen.getByTestId('routing-rule-0')).toBeInTheDocument();

    await user.click(screen.getByTestId('remove-rule-0'));
    expect(screen.queryByTestId('routing-rule-0')).not.toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — Can remove assessment roles
  it('allows removing assessment roles', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByTestId('role-pod-lead')).toBeInTheDocument();
    await user.click(screen.getByTestId('remove-role-pod-lead'));
    expect(screen.queryByTestId('role-pod-lead')).not.toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — Can add new assessment role
  it('allows adding a new assessment role', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('new-role-name'), 'QA Tester');
    await user.type(screen.getByTestId('new-role-description'), 'Tests the implementation');
    await user.click(screen.getByTestId('add-role-button'));

    expect(screen.getByTestId('role-qa-tester')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-009 — Consensus rule selector works
  it('allows selecting consensus rule', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByTestId('select-consensus'), 'majority-approve');
    expect((screen.getByTestId('select-consensus') as HTMLSelectElement).value).toBe('majority-approve');
  });

  // Verifies: FR-WFD-009 — Submit button shows loading state
  it('shows loading state on submit button during submission', async () => {
    const user = userEvent.setup();
    mockCreate.mockReturnValue(new Promise(() => {})); // never resolves

    renderPage();
    await user.type(screen.getByTestId('input-name'), 'Test');
    await user.type(screen.getByTestId('input-description'), 'Desc');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Creating...');
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });
});
