import { useState, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchWorkflowTemplates, createWorkflowTemplate, updateWorkflowTemplate,
  deleteWorkflowTemplate
} from '../api';
import './WorkflowBuilder.css';

const TRIGGER_TYPES = [
  { value: 'project_start', label: 'Project Start' },
  { value: 'after_days', label: 'After X Days' },
  { value: 'date', label: 'Specific Date' },
  { value: 'milestone', label: 'At Milestone' },
  { value: 'manual', label: 'Manual Trigger' },
];

const FIELD_TYPES = [
  { value: 'text',     label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number',   label: 'Number' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'date',     label: 'Date' },
  { value: 'file',     label: 'File Upload' },
];

const Icons = {
  Grip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
  Trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Save: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  ArrowLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  List: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  ChevronDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronUp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
};

function SortableField({ field, fieldIndex, stageIndex, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const needsOptions = ['select', 'radio', 'checkbox'].includes(field.field_type);

  return (
    <div ref={setNodeRef} style={style} className="wb-field-card">
      <div className="wb-field-drag" {...attributes} {...listeners}>
        {Icons.Grip}
      </div>

      <div className="wb-field-body">
        <div className="wb-field-row">
          <input
            className="wb-input wb-input-sm"
            placeholder="Field label"
            value={field.label}
            onChange={e => onChange(stageIndex, fieldIndex, 'label', e.target.value)}
          />
          <select
            className="wb-select wb-select-sm"
            value={field.field_type}
            onChange={e => onChange(stageIndex, fieldIndex, 'field_type', e.target.value)}
          >
            {FIELD_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="wb-checkbox-label">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => onChange(stageIndex, fieldIndex, 'required', e.target.checked)}
            />
            Required
          </label>
        </div>

        {needsOptions && (
          <div className="wb-options-area">
            <span className="wb-options-label">Options (one per line):</span>
            <textarea
              className="wb-textarea-small"
              rows={2}
              value={(field.options || []).join('\n')}
              onChange={e => onChange(stageIndex, fieldIndex, 'options', e.target.value.split('\n').filter(Boolean))}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}
      </div>

      <button className="wb-remove-btn" onClick={() => onRemove(stageIndex, fieldIndex)} title="Remove field">
        {Icons.Trash}
      </button>
    </div>
  );
}

function SortableStage({ stage, index, onChange, onRemove, onFieldChange, onFieldRemove, onFieldAdd, onToggleFields }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const needsDays = stage.trigger_type === 'after_days';
  const needsDate = stage.trigger_type === 'date';
  const fields = stage.fields || [];
  const showFields = stage._showFields !== false;

  const fieldSensors = useSensors(useSensor(PointerSensor));

  const handleFieldDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex(f => f._id === active.id);
    const newIdx = fields.findIndex(f => f._id === over.id);
    const newFields = arrayMove(fields, oldIdx, newIdx);
    onChange(index, 'fields', newFields);
  };

  return (
    <div ref={setNodeRef} style={style} className="wb-stage-card">
      <div className="wb-stage-drag" {...attributes} {...listeners}>
        {Icons.Grip}
      </div>

      <div className="wb-stage-body">
        <div className="wb-stage-row">
          <input
            className="wb-input"
            placeholder="Stage name"
            value={stage.name}
            onChange={e => onChange(index, 'name', e.target.value)}
          />
          <select
            className="wb-select"
            value={stage.trigger_type}
            onChange={e => onChange(index, 'trigger_type', e.target.value)}
          >
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="wb-stage-row">
          <textarea
            className="wb-textarea-small"
            rows={2}
            placeholder="Stage description"
            value={stage.description}
            onChange={e => onChange(index, 'description', e.target.value)}
          />
        </div>

        {needsDays && (
          <div className="wb-stage-row">
            <label className="wb-label-small">Days after project start:</label>
            <input
              className="wb-input wb-input-sm"
              type="number"
              min="1"
              value={stage.trigger_days || ''}
              onChange={e => onChange(index, 'trigger_days', e.target.value)}
            />
          </div>
        )}

        {needsDate && (
          <div className="wb-stage-row">
            <label className="wb-label-small">Specific date:</label>
            <input
              className="wb-input"
              type="date"
              value={stage.trigger_date || ''}
              onChange={e => onChange(index, 'trigger_date', e.target.value)}
            />
          </div>
        )}

        <div className="wb-stage-row">
          <label className="wb-checkbox-label">
            <input
              type="checkbox"
              checked={stage.is_required}
              onChange={e => onChange(index, 'is_required', e.target.checked)}
            />
            Required stage
          </label>
          <div className="wb-notify-group">
            <label className="wb-label-small">Notify before:</label>
            <input
              className="wb-input wb-input-sm"
              type="number"
              min="0"
              value={stage.notify_before_days || 3}
              onChange={e => onChange(index, 'notify_before_days', e.target.value)}
            />
            <span className="wb-label-small">days</span>
          </div>
        </div>

        {/* Fields Section */}
        <div className="wb-fields-section">
          <div className="wb-fields-header">
            <button
              className="wb-fields-toggle"
              onClick={() => onToggleFields(index)}
              type="button"
            >
              {showFields ? Icons.ChevronUp : Icons.ChevronDown}
              <span>Form Fields ({fields.length})</span>
            </button>
            {showFields && (
              <button
                className="wb-add-field-btn"
                onClick={() => onFieldAdd(index)}
                type="button"
              >
                {Icons.Plus} Add Field
              </button>
            )}
          </div>

          {showFields && (
            <div className="wb-fields-list">
              {fields.length === 0 ? (
                <div className="wb-empty-fields">
                  <p>No fields yet. Add fields for students to fill.</p>
                </div>
              ) : (
                <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                  <SortableContext items={fields.map(f => f._id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field, fieldIndex) => (
                      <SortableField
                        key={field._id}
                        field={field}
                        fieldIndex={fieldIndex}
                        stageIndex={index}
                        onChange={onFieldChange}
                        onRemove={onFieldRemove}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>
      </div>

      <button className="wb-remove-btn" onClick={() => onRemove(index)} title="Remove stage">
        {Icons.Trash}
      </button>
    </div>
  );
}

export default function WorkflowBuilder({ onBack }) {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setLoading(true);
    fetchWorkflowTemplates()
      .then(res => setTemplates(res.data))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = stages.findIndex(s => s._id === active.id);
    const newIdx = stages.findIndex(s => s._id === over.id);
    setStages(arrayMove(stages, oldIdx, newIdx));
  };

  const addStage = () => {
    setStages(prev => [...prev, {
      _id: `new-${Date.now()}`,
      name: '',
      description: '',
      trigger_type: 'project_start',
      trigger_days: null,
      trigger_date: null,
      notify_before_days: 3,
      is_required: true,
      fields: [],
      _showFields: true,
    }]);
  };

  const updateStage = (index, key, value) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));
  };

  const removeStage = (index) => {
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleStageFields = (index) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, _showFields: !s._showFields } : s));
  };

  const addField = (stageIndex) => {
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          fields: [...(s.fields || []), {
            _id: `field-${Date.now()}`,
            label: '',
            field_type: 'text',
            required: false,
            options: [],
          }]
        };
      }
      return s;
    }));
  };

  const updateField = (stageIndex, fieldIndex, key, value) => {
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          fields: s.fields.map((f, fi) => fi === fieldIndex ? { ...f, [key]: value } : f)
        };
      }
      return s;
    }));
  };

  const removeField = (stageIndex, fieldIndex) => {
    setStages(prev => prev.map((s, i) => {
      if (i === stageIndex) {
        return {
          ...s,
          fields: s.fields.filter((_, fi) => fi !== fieldIndex)
        };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    if (stages.length === 0) {
      setError('Add at least one stage');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = {
        name,
        description,
        stages: stages.map((s, idx) => ({
          name: s.name,
          description: s.description,
          order: idx,
          trigger_type: s.trigger_type,
          trigger_days: s.trigger_days ? Number(s.trigger_days) : null,
          trigger_date: s.trigger_date || null,
          notify_before_days: Number(s.notify_before_days || 3),
          is_required: s.is_required,
          fields: (s.fields || []).map((f, fidx) => ({
            label: f.label,
            field_type: f.field_type,
            required: f.required,
            options: f.options || [],
            order: fidx,
          })),
        })),
      };

      if (currentTemplate) {
        await updateWorkflowTemplate(currentTemplate.id, data);
      } else {
        await createWorkflowTemplate(data);
      }

      loadTemplates();
      setView('list');
      resetForm();
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template) => {
    setCurrentTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setStages(template.stages.map((s, i) => ({
      _id: `stage-${i}-${s.id}`,
      ...s,
      fields: (s.fields || []).map((f, fi) => ({
        _id: `field-${i}-${fi}-${f.id}`,
        ...f,
      })),
      _showFields: false,
    })));
    setView('create');
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Delete this workflow template?')) return;
    try {
      await deleteWorkflowTemplate(templateId);
      loadTemplates();
    } catch {
      setError('Failed to delete template');
    }
  };

  const resetForm = () => {
    setCurrentTemplate(null);
    setName('');
    setDescription('');
    setStages([]);
    setError('');
  };

  const handleNewTemplate = () => {
    resetForm();
    setView('create');
  };

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="wb-container">
        <div className="wb-header">
          <button className="wb-back-btn" onClick={onBack}>
            {Icons.ArrowLeft} Back
          </button>
          <h2 className="wb-title">Workflow Templates</h2>
        </div>

        <button className="wb-new-btn" onClick={handleNewTemplate}>
          {Icons.Plus} New Template
        </button>

        {loading ? (
          <div className="wb-loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="wb-empty">
            <p>No workflow templates yet.</p>
            <p>Create one to define project stages and forms.</p>
          </div>
        ) : (
          <div className="wb-templates-list">
            {templates.map(t => (
              <div key={t.id} className="wb-template-card">
                <div className="wb-template-header">
                  <h3>{t.name}</h3>
                  <div className="wb-template-actions">
                    <button className="wb-icon-btn" onClick={() => handleEdit(t)} title="Edit">
                      {Icons.Edit}
                    </button>
                    <button className="wb-icon-btn wb-icon-btn-danger" onClick={() => handleDelete(t.id)} title="Delete">
                      {Icons.Trash}
                    </button>
                  </div>
                </div>
                {t.description && <p className="wb-template-desc">{t.description}</p>}
                <div className="wb-template-meta">
                  <span>{Icons.List} {t.stages?.length || 0} stages</span>
                  <span className={`wb-status-badge wb-status-${t.status}`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Create/Edit View ──
  return (
    <div className="wb-container">
      <div className="wb-header">
        <button className="wb-back-btn" onClick={() => { setView('list'); resetForm(); }}>
          {Icons.ArrowLeft} Back to List
        </button>
        <h2 className="wb-title">{currentTemplate ? 'Edit' : 'Create'} Workflow Template</h2>
      </div>

      <div className="wb-form">
        <div className="wb-form-group">
          <label className="wb-label">Template Name</label>
          <input
            className="wb-input"
            placeholder="e.g., Software Engineering Project Workflow"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="wb-form-group">
          <label className="wb-label">Description</label>
          <textarea
            className="wb-textarea"
            rows={3}
            placeholder="Describe this workflow template..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="wb-stages-header">
          <h3>Workflow Stages</h3>
          <button className="wb-add-stage-btn" onClick={addStage}>
            {Icons.Plus} Add Stage
          </button>
        </div>

        {stages.length === 0 ? (
          <div className="wb-empty-stages">
            <p>No stages yet. Add stages to define your workflow.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stages.map(s => s._id)} strategy={verticalListSortingStrategy}>
              <div className="wb-stages-list">
                {stages.map((stage, index) => (
                  <SortableStage
                    key={stage._id}
                    stage={stage}
                    index={index}
                    onChange={updateStage}
                    onRemove={removeStage}
                    onFieldChange={updateField}
                    onFieldRemove={removeField}
                    onFieldAdd={addField}
                    onToggleFields={toggleStageFields}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {error && <div className="wb-error">{error}</div>}

        <div className="wb-footer">
          <button className="wb-save-btn" onClick={handleSave} disabled={saving}>
            {Icons.Save} {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
