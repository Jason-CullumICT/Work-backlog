import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchWorkItem,
  updateWorkItem,
  deleteWorkItem,
  fetchWorkItemHistory,
  transitionWorkItem,
  proposeWorkItem,
  reviewWorkItem,
} from '../api/client';
import { WorkItemStatus, WorkItemType, Priority } from '../types';
import type { WorkItem, ChangeEntry } from '../types';
import { logger } from '../utils/logger';

/** Valid transitions per status */
const TRANSITIONS: Record<string, string[]> = {
  [WorkItemStatus.BACKLOG]: [WorkItemStatus.PROPOSED, WorkItemStatus.UNDER_REVIEW],
  [WorkItemStatus.PROPOSED]: [WorkItemStatus.UNDER_REVIEW],
  [WorkItemStatus.UNDER_REVIEW]: [WorkItemStatus.APPROVED, WorkItemStatus.REJECTED],
  [WorkItemStatus.APPROVED]: [WorkItemStatus.IN_DEV],
  [WorkItemStatus.IN_DEV]: [WorkItemStatus.DONE],
  [WorkItemStatus.REJECTED]: [WorkItemStatus.BACKLOG],
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<WorkItem | null>(null);
  const [history, setHistory] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Proposal form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalRequirements, setProposalRequirements] = useState('');
  const [proposalPrototypeUrl, setProposalPrototypeUrl] = useState('');

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [itemData, historyData] = await Promise.all([
        fetchWorkItem(id),
        fetchWorkItemHistory(id),
      ]);
      setItem(itemData);
      setHistory(historyData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load work item';
      setError(message);
      logger.error('Failed to load work item', { id, error: message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  async function handleInlineEdit(field: string) {
    if (!item || !id) return;
    try {
      const updated = await updateWorkItem(id, { [field]: editValue } as Partial<WorkItem>);
      setItem(updated);
      setEditingField(null);
      // Refresh history
      const historyData = await fetchWorkItemHistory(id);
      setHistory(historyData);
      logger.info('Work item updated', { id, field });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      logger.error('Failed to update work item', { id, field, error: message });
    }
  }

  function startEditing(field: string, currentValue: string) {
    setEditingField(field);
    setEditValue(currentValue);
  }

  function cancelEditing() {
    setEditingField(null);
    setEditValue('');
  }

  async function handleTransition(target: string) {
    if (!id) return;
    try {
      const updated = await transitionWorkItem(id, target);
      setItem(updated);
      const historyData = await fetchWorkItemHistory(id);
      setHistory(historyData);
      logger.info('Work item transitioned', { id, target });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transition failed';
      logger.error('Failed to transition work item', { id, target, error: message });
    }
  }

  async function handlePropose() {
    if (!id || !proposalRequirements.trim()) return;
    try {
      await proposeWorkItem(id, {
        requirements: proposalRequirements.trim(),
        prototypeUrl: proposalPrototypeUrl.trim() || undefined,
      });
      setShowProposalForm(false);
      setProposalRequirements('');
      setProposalPrototypeUrl('');
      await loadItem();
      logger.info('Proposal submitted', { id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proposal failed';
      logger.error('Failed to propose work item', { id, error: message });
    }
  }

  async function handleReview() {
    if (!id) return;
    try {
      await reviewWorkItem(id, {
        decision: reviewDecision,
        feedback: reviewFeedback.trim() || undefined,
      });
      setShowReviewForm(false);
      setReviewFeedback('');
      await loadItem();
      logger.info('Review submitted', { id, decision: reviewDecision });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Review failed';
      logger.error('Failed to review work item', { id, error: message });
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteWorkItem(id);
      logger.info('Work item deleted', { id });
      navigate('/backlog');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      logger.error('Failed to delete work item', { id, error: message });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12" data-testid="loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
          {error ?? 'Work item not found'}
        </div>
      </div>
    );
  }

  const validTransitions = TRANSITIONS[item.status] ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="item-detail">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/backlog')}
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          &larr; Back to Backlog
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6" data-testid="delete-confirm">
          <p className="text-red-700 mb-3">Are you sure you want to delete this work item?</p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-1.5 rounded-md hover:bg-red-700 text-sm"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Item fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {/* Title */}
          <EditableField
            label="Title"
            value={item.title}
            field="title"
            editingField={editingField}
            editValue={editValue}
            onStartEdit={startEditing}
            onSave={handleInlineEdit}
            onCancel={cancelEditing}
            onEditValueChange={setEditValue}
          />

          {/* Description */}
          <EditableField
            label="Description"
            value={item.description || '(none)'}
            field="description"
            editingField={editingField}
            editValue={editValue}
            onStartEdit={startEditing}
            onSave={handleInlineEdit}
            onCancel={cancelEditing}
            onEditValueChange={setEditValue}
            multiline
          />

          {/* Type */}
          <EditableSelectField
            label="Type"
            value={item.type}
            field="type"
            options={Object.values(WorkItemType)}
            editingField={editingField}
            editValue={editValue}
            onStartEdit={startEditing}
            onSave={handleInlineEdit}
            onCancel={cancelEditing}
            onEditValueChange={setEditValue}
          />

          {/* Priority */}
          <EditableSelectField
            label="Priority"
            value={item.priority}
            field="priority"
            options={Object.values(Priority)}
            editingField={editingField}
            editValue={editValue}
            onStartEdit={startEditing}
            onSave={handleInlineEdit}
            onCancel={cancelEditing}
            onEditValueChange={setEditValue}
          />

          {/* Status (read-only) */}
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-medium text-gray-500 w-28">Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {item.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Source (read-only) */}
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-medium text-gray-500 w-28">Source</span>
            <span className="text-sm text-gray-900">{item.source.replace(/_/g, ' ')}</span>
          </div>

          {/* Created */}
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-medium text-gray-500 w-28">Created</span>
            <span className="text-sm text-gray-900">{new Date(item.created_at).toLocaleString()}</span>
          </div>

          {/* Updated */}
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-medium text-gray-500 w-28">Updated</span>
            <span className="text-sm text-gray-900">{new Date(item.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Status transitions */}
      {validTransitions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6" data-testid="transitions">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Transitions</h2>
          <div className="flex flex-wrap gap-3">
            {validTransitions.map((target) => (
              <button
                key={target}
                onClick={() => handleTransition(target)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm transition-colors"
                data-testid={`transition-${target}`}
              >
                Move to {target.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Proposal section */}
      {item.status === WorkItemStatus.BACKLOG && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6" data-testid="proposal-section">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Proposal</h2>
          {!showProposalForm ? (
            <button
              onClick={() => setShowProposalForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm transition-colors"
            >
              Propose
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="proposal-requirements" className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  id="proposal-requirements"
                  value={proposalRequirements}
                  onChange={(e) => setProposalRequirements(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="proposal-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Prototype URL (optional)
                </label>
                <input
                  id="proposal-url"
                  type="text"
                  value={proposalPrototypeUrl}
                  onChange={(e) => setProposalPrototypeUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePropose}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                >
                  Submit Proposal
                </button>
                <button
                  onClick={() => setShowProposalForm(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review section */}
      {item.status === WorkItemStatus.UNDER_REVIEW && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6" data-testid="review-section">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Review</h2>
          {!showReviewForm ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setReviewDecision('approved'); setShowReviewForm(true); }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Approve
              </button>
              <button
                onClick={() => { setReviewDecision('rejected'); setShowReviewForm(true); }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Decision: <strong>{reviewDecision}</strong>
              </p>
              <div>
                <label htmlFor="review-feedback" className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback (optional)
                </label>
                <textarea
                  id="review-feedback"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReview}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                >
                  Submit Review
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change history */}
      <div className="bg-white border border-gray-200 rounded-lg p-6" data-testid="change-history">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No changes recorded.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 border-l-2 border-gray-200 pl-4 py-1"
                data-testid={`history-entry-${entry.id}`}
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{entry.field}</span>:{' '}
                    <span className="text-gray-500">{entry.old_value ?? '(none)'}</span>
                    {' -> '}
                    <span className="text-gray-700">{entry.new_value ?? '(none)'}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {entry.changed_by ? `by ${entry.changed_by} - ` : ''}
                    {new Date(entry.changed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline editable text field */
function EditableField({
  label,
  value,
  field,
  editingField,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
  multiline = false,
}: {
  label: string;
  value: string;
  field: string;
  editingField: string | null;
  editValue: string;
  onStartEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
  multiline?: boolean;
}) {
  const isEditing = editingField === field;

  return (
    <div className="flex items-baseline gap-4">
      <span className="text-sm font-medium text-gray-500 w-28">{label}</span>
      {isEditing ? (
        <div className="flex-1 flex gap-2 items-start">
          {multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(field);
                if (e.key === 'Escape') onCancel();
              }}
            />
          )}
          <button
            onClick={() => onSave(field)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <span
          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
          onClick={() => onStartEdit(field, value === '(none)' ? '' : value)}
          title="Click to edit"
        >
          {value}
        </span>
      )}
    </div>
  );
}

/** Inline editable select field */
function EditableSelectField({
  label,
  value,
  field,
  options,
  editingField,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: {
  label: string;
  value: string;
  field: string;
  options: string[];
  editingField: string | null;
  editValue: string;
  onStartEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
}) {
  const isEditing = editingField === field;

  return (
    <div className="flex items-baseline gap-4">
      <span className="text-sm font-medium text-gray-500 w-28">{label}</span>
      {isEditing ? (
        <div className="flex gap-2 items-center">
          <select
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
            autoFocus
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            onClick={() => onSave(field)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <span
          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
          onClick={() => onStartEdit(field, value)}
          title="Click to edit"
        >
          {value}
        </span>
      )}
    </div>
  );
}
