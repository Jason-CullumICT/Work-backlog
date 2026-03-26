// Verifies: FR-WF-011 (Work Item detail page with history, assessments, and workflow actions)

import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  WorkItemStatus,
  AssessmentVerdict,
} from '../../../Shared/types/workflow';
import type { WorkItem, ChangeHistoryEntry, AssessmentRecord } from '../../../Shared/types/workflow';
import { useWorkItem } from '../hooks/useWorkItems';
import { workItemsApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

// Verifies: FR-WF-011 (full detail view with actions, history, assessments)
export const WorkItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, error, refresh } = useWorkItem(id!);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [dispatchTeam, setDispatchTeam] = useState('TheATeam');

  const executeAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setActionError(null);
      setActionLoading(true);
      try {
        await action();
        refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setActionLoading(false);
      }
    },
    [refresh],
  );

  // Verifies: FR-WF-011 (action buttons conditionally shown by status)
  const handleRoute = useCallback(
    () => executeAction(() => workItemsApi.route(id!)),
    [executeAction, id],
  );

  const handleApprove = useCallback(
    () => executeAction(() => workItemsApi.approve(id!)),
    [executeAction, id],
  );

  const handleReject = useCallback(
    () =>
      executeAction(() =>
        workItemsApi.reject(id!, { reason: rejectReason }),
      ),
    [executeAction, id, rejectReason],
  );

  const handleDispatch = useCallback(
    () =>
      executeAction(() =>
        workItemsApi.dispatch(id!, { team: dispatchTeam }),
      ),
    [executeAction, id, dispatchTeam],
  );

  if (loading) {
    return (
      <div data-testid="loading-indicator" style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px' }}>
        {error}
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Work item not found
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Verifies: FR-WF-011 (header: docId, title, status badge, priority badge) */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/work-items')}
          style={{ marginBottom: '12px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
        >
          &larr; Back to list
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>{item.docId}</span>
          <h1 style={{ margin: 0, fontSize: '24px', flex: 1 }}>{item.title}</h1>
          <StatusBadge status={item.status} />
          <PriorityBadge priority={item.priority} />
        </div>
      </div>

      {actionError && (
        <div role="alert" style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {actionError}
        </div>
      )}

      {/* Verifies: FR-WF-011 (detail section: description, type, source, complexity, route, assignedTeam) */}
      <section data-testid="detail-section" style={{ ...sectionStyle, marginBottom: '24px' }}>
        <h2 style={sectionHeadingStyle}>Details</h2>
        <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>{item.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <DetailField label="Type" value={item.type} />
          <DetailField label="Source" value={item.source} />
          <DetailField label="Complexity" value={item.complexity ?? 'Not assessed'} />
          <DetailField label="Route" value={item.route ?? 'Not routed'} />
          <DetailField label="Assigned Team" value={item.assignedTeam ?? 'Unassigned'} />
          <DetailField label="Created" value={new Date(item.createdAt).toLocaleString()} />
          <DetailField label="Updated" value={new Date(item.updatedAt).toLocaleString()} />
        </div>
      </section>

      {/* Verifies: FR-WF-011 (action buttons conditionally shown by status) */}
      <ActionPanel
        item={item}
        actionLoading={actionLoading}
        rejectReason={rejectReason}
        dispatchTeam={dispatchTeam}
        onRejectReasonChange={setRejectReason}
        onDispatchTeamChange={setDispatchTeam}
        onRoute={handleRoute}
        onApprove={handleApprove}
        onReject={handleReject}
        onDispatch={handleDispatch}
      />

      {/* Verifies: FR-WF-011 (assessment records: cards per assessment showing role, verdict, notes, suggestedChanges) */}
      {item.assessments.length > 0 && (
        <section data-testid="assessments-section" style={{ ...sectionStyle, marginBottom: '24px' }}>
          <h2 style={sectionHeadingStyle}>Assessment Records</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {item.assessments.map((assessment, index) => (
              <AssessmentCard key={index} assessment={assessment} />
            ))}
          </div>
        </section>
      )}

      {/* Verifies: FR-WF-011 (change history timeline: chronological list with agent, field, old/new value, timestamp) */}
      <section data-testid="history-section" style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Change History</h2>
        {item.changeHistory.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No history entries</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...item.changeHistory].reverse().map((entry, index) => (
              <HistoryEntry key={index} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// --- Sub-components ---

const DetailField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
      {label}
    </div>
    <div style={{ fontSize: '14px', textTransform: 'capitalize' }}>{value}</div>
  </div>
);

// Verifies: FR-WF-011 (conditional action buttons by status)
const ActionPanel: React.FC<{
  item: WorkItem;
  actionLoading: boolean;
  rejectReason: string;
  dispatchTeam: string;
  onRejectReasonChange: (v: string) => void;
  onDispatchTeamChange: (v: string) => void;
  onRoute: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDispatch: () => void;
}> = ({
  item,
  actionLoading,
  rejectReason,
  dispatchTeam,
  onRejectReasonChange,
  onDispatchTeamChange,
  onRoute,
  onApprove,
  onReject,
  onDispatch,
}) => {
  const status = item.status;
  const showRoute = status === WorkItemStatus.Backlog;
  const showApproveReject =
    status === WorkItemStatus.Proposed || status === WorkItemStatus.Reviewing;
  const showDispatch = status === WorkItemStatus.Approved;

  if (!showRoute && !showApproveReject && !showDispatch) return null;

  return (
    <section data-testid="actions-section" style={{ ...sectionStyle, marginBottom: '24px' }}>
      <h2 style={sectionHeadingStyle}>Actions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* "Route" when status=backlog */}
        {showRoute && (
          <div>
            <button
              data-testid="action-route"
              onClick={onRoute}
              disabled={actionLoading}
              style={{ ...actionBtnStyle, backgroundColor: '#8b5cf6' }}
            >
              Route
            </button>
          </div>
        )}

        {/* "Approve" when status=proposed|reviewing */}
        {showApproveReject && (
          <>
            <div>
              <button
                data-testid="action-approve"
                onClick={onApprove}
                disabled={actionLoading}
                style={{ ...actionBtnStyle, backgroundColor: '#10b981' }}
              >
                Approve
              </button>
            </div>

            {/* "Reject" when status=proposed|reviewing (with reason textarea) */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <textarea
                data-testid="reject-reason"
                aria-label="Rejection reason"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  minHeight: '60px',
                  resize: 'vertical',
                }}
              />
              <button
                data-testid="action-reject"
                onClick={onReject}
                disabled={actionLoading || !rejectReason.trim()}
                style={{ ...actionBtnStyle, backgroundColor: '#ef4444' }}
              >
                Reject
              </button>
            </div>
          </>
        )}

        {/* "Dispatch" when status=approved (with team selection) */}
        {showDispatch && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              data-testid="dispatch-team-select"
              aria-label="Select team"
              value={dispatchTeam}
              onChange={(e) => onDispatchTeamChange(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value="TheATeam">TheATeam</option>
              <option value="TheFixer">TheFixer</option>
            </select>
            <button
              data-testid="action-dispatch"
              onClick={onDispatch}
              disabled={actionLoading}
              style={{ ...actionBtnStyle, backgroundColor: '#6366f1' }}
            >
              Dispatch
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const VERDICT_COLORS: Record<AssessmentVerdict, string> = {
  [AssessmentVerdict.Approve]: '#10b981',
  [AssessmentVerdict.Reject]: '#ef4444',
  [AssessmentVerdict.NeedsClarification]: '#f59e0b',
};

// Verifies: FR-WF-011 (assessment cards with role, verdict badge, notes, suggestedChanges)
const AssessmentCard: React.FC<{ assessment: AssessmentRecord }> = ({ assessment }) => (
  <div
    data-testid="assessment-card"
    style={{
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#fafafa',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{assessment.role}</span>
      <span
        data-testid="verdict-badge"
        style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: VERDICT_COLORS[assessment.verdict] ?? '#6b7280',
        }}
      >
        {assessment.verdict}
      </span>
    </div>
    <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.5 }}>{assessment.notes}</p>
    {assessment.suggestedChanges.length > 0 && (
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
          Suggested Changes:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
          {assessment.suggestedChanges.map((change, i) => (
            <li key={i}>{change}</li>
          ))}
        </ul>
      </div>
    )}
    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
      {new Date(assessment.timestamp).toLocaleString()}
    </div>
  </div>
);

// Verifies: FR-WF-011 (change history timeline with agent, field, old→new value, timestamp)
const HistoryEntry: React.FC<{ entry: ChangeHistoryEntry }> = ({ entry }) => (
  <div
    data-testid="history-entry"
    style={{
      display: 'flex',
      gap: '12px',
      padding: '8px 12px',
      borderLeft: '3px solid #e5e7eb',
      fontSize: '14px',
    }}
  >
    <div style={{ minWidth: '140px', color: '#9ca3af', fontSize: '12px' }}>
      {new Date(entry.timestamp).toLocaleString()}
    </div>
    <div style={{ flex: 1 }}>
      <span style={{ fontWeight: 600 }}>{entry.agent}</span> changed{' '}
      <span style={{ fontWeight: 600 }}>{entry.field}</span>
      {entry.oldValue !== undefined && entry.oldValue !== null && (
        <>
          {' '}
          from <code style={codeStyle}>{String(entry.oldValue)}</code>
        </>
      )}
      {' '}
      to <code style={codeStyle}>{String(entry.newValue)}</code>
      {entry.reason && (
        <span style={{ color: '#6b7280', fontStyle: 'italic' }}> &mdash; {entry.reason}</span>
      )}
    </div>
  </div>
);

// --- Styles ---

const sectionStyle: React.CSSProperties = {
  padding: '20px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#fff',
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '18px',
  fontWeight: 600,
};

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
};

const codeStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  padding: '1px 4px',
  borderRadius: '3px',
  fontSize: '13px',
};
