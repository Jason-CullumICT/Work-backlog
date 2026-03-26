// Verifies: FR-WFD-008 — Workflow detail page with visual flow diagram and configuration panel

import { useParams, Link } from 'react-router-dom';
import { useWorkflow, useWorkflowFlow } from '../hooks/useWorkflows';
import { WorkflowFlowDiagram } from '../components/WorkflowFlowDiagram';

// Verifies: FR-WFD-008 — Main detail page component
export const WorkflowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { workflow, loading: wfLoading, error: wfError } = useWorkflow(id!);
  const { flow, loading: flowLoading, error: flowError } = useWorkflowFlow(id!);

  if (wfLoading || flowLoading) {
    return (
      <div data-testid="workflow-detail-loading" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading workflow...
      </div>
    );
  }

  if (wfError || flowError) {
    return (
      <div data-testid="workflow-detail-error" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        Error: {wfError || flowError}
      </div>
    );
  }

  if (!workflow) {
    return (
      <div data-testid="workflow-not-found" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Workflow not found.
      </div>
    );
  }

  return (
    <div data-testid="workflow-detail-page">
      {/* Verifies: FR-WFD-008 — Header: workflow name, description, default/active badges */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Link to="/workflows" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
            ← Workflows
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{workflow.name}</h1>
          {workflow.isDefault && (
            <span
              data-testid="default-badge"
              style={{
                padding: '2px 8px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Default
            </span>
          )}
          <span
            data-testid="active-badge"
            style={{
              padding: '2px 8px',
              backgroundColor: workflow.isActive ? '#dcfce7' : '#fee2e2',
              color: workflow.isActive ? '#166534' : '#991b1b',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {workflow.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{workflow.description}</p>
      </div>

      {/* Verifies: FR-WFD-008 — Main content: WorkflowFlowDiagram */}
      <section
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Flow Diagram</h2>
        {flow ? (
          <WorkflowFlowDiagram nodes={flow.nodes} edges={flow.edges} />
        ) : (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
            No flow data available.
          </div>
        )}
      </section>

      {/* Verifies: FR-WFD-008 — Configuration panel: routing rules, assessment config, team targets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Routing Rules */}
        <section
          data-testid="routing-rules-panel"
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Routing Rules</h2>
          {workflow.routingRules.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No routing rules configured.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Rule</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Conditions</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Path</th>
                </tr>
              </thead>
              <tbody>
                {workflow.routingRules
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule) => (
                    <tr key={rule.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>{rule.name}</td>
                      <td style={{ padding: '8px' }}>
                        {rule.conditions.map((c, i) => (
                          <span key={i}>
                            {c.field} {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : c.value}
                            {i < rule.conditions.length - 1 && ' AND '}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            backgroundColor: rule.path === 'fast-track' ? '#fef3c7' : '#e0e7ff',
                            color: rule.path === 'fast-track' ? '#92400e' : '#3730a3',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {rule.path}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Assessment Config */}
        <section
          data-testid="assessment-config-panel"
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Assessment Configuration</h2>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
              Consensus Rule
            </h3>
            <span
              data-testid="consensus-rule"
              style={{
                padding: '4px 8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {workflow.assessmentConfig.consensusRule}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
              Pod Roles
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {workflow.assessmentConfig.roles.map((role) => (
                <li
                  key={role.id}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '13px',
                  }}
                >
                  <strong>{role.name}</strong>
                  {role.description && (
                    <span style={{ color: '#6b7280' }}> — {role.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Team Targets */}
      <section
        data-testid="team-targets-panel"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px',
          marginTop: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Team Targets</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {workflow.teamTargets.map((team) => (
            <span
              key={team}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {team}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
