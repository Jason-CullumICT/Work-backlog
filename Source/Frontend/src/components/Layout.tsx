// Verifies: FR-WF-009 (shared layout for all pages)

import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/work-items', label: 'Work Items' },
  { path: '/work-items/new', label: 'Create Item' },
];

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav
        data-testid="main-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '12px 24px',
          backgroundColor: '#1f2937',
          color: '#fff',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '18px', marginRight: '16px' }}>
          Workflow Engine
        </span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              color: location.pathname === item.path ? '#60a5fa' : '#d1d5db',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === item.path ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
