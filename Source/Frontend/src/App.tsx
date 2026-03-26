// Verifies: FR-WF-009 (React app scaffolding with routing)

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { WorkItemListPage } from './pages/WorkItemListPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { CreateWorkItemPage } from './pages/CreateWorkItemPage';
import { WorkflowDetailPage } from './pages/WorkflowDetailPage';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { CreateWorkflowPage } from './pages/CreateWorkflowPage';

// Verifies: FR-WF-009, FR-WFD-010 — React Router with all routes including workflow routes
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/work-items" element={<WorkItemListPage />} />
          <Route path="/work-items/new" element={<CreateWorkItemPage />} />
          <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
          {/* Verifies: FR-WFD-010 — Workflow routes */}
          <Route path="/workflows" element={<WorkflowListPage />} />
          <Route path="/workflows/new" element={<CreateWorkflowPage />} />
          <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
