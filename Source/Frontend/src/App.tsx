// Verifies: FR-WF-009 (React app scaffolding with routing)

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { WorkItemListPage } from './pages/WorkItemListPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { CreateWorkItemPage } from './pages/CreateWorkItemPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { LearningsPage } from './pages/LearningsPage';

// Verifies: FR-WF-009, FR-CB-012, FR-CB-013 — React Router with all routes
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/work-items" element={<WorkItemListPage />} />
          <Route path="/work-items/new" element={<CreateWorkItemPage />} />
          <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
          {/* Verifies: FR-CB-012 — Features browser route */}
          <Route path="/features" element={<FeaturesPage />} />
          {/* Verifies: FR-CB-013 — Learnings page route */}
          <Route path="/learnings" element={<LearningsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
