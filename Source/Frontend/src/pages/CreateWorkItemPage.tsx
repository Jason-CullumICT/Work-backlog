// Verifies: FR-WF-012 (Create Work Item form page)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkItemType, WorkItemPriority, WorkItemSource } from '../../../Shared/types/workflow';
import type { CreateWorkItemRequest } from '../../../Shared/types/workflow';
import { workItemsApi } from '../api/client';

interface FormErrors {
  title?: string;
  description?: string;
}

// Verifies: FR-WF-012 — Create Work Item form with client-side validation
export const CreateWorkItemPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateWorkItemRequest>({
    title: '',
    description: '',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Verifies: FR-WF-012 — Client-side validation: title and description required
  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Verifies: FR-WF-012 — Submit calls POST /api/work-items
      const created = await workItemsApi.create(form);
      // Verifies: FR-WF-012 — On success, navigate to detail page
      navigate(`/work-items/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create work item');
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateWorkItemRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div data-testid="create-work-item-page" style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Create Work Item</h1>

      {submitError && (
        <div data-testid="submit-error" style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="create-form">
        {/* Verifies: FR-WF-012 — Title field (required) */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="title" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Title *
          </label>
          <input
            id="title"
            data-testid="input-title"
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          {errors.title && <p data-testid="error-title" style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{errors.title}</p>}
        </div>

        {/* Verifies: FR-WF-012 — Description field (textarea, required) */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="description" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Description *
          </label>
          <textarea
            id="description"
            data-testid="input-description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          {errors.description && <p data-testid="error-description" style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{errors.description}</p>}
        </div>

        {/* Verifies: FR-WF-012 — Type select (feature/bug/issue/improvement) */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="type" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Type
          </label>
          <select
            id="type"
            data-testid="select-type"
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            {Object.values(WorkItemType).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Verifies: FR-WF-012 — Priority select (critical/high/medium/low) */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="priority" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Priority
          </label>
          <select
            id="priority"
            data-testid="select-priority"
            value={form.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            {Object.values(WorkItemPriority).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Verifies: FR-WF-012 — Source select (browser/manual) */}
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="source" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Source
          </label>
          <select
            id="source"
            data-testid="select-source"
            value={form.source}
            onChange={(e) => handleChange('source', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value={WorkItemSource.Browser}>browser</option>
            <option value={WorkItemSource.Manual}>manual</option>
          </select>
        </div>

        <button
          type="submit"
          data-testid="submit-button"
          disabled={submitting}
          style={{
            padding: '10px 24px',
            backgroundColor: submitting ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Creating...' : 'Create Work Item'}
        </button>
      </form>
    </div>
  );
};
