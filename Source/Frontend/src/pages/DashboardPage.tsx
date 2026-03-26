// Verifies: FR-WF-009 (Dashboard page with summary, queues, activity feed)

import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { WorkItemStatus, WorkItemPriority } from '../../../Shared/types/workflow';
import type { ChangeHistoryEntry } from '../../../Shared/types/workflow';

// Verifies: FR-WF-009 — Summary cards showing status counts
const SummaryCards: React.FC<{ statusCounts: Record<string, number> }> = ({ statusCounts }) => {
  const total = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);
  const statuses = Object.values(WorkItemStatus);

  return (
    <section data-testid="summary-cards">
      <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Summary</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Card label="Total Items" value={total} />
        {statuses.map((s) => (
          <Card key={s} label={s} value={statusCounts[s] ?? 0} />
        ))}
      </div>
    </section>
  );
};

const Card: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      minWidth: '120px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{label}</div>
  </div>
);

// Verifies: FR-WF-009 — Team workload section
const TeamWorkload: React.FC<{ teamCounts: Record<string, number> }> = ({ teamCounts }) => (
  <section data-testid="team-workload">
    <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Team Workload</h2>
    <div style={{ display: 'flex', gap: '12px' }}>
      {Object.entries(teamCounts).map(([team, count]) => (
        <Card key={team} label={team} value={count} />
      ))}
      {Object.keys(teamCounts).length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>No items assigned to teams yet.</p>
      )}
    </div>
  </section>
);

// Verifies: FR-WF-009 — Priority distribution
const PriorityDistribution: React.FC<{ priorityCounts: Record<string, number> }> = ({ priorityCounts }) => (
  <section data-testid="priority-distribution">
    <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Priority Distribution</h2>
    <div style={{ display: 'flex', gap: '12px' }}>
      {Object.values(WorkItemPriority).map((p) => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PriorityBadge priority={p} />
          <span style={{ fontWeight: 600 }}>{priorityCounts[p] ?? 0}</span>
        </div>
      ))}
    </div>
  </section>
);

// Verifies: FR-WF-009 — Queue breakdown table
const QueueBreakdown: React.FC<{ queue: { status: WorkItemStatus; count: number }[] }> = ({ queue }) => (
  <section data-testid="queue-breakdown">
    <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Queue Breakdown</h2>
    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6' }}>
          <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '13px' }}>Status</th>
          <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: '13px' }}>Count</th>
        </tr>
      </thead>
      <tbody>
        {queue.map((q) => (
          <tr key={q.status} style={{ borderTop: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px 16px' }}><StatusBadge status={q.status} /></td>
            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600 }}>{q.count}</td>
          </tr>
        ))}
        {queue.length === 0 && (
          <tr>
            <td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No items in queue.</td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
);

// Verifies: FR-WF-009 — Recent activity feed (last 10 entries)
const ActivityFeed: React.FC<{ entries: (ChangeHistoryEntry & { workItemId?: string; workItemDocId?: string })[] }> = ({ entries }) => {
  const recent = entries.slice(0, 10);
  return (
    <section data-testid="activity-feed">
      <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Recent Activity</h2>
      {recent.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px' }}>No recent activity.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {recent.map((entry, idx) => (
          <li
            key={idx}
            style={{
              padding: '10px 16px',
              backgroundColor: '#fff',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#6b7280' }}>{new Date(entry.timestamp).toLocaleString()}</span>
            {' '}
            <strong>{entry.agent}</strong> changed <em>{entry.field}</em>
            {entry.workItemDocId && (
              <> on <strong>{entry.workItemDocId}</strong></>
            )}
            {': '}
            <span style={{ color: '#ef4444' }}>{String(entry.oldValue ?? '(none)')}</span>
            {' -> '}
            <span style={{ color: '#10b981' }}>{String(entry.newValue ?? '(none)')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// Verifies: FR-WF-009 — Main Dashboard page component
export const DashboardPage: React.FC = () => {
  const { summary, activity, queue, loading, error, refresh } = useDashboard();

  if (loading) {
    return <div data-testid="dashboard-loading" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        Error loading dashboard: {error}
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Dashboard</h1>
        {/* Verifies: FR-WF-009 — Refresh button */}
        <button
          data-testid="refresh-button"
          onClick={refresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {summary && <SummaryCards statusCounts={summary.statusCounts} />}
        {summary && <TeamWorkload teamCounts={summary.teamCounts} />}
        {summary && <PriorityDistribution priorityCounts={summary.priorityCounts} />}
        {queue && <QueueBreakdown queue={queue.data} />}
        {activity && <ActivityFeed entries={activity.data} />}
      </div>
    </div>
  );
};
