// Verifies: FR-WF-010 (Work Item list page with filtering and pagination)

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
} from '../../../Shared/types/workflow';
import type { WorkItemFilters, PaginationParams } from '../../../Shared/types/workflow';
import { useWorkItems } from '../hooks/useWorkItems';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TypeBadge } from '../components/TypeBadge';

const PAGE_SIZES = [10, 20, 50];

// Verifies: FR-WF-010 (filterable, paginated work item list)
export const WorkItemListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WorkItemFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 20 });

  const { data, page, total, totalPages, loading, error, refresh } = useWorkItems({
    ...filters,
    ...pagination,
  });

  const handleFilterChange = useCallback(
    (field: keyof WorkItemFilters, value: string) => {
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

  const handleRowClick = useCallback(
    (id: string) => {
      navigate(`/work-items/${id}`);
    },
    [navigate],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Work Items</h1>
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

      {/* Verifies: FR-WF-010 (filter controls: status, type, priority dropdowns) */}
      <div
        data-testid="filter-controls"
        style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}
      >
        <select
          aria-label="Filter by status"
          value={filters.status ?? ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Statuses</option>
          {Object.values(WorkItemStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by type"
          value={filters.type ?? ''}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Types</option>
          {Object.values(WorkItemType).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by priority"
          value={filters.priority ?? ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Priorities</option>
          {Object.values(WorkItemPriority).map((p) => (
            <option key={p} value={p}>
              {p}
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
          {/* Verifies: FR-WF-010 (paginated table with docId, title, type, status, priority, assignedTeam, updatedAt) */}
          <table
            data-testid="work-items-table"
            style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Doc ID</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    No work items found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    data-testid={`work-item-row-${item.id}`}
                    onClick={() => handleRowClick(item.id)}
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                    }}
                  >
                    <td style={tdStyle}>{item.docId}</td>
                    <td style={tdStyle}>{item.title}</td>
                    <td style={tdStyle}>
                      <TypeBadge type={item.type} />
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={tdStyle}>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td style={tdStyle}>{item.assignedTeam ?? '-'}</td>
                    <td style={tdStyle}>{new Date(item.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Verifies: FR-WF-010 (pagination: prev/next buttons, page size selector) */}
          <div
            data-testid="pagination-controls"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing {data.length} of {total} items (Page {page} of {totalPages || 1})
              </span>
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
