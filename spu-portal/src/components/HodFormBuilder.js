import { useState, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchHodForm, saveHodForm } from '../api';
import './HodFormBuilder.css';

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

const CONTEXT_LABELS = {
  propose: 'Propose Own Idea',
  browse:  'Apply on Doctor Idea',
};

const DEFAULT_FIELDS = {
  propose: [
    { label: 'Project Title',       field_type: 'text',     required: true,  options: [], _default: true },
    { label: 'Project Description', field_type: 'textarea', required: true,  options: [], _default: true },
    { label: 'Department',          field_type: 'select',   required: true,  options: [], _default: true },
    { label: 'Team Size',           field_type: 'number',   required: true,  options: [], _default: true },
  ],
  browse: [
    { label: 'Department',          field_type: 'select',   required: true,  options: [], _default: true },
    { label: 'Team Size',           field_type: 'number',   required: true,  options: [], _default: true },
  ],
};

const Icons = {
  Grip:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
  Trash:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Plus:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Save:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Lock:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
};

function SortableField({ field, index, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const needsOptions = ['select', 'radio', 'checkbox'].includes(field.field_type);

  return (
    <div ref={setNodeRef} style={style} className={`fb-field-card ${field._default ? 'fb-field-card--default' : ''}`}>
      <div className="fb-field-drag" {...attributes} {...listeners}>
        {field._default ? Icons.Lock : Icons.Grip}
      </div>

      <div className="fb-field-body">
        <div className="fb-field-row">
          <input
            className="fb-input"
            placeholder="Field label"
            value={field.label}
            disabled={field._default}
            onChange={e => onChange(index, 'label', e.target.value)}
          />
          <select
            className="fb-select"
            value={field.field_type}
            disabled={field._default}
            onChange={e => onChange(index, 'field_type', e.target.value)}
          >
            {FIELD_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="fb-required-toggle">
            <input
              type="checkbox"
              checked={field.required}
              disabled={field._default}
              onChange={e => onChange(index, 'required', e.target.checked)}
            />
            Required
          </label>
        </div>

        {needsOptions && !field._default && (
          <div className="fb-options-area">
            <span className="fb-options-label">Options (one per line):</span>
            <textarea
              className="fb-textarea-small"
              rows={3}
              value={(field.options || []).join('\n')}
              onChange={e => onChange(index, 'options', e.target.value.split('\n').filter(Boolean))}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}
      </div>

      {!field._default && (
        <button className="fb-remove-btn" onClick={() => onRemove(index)} title="Remove field">
          {Icons.Trash}
        </button>
      )}
    </div>
  );
}

export default function HodFormBuilder({ onBack }) {
  const [context, setContext]   = useState('propose');
  const [fields, setFields]     = useState([]);
  const [title, setTitle]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const loadForm = (ctx) => {
    setLoading(true);
    setError('');
    fetchHodForm(ctx)
      .then(res => {
        const defaults = DEFAULT_FIELDS[ctx].map((f, i) => ({ ...f, _id: `default-${i}` }));
        const saved = (res.data.fields || []).map((f, i) => ({ ...f, _id: `saved-${i}-${f.id}` }));
        setTitle(res.data.title || '');
        setFields([...defaults, ...saved]);
      })
      .catch(() => {
        const defaults = DEFAULT_FIELDS[ctx].map((f, i) => ({ ...f, _id: `default-${i}` }));
        setFields(defaults);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadForm(context); }, [context]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex(f => f._id === active.id);
    const newIdx = fields.findIndex(f => f._id === over.id);
    // Don't allow dragging default fields or dragging custom fields before defaults
    const defaultCount = DEFAULT_FIELDS[context].length;
    if (oldIdx < defaultCount || newIdx < defaultCount) return;
    setFields(arrayMove(fields, oldIdx, newIdx));
  };

  const addField = () => {
    setFields(prev => [...prev, {
      _id: `new-${Date.now()}`,
      label: '', field_type: 'text', required: false, options: [],
    }]);
  };

  const updateField = (index, key, value) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const removeField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const customFields = fields
        .filter(f => !f._default)
        .map(({ label, field_type, required, options }) => ({ label, field_type, required, options }));
      await saveHodForm(context, { title, fields: customFields });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fb-container">
      <div className="fb-header">
        <button className="fb-back-btn" onClick={onBack}>← Back</button>
        <h2 className="fb-title">Form Builder</h2>
      </div>

      <div className="fb-context-tabs">
        {Object.entries(CONTEXT_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`fb-tab ${context === key ? 'fb-tab--active' : ''}`}
            onClick={() => setContext(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="fb-form-title-row">
        <input
          className="fb-input fb-input--title"
          placeholder="Form title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="fb-loading">Loading form...</div>
      ) : (
        <>
          <div className="fb-defaults-note">
            <span>{Icons.Lock}</span> Locked fields are default and cannot be removed or reordered.
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f._id)} strategy={verticalListSortingStrategy}>
              <div className="fb-fields-list">
                {fields.map((field, index) => (
                  <SortableField
                    key={field._id}
                    field={field}
                    index={index}
                    onChange={updateField}
                    onRemove={removeField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button className="fb-add-btn" onClick={addField}>
            {Icons.Plus} Add Field
          </button>

          {error && <div className="fb-error">{error}</div>}

          <div className="fb-footer">
            <button className="fb-save-btn" onClick={handleSave} disabled={saving}>
              {Icons.Save} {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Form'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
