// Verifies: FR-WFD-007 (Workflow list page with name, description, stage count, badges, navigation)

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../hooks/useWorkflows';
import type { Workflow } from '../hooks/useWorkflows';

// Verifies: FR-WFD-007 — Table/card list of workflows with navigation to detail and create
export const WorkflowListPage: React.FC = () => {
  const navigate = useNavigate();
  const { workflows, loading, error, refresh } = useWorkflows();

  const handleRowClick = useCallback(
    (id: string) => {
      navigate(`/workflows/${id}`);
    },
    [navigate],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Workflows</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={refresh}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
          {/* Verifies: FR-WFD-007 — Create Workflow button linking to /workflows/new */}
          <button
            data-testid="create-workflow-button"
            onClick={() => navigate('/workflows/new')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Create Workflow
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div data-testid="loading-indicator" style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          Loading...
        </div>
      ) : workflows.length === 0 ? (
        <div data-testid="empty-state" style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          No workflows defined yet. Create one to get started.
        </div>
      ) : (
        <table
          data-testid="workflows-table"
          style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Stages</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {/* Verifies: FR-WFD-007 — Each row shows name, description, stage count, default/active badges, click to navigate */}
            {workflows.map((wf: Workflow) => (
              <tr
                key={wf.id}
                data-testid={`workflow-row-${wf.id}`}
                onClick={() => handleRowClick(wf.id)}
                style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                }}
              >
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600 }}>{wf.name}</span>
                  {wf.isDefault && (
                    <span
                      data-testid={`default-badge-${wf.id}`}
                      style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Default
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{ color: '#6b7280' }}>
                    {wf.description.length > 80 ? `${wf.description.slice(0, 80)}...` : wf.description}
                  </span>
                </td>
                <td style={tdStyle}>{wf.stages.length}</td>
                <td style={tdStyle}>
                  <span
                    data-testid={`status-badge-${wf.id}`}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: wf.isActive ? '#dcfce7' : '#f3f4f6',
                      color: wf.isActive ? '#166534' : '#6b7280',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>{new Date(wf.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#6b7280',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
};
