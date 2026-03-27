// Verifies: FR-CB-013 — Learnings Page with team/role filters and paginated list

import React, { useState, useCallback } from 'react';
import type { LearningFilters, PaginationParams } from '../../../Shared/types/workflow';
import { useLearnings } from '../hooks/useLearnings';

const PAGE_SIZES = [10, 20, 50];

const TEAMS = ['TheATeam', 'TheFixer'];
const ROLES = [
  'backend-coder',
  'frontend-coder',
  'qa-review',
  'security-qa',
  'design-critic',
  'chaos-tester',
  'traceability-reporter',
];

// Verifies: FR-CB-013 — Paginated learnings list with team/role filter dropdowns
export const LearningsPage: React.FC = () => {
  const [filters, setFilters] = useState<LearningFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 20 });

  const { data, page, total, totalPages, loading, error, refresh } = useLearnings({
    ...filters,
    ...pagination,
  });

  const handleFilterChange = useCallback(
    (field: keyof LearningFilters, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [field]: value || undefined,
      }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setPagination({ page: 1, limit: newLimit });
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Learnings</h1>
        <button
          onClick={refresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Verifies: FR-CB-013 — Filter bar: team dropdown, role dropdown */}
      <div
        data-testid="filter-controls"
        style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}
      >
        <select
          aria-label="Filter by team"
          value={filters.team ?? ''}
          onChange={(e) => handleFilterChange('team', e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Teams</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by role"
          value={filters.role ?? ''}
          onChange={(e) => handleFilterChange('role', e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
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
      ) : (
        <>
          {/* Verifies: FR-CB-013 — Learnings list cards: content, team badge, role badge, category tag, date */}
          <div data-testid="learnings-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                No learnings found
              </div>
            ) : (
              data.map((learning) => (
                <div
                  key={learning.id}
                  data-testid={`learning-card-${learning.id}`}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                    {learning.content}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={badgeStyle('#dbeafe', '#1e40af')}>{learning.team}</span>
                    <span style={badgeStyle('#e0e7ff', '#3730a3')}>{learning.role}</span>
                    {learning.category && (
                      <span style={badgeStyle('#fef3c7', '#92400e')}>{learning.category}</span>
                    )}
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>
                      {new Date(learning.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Verifies: FR-CB-013 — Pagination controls */}
          <div
            data-testid="pagination-controls"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {data.length} of {total} learnings (Page {page} of {totalPages || 1})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                aria-label="Page size"
                value={pagination.limit}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                style={navBtnStyle}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                style={navBtnStyle}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 500,
  backgroundColor: bg,
  color,
});

const navBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  cursor: 'pointer',
};
