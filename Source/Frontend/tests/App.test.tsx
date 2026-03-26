// Verifies: FR-WF-009 (App routing and navigation tests)

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Routes, Route } from 'react-router-dom';
import { Layout } from '../src/components/Layout';

// Mock all pages to isolate routing tests
vi.mock('../src/pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('../src/pages/WorkItemListPage', () => ({
  WorkItemListPage: () => <div data-testid="work-item-list-page">Work Items List</div>,
}));
vi.mock('../src/pages/WorkItemDetailPage', () => ({
  WorkItemDetailPage: () => <div data-testid="work-item-detail-page">Work Item Detail</div>,
}));
vi.mock('../src/pages/CreateWorkItemPage', () => ({
  CreateWorkItemPage: () => <div data-testid="create-work-item-page">Create Work Item</div>,
}));

import { DashboardPage } from '../src/pages/DashboardPage';
import { WorkItemListPage } from '../src/pages/WorkItemListPage';
import { WorkItemDetailPage } from '../src/pages/WorkItemDetailPage';
import { CreateWorkItemPage } from '../src/pages/CreateWorkItemPage';

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/work-items" element={<WorkItemListPage />} />
          <Route path="/work-items/new" element={<CreateWorkItemPage />} />
          <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('App Routing', () => {
  // Verifies: FR-WF-009 — Navigation renders
  it('renders navigation bar', () => {
    renderWithRoute('/');
    expect(screen.getByTestId('main-nav')).toBeInTheDocument();
    expect(screen.getByText('Workflow Engine')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Route: / renders Dashboard
  it('renders DashboardPage at /', () => {
    renderWithRoute('/');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Route: /work-items renders list
  it('renders WorkItemListPage at /work-items', () => {
    renderWithRoute('/work-items');
    expect(screen.getByTestId('work-item-list-page')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Route: /work-items/new renders create form
  it('renders CreateWorkItemPage at /work-items/new', () => {
    renderWithRoute('/work-items/new');
    expect(screen.getByTestId('create-work-item-page')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Route: /work-items/:id renders detail
  it('renders WorkItemDetailPage at /work-items/:id', () => {
    renderWithRoute('/work-items/abc-123');
    expect(screen.getByTestId('work-item-detail-page')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Nav links present
  it('renders nav links for all main routes', () => {
    renderWithRoute('/');
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Work Items')).toBeInTheDocument();
    expect(screen.getByText('Create Item')).toBeInTheDocument();
  });
});
