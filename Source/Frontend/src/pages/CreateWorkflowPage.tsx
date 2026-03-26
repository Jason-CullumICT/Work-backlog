// Verifies: FR-WFD-009 (Create workflow page with form for all workflow configuration)

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowsApi } from '../hooks/useWorkflows';
import type { CreateWorkflowRequest, RoutingRule, AssessmentRole } from '../hooks/useWorkflows';
import { StageType, ConsensusRule, RuleOperator, WorkItemRoute, WorkItemStatus } from '../../../Shared/types/workflow';

// Verifies: FR-WFD-009 — Stage type definitions matching default workflow pattern
const STAGE_TYPES = [
  { type: StageType.Intake, name: 'Input Sources', description: 'Entry point for work items from various sources' },
  { type: StageType.Queue, name: 'Work Backlog', description: 'Queue of incoming work items awaiting routing' },
  { type: StageType.Router, name: 'Work Router', description: 'Routes items to fast-track or full-review' },
  { type: StageType.Assessment, name: 'Assessment Pod', description: 'Pod of reviewers assess proposed work' },
  { type: StageType.Worklist, name: 'Approved Work', description: 'Items approved and ready for team dispatch' },
  { type: StageType.Dispatch, name: 'Team Dispatch', description: 'Dispatches work to implementation teams' },
];

const DEFAULT_ROLES: AssessmentRole[] = [
  { id: 'pod-lead', name: 'Pod Lead', description: 'Leads the assessment pod and has final say' },
  { id: 'requirements-reviewer', name: 'Requirements Reviewer', description: 'Reviews requirements clarity and completeness' },
  { id: 'domain-expert', name: 'Domain Expert', description: 'Evaluates domain correctness and feasibility' },
  { id: 'work-definer', name: 'Work Definer', description: 'Defines work breakdown and acceptance criteria' },
];

const AVAILABLE_TEAMS = ['TheATeam', 'TheFixer'];

const CONSENSUS_OPTIONS = [
  { value: ConsensusRule.AllApprove, label: 'All Approve' },
  { value: ConsensusRule.MajorityApprove, label: 'Majority Approve' },
  { value: ConsensusRule.LeadDecides, label: 'Lead Decides' },
];

const FIELD_OPTIONS = ['type', 'complexity'];
const OPERATOR_OPTIONS = ['equals', 'in'];
const TYPE_VALUES = ['feature', 'bug', 'issue', 'improvement'];
const COMPLEXITY_VALUES = ['trivial', 'small', 'medium', 'large', 'complex'];
const PATH_OPTIONS = [WorkItemRoute.FastTrack, WorkItemRoute.FullReview];

interface FormErrors {
  name?: string;
  description?: string;
  stages?: string;
  teamTargets?: string;
}

interface RuleFormEntry {
  field: string;
  operator: string;
  value: string;
  path: WorkItemRoute;
  priority: number;
  name: string;
}

// Verifies: FR-WFD-009 — Create workflow form with all configuration sections
export const CreateWorkflowPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabledStages, setEnabledStages] = useState<Record<string, boolean>>(
    Object.fromEntries(STAGE_TYPES.map((s) => [s.type, true])),
  );
  const [roles, setRoles] = useState<AssessmentRole[]>([...DEFAULT_ROLES]);
  const [consensusRule, setConsensusRule] = useState<ConsensusRule>(ConsensusRule.AllApprove);
  const [teamTargets, setTeamTargets] = useState<Record<string, boolean>>(
    Object.fromEntries(AVAILABLE_TEAMS.map((t) => [t, true])),
  );
  const [routingRules, setRoutingRules] = useState<RuleFormEntry[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New role form state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  // Verifies: FR-WFD-009 — Validation: name, description required, at least one stage and team target
  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!description.trim()) errs.description = 'Description is required';
    const activeStages = Object.values(enabledStages).filter(Boolean);
    if (activeStages.length === 0) errs.stages = 'At least one stage is required';
    const activeTeams = Object.entries(teamTargets).filter(([, v]) => v);
    if (activeTeams.length === 0) errs.teamTargets = 'At least one team target is required';
    return errs;
  }, [name, description, enabledStages, teamTargets]);

  // Verifies: FR-WFD-009 — Submit creates workflow and navigates to detail page
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const stageStatusMap: Record<StageType, WorkItemStatus> = {
      [StageType.Intake]: WorkItemStatus.Backlog,
      [StageType.Queue]: WorkItemStatus.Backlog,
      [StageType.Router]: WorkItemStatus.Routing,
      [StageType.Assessment]: WorkItemStatus.Reviewing,
      [StageType.Worklist]: WorkItemStatus.Approved,
      [StageType.Dispatch]: WorkItemStatus.InProgress,
    };

    const stages = STAGE_TYPES
      .filter((s) => enabledStages[s.type])
      .map((s, i) => ({
        name: s.name,
        type: s.type,
        order: i,
        description: s.description,
        statusMapping: stageStatusMap[s.type],
      }));

    const formattedRules: Omit<RoutingRule, 'id'>[] = routingRules.map((r) => ({
      name: r.name || `Rule ${r.priority}`,
      path: r.path,
      conditions: [{
        field: r.field,
        operator: r.operator as RuleOperator,
        value: r.operator === 'in' ? r.value.split(',').map((v) => v.trim()) : r.value,
      }],
      priority: r.priority,
    }));

    const payload: CreateWorkflowRequest = {
      name: name.trim(),
      description: description.trim(),
      stages,
      routingRules: formattedRules,
      assessmentConfig: {
        roles,
        consensusRule,
      },
      teamTargets: Object.entries(teamTargets).filter(([, v]) => v).map(([k]) => k),
    };

    try {
      const created = await workflowsApi.create(payload);
      navigate(`/workflows/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create workflow');
      setSubmitting(false);
    }
  };

  const handleStageToggle = (type: string) => {
    setEnabledStages((prev) => ({ ...prev, [type]: !prev[type] }));
    if (errors.stages) setErrors((prev) => ({ ...prev, stages: undefined }));
  };

  const handleTeamToggle = (team: string) => {
    setTeamTargets((prev) => ({ ...prev, [team]: !prev[team] }));
    if (errors.teamTargets) setErrors((prev) => ({ ...prev, teamTargets: undefined }));
  };

  const addRoutingRule = () => {
    setRoutingRules((prev) => [
      ...prev,
      { field: 'type', operator: 'equals', value: '', path: WorkItemRoute.FastTrack, priority: prev.length + 1, name: '' },
    ]);
  };

  const removeRoutingRule = (index: number) => {
    setRoutingRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRoutingRule = (index: number, updates: Partial<RuleFormEntry>) => {
    setRoutingRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const addRole = () => {
    if (!newRoleName.trim()) return;
    const id = newRoleName.trim().toLowerCase().replace(/\s+/g, '-');
    setRoles((prev) => [...prev, { id, name: newRoleName.trim(), description: newRoleDescription.trim() }]);
    setNewRoleName('');
    setNewRoleDescription('');
  };

  const removeRole = (id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  const getValueOptions = (field: string) => (field === 'type' ? TYPE_VALUES : COMPLEXITY_VALUES);

  return (
    <div data-testid="create-workflow-page" style={{ maxWidth: '700px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Create Workflow</h1>

      {submitError && (
        <div data-testid="submit-error" style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="create-workflow-form">
        {/* Verifies: FR-WFD-009 — Basic Info: name (required), description (required) */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={sectionHeaderStyle}>Basic Info</h2>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="wf-name" style={labelStyle}>Name *</label>
            <input
              id="wf-name"
              data-testid="input-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : '#d1d5db' }}
            />
            {errors.name && <p data-testid="error-name" style={errorTextStyle}>{errors.name}</p>}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="wf-description" style={labelStyle}>Description *</label>
            <textarea
              id="wf-description"
              data-testid="input-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' as const, borderColor: errors.description ? '#ef4444' : '#d1d5db' }}
            />
            {errors.description && <p data-testid="error-description" style={errorTextStyle}>{errors.description}</p>}
          </div>
        </section>

        {/* Verifies: FR-WFD-009 — Stages: checklist of stage types, all pre-checked by default */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={sectionHeaderStyle}>Stages</h2>
          {errors.stages && <p data-testid="error-stages" style={errorTextStyle}>{errors.stages}</p>}
          <div data-testid="stage-checklist" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STAGE_TYPES.map((s) => (
              <label key={s.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid={`stage-${s.type}`}
                  checked={enabledStages[s.type]}
                  onChange={() => handleStageToggle(s.type)}
                />
                <span style={{ fontWeight: 500 }}>{s.name}</span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>({s.type})</span>
              </label>
            ))}
          </div>
        </section>

        {/* Verifies: FR-WFD-009 — Routing Rules: condition builder with field, operator, value, path, priority */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={sectionHeaderStyle}>Routing Rules</h2>
          {routingRules.map((rule, index) => (
            <div key={index} data-testid={`routing-rule-${index}`} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={smallLabelStyle}>Name</label>
                  <input
                    data-testid={`rule-name-${index}`}
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRoutingRule(index, { name: e.target.value })}
                    placeholder="Rule name"
                    style={smallInputStyle}
                  />
                </div>
                <div>
                  <label style={smallLabelStyle}>Field</label>
                  <select
                    data-testid={`rule-field-${index}`}
                    value={rule.field}
                    onChange={(e) => updateRoutingRule(index, { field: e.target.value, value: '' })}
                    style={smallInputStyle}
                  >
                    {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={smallLabelStyle}>Operator</label>
                  <select
                    data-testid={`rule-operator-${index}`}
                    value={rule.operator}
                    onChange={(e) => updateRoutingRule(index, { operator: e.target.value })}
                    style={smallInputStyle}
                  >
                    {OPERATOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={smallLabelStyle}>Value</label>
                  <select
                    data-testid={`rule-value-${index}`}
                    value={rule.value}
                    onChange={(e) => updateRoutingRule(index, { value: e.target.value })}
                    style={smallInputStyle}
                  >
                    <option value="">Select...</option>
                    {getValueOptions(rule.field).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={smallLabelStyle}>Path</label>
                  <select
                    data-testid={`rule-path-${index}`}
                    value={rule.path}
                    onChange={(e) => updateRoutingRule(index, { path: e.target.value as WorkItemRoute })}
                    style={smallInputStyle}
                  >
                    {PATH_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={smallLabelStyle}>Priority</label>
                  <input
                    data-testid={`rule-priority-${index}`}
                    type="number"
                    value={rule.priority}
                    onChange={(e) => updateRoutingRule(index, { priority: Number(e.target.value) })}
                    style={{ ...smallInputStyle, width: '60px' }}
                    min={1}
                  />
                </div>
                <button
                  type="button"
                  data-testid={`remove-rule-${index}`}
                  onClick={() => removeRoutingRule(index)}
                  style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            data-testid="add-rule-button"
            onClick={addRoutingRule}
            style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            + Add Rule
          </button>
        </section>

        {/* Verifies: FR-WFD-009 — Assessment Config: role list with add/remove, consensus rule selector */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={sectionHeaderStyle}>Assessment Configuration</h2>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Pod Roles</label>
            <div data-testid="roles-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {roles.map((role) => (
                <div key={role.id} data-testid={`role-${role.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{role.name}</span>
                  <span style={{ color: '#9ca3af', fontSize: '12px', flex: 2 }}>{role.description}</span>
                  <button
                    type="button"
                    data-testid={`remove-role-${role.id}`}
                    onClick={() => removeRole(role.id)}
                    style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div>
                <label style={smallLabelStyle}>Role Name</label>
                <input
                  data-testid="new-role-name"
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Role name"
                  style={smallInputStyle}
                />
              </div>
              <div>
                <label style={smallLabelStyle}>Description</label>
                <input
                  data-testid="new-role-description"
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Role description"
                  style={{ ...smallInputStyle, width: '200px' }}
                />
              </div>
              <button
                type="button"
                data-testid="add-role-button"
                onClick={addRole}
                style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                + Add Role
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="consensus-rule" style={labelStyle}>Consensus Rule</label>
            <select
              id="consensus-rule"
              data-testid="select-consensus"
              value={consensusRule}
              onChange={(e) => setConsensusRule(e.target.value as ConsensusRule)}
              style={inputStyle}
            >
              {CONSENSUS_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Verifies: FR-WFD-009 — Team Targets: checkbox list */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={sectionHeaderStyle}>Team Targets</h2>
          {errors.teamTargets && <p data-testid="error-team-targets" style={errorTextStyle}>{errors.teamTargets}</p>}
          <div data-testid="team-targets" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {AVAILABLE_TEAMS.map((team) => (
              <label key={team} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid={`team-${team}`}
                  checked={teamTargets[team]}
                  onChange={() => handleTeamToggle(team)}
                />
                <span style={{ fontWeight: 500 }}>{team}</span>
              </label>
            ))}
          </div>
        </section>

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
          {submitting ? 'Creating...' : 'Create Workflow'}
        </button>
      </form>
    </div>
  );
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '12px',
  paddingBottom: '8px',
  borderBottom: '1px solid #e5e7eb',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const smallLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: '2px',
};

const smallInputStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '13px',
};

const errorTextStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '12px',
  margin: '4px 0 0',
};
