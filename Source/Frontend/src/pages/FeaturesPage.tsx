// Verifies: FR-CB-012 — Features Browser Page with paginated list of delivered features

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { PaginationParams } from '../../../Shared/types/workflow';
import { useFeatures } from '../hooks/useFeatures';

const PAGE_SIZES = [10, 20, 50];

// Verifies: FR-CB-012 — Paginated features table with title, description, branch, merged date, work item link
export const FeaturesPage: React.FC = () => {
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 20 });

  const { data, page, total, totalPages, loading, error, refresh } = useFeatures(pagination);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setPagination({ page: 1, limit: newLimit });
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Features</h1>
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
          {/* Verifies: FR-CB-012 — Features table with title, description (truncated), branch, merged date */}
          <table
            data-testid="features-table"
            style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Branch</th>
                <th style={thStyle}>Merged</th>
                <th style={thStyle}>Work Item</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    No features found
                  </td>
                </tr>
              ) : (
                data.map((feature) => (
                  <tr
                    key={feature.id}
                    data-testid={`feature-row-${feature.id}`}
                    style={{ borderBottom: '1px solid #e5e7eb' }}
                  >
                    <td style={tdStyle}>{feature.title}</td>
                    <td style={tdStyle} title={feature.description}>
                      {feature.description.length > 100
                        ? `${feature.description.slice(0, 100)}...`
                        : feature.description}
                    </td>
                    <td style={tdStyle}>
                      <code style={{ fontSize: '12px', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                        {feature.branch}
                      </code>
                    </td>
                    <td style={tdStyle}>
                      {feature.mergedAt
                        ? new Date(feature.mergedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td style={tdStyle}>
                      {/* Verifies: FR-CB-012 — Each row links to /work-items/{workItemId} */}
                      <Link
                        to={`/work-items/${feature.workItemId}`}
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Verifies: FR-CB-012 — Pagination controls */}
          <div
            data-testid="pagination-controls"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {data.length} of {total} features (Page {page} of {totalPages || 1})
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

const navBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  cursor: 'pointer',
};
