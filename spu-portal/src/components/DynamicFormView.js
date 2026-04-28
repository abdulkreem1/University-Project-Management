import { useState, useEffect } from 'react';
import { fetchStudentForm, submitFormResponse } from '../api';
import DynamicCheckboxGroup from './DynamicCheckboxGroup';
import './DynamicFormView.css';

const DEPARTMENTS = [
  { value: 'software_engineering',    label: 'Software Engineering' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'information_security',    label: 'Information Security' },
  { value: 'communications',          label: 'Communications' },
  { value: 'control_robotics',        label: 'Control & Robotics' },
];

const emptyValueForField = (field) => field.field_type === 'checkbox' ? [] : '';
const isEmptyFieldValue = (value) => Array.isArray(value) ? value.length === 0 : !value;

/**
 * Renders the full form for a student:
 * - Default fields (title, description, department, team_size) based on context
 * - Dynamic fields added by the HoD
 *
 * Props:
 *   context       - 'propose' | 'browse'
 *   department    - pre-selected department (string) or null to let student pick
 *   onSubmit      - callback(defaultValues, dynamicValues, formId) called on submit
 *   submitting    - bool, disables submit button
 *   externalError - error string from parent
 */
export default function DynamicFormView({
  context,
  department: initialDept,
  onSubmit,
  submitting,
  externalError,
}) {
  const [department, setDepartment] = useState(initialDept || '');
  const [dynForm, setDynForm]       = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);

  // Default field values
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize]     = useState(2);

  // Dynamic field values: { fieldId: value }
  const [dynValues, setDynValues]   = useState({});
  const [error, setError]           = useState('');

  // Load dynamic form when department changes
  useEffect(() => {
    if (!department) { setDynForm(null); return; }
    setLoadingForm(true);
    fetchStudentForm(department, context)
      .then(res => {
        setDynForm(res.data);
        // Init dynamic values
        const init = {};
        (res.data.fields || []).forEach(f => { init[f.id] = emptyValueForField(f); });
        setDynValues(init);
      })
      .catch(() => setDynForm(null))
      .finally(() => setLoadingForm(false));
  }, [department, context]);

  const handleDynChange = (fieldId, value) => {
    setDynValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate required dynamic fields
    if (dynForm) {
      for (const f of dynForm.fields || []) {
        if (f.required && isEmptyFieldValue(dynValues[f.id])) {
          setError(`"${f.label}" is required.`);
          return;
        }
      }
    }

    const defaultValues = { title, description, department, team_size: teamSize };
    const dynamicValues = dynForm
      ? (dynForm.fields || []).map(f => ({ field: f.id, value: dynValues[f.id] ?? emptyValueForField(f) }))
      : [];

    onSubmit(defaultValues, dynamicValues, dynForm?.id || null);
  };

  return (
    <form className="dfv-form" onSubmit={handleSubmit}>
      {dynForm?.title && <h3 className="dfv-form-title">{dynForm.title}</h3>}

      {/* ── Default Fields ── */}
      <div className="dfv-section-label">Basic Information</div>

      {/* Department selector (always shown if not pre-set) */}
      <div className="dfv-field">
        <label className="dfv-label">Department <span className="dfv-required">*</span></label>
        <select
          className="dfv-select"
          value={department}
          onChange={e => setDepartment(e.target.value)}
          required
          disabled={!!initialDept}
        >
          <option value="">Select department...</option>
          {DEPARTMENTS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {context === 'propose' && (
        <>
          <div className="dfv-field">
            <label className="dfv-label">Project Title <span className="dfv-required">*</span></label>
            <input
              className="dfv-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Enter your project title"
            />
          </div>
          <div className="dfv-field">
            <label className="dfv-label">Project Description <span className="dfv-required">*</span></label>
            <textarea
              className="dfv-textarea"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder="Describe your project idea..."
            />
          </div>
        </>
      )}

      <div className="dfv-field">
        <label className="dfv-label">Team Size <span className="dfv-required">*</span></label>
        <input
          className="dfv-input dfv-input--sm"
          type="number"
          min={1}
          max={5}
          value={teamSize}
          onChange={e => setTeamSize(Number(e.target.value))}
          required
        />
      </div>

      {/* ── Dynamic Fields ── */}
      {loadingForm && <div className="dfv-loading">Loading department form...</div>}

      {!loadingForm && dynForm && (dynForm.fields || []).length > 0 && (
        <>
          <div className="dfv-divider" />
          <div className="dfv-section-label">
            {dynForm.title || 'Additional Information'}
          </div>
          {dynForm.fields.map(field => (
            <DynField
              key={field.id}
              field={field}
              value={dynValues[field.id] ?? emptyValueForField(field)}
              onChange={val => handleDynChange(field.id, val)}
            />
          ))}
        </>
      )}

      {(error || externalError) && (
        <div className="dfv-error">{error || externalError}</div>
      )}

      <button className="dfv-submit-btn" type="submit" disabled={submitting || !department}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

function DynField({ field, value, onChange }) {
  const { label, field_type, required, options } = field;

  const labelEl = (
    <label className="dfv-label">
      {label} {required && <span className="dfv-required">*</span>}
    </label>
  );

  if (field_type === 'text') return (
    <div className="dfv-field">
      {labelEl}
      <input className="dfv-input" type="text" value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </div>
  );

  if (field_type === 'textarea') return (
    <div className="dfv-field">
      {labelEl}
      <textarea className="dfv-textarea" rows={3} value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </div>
  );

  if (field_type === 'number') return (
    <div className="dfv-field">
      {labelEl}
      <input 
        className="dfv-input dfv-input--sm" 
        type="number" 
        value={value} 
        required={required}
        min="0"
        step="any"
        onChange={e => onChange(e.target.value)} 
      />
    </div>
  );

  if (field_type === 'date') return (
    <div className="dfv-field">
      {labelEl}
      <input className="dfv-input" type="date" value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </div>
  );

  if (field_type === 'select') return (
    <div className="dfv-field">
      {labelEl}
      <select className="dfv-select" value={value} required={required}
        onChange={e => onChange(e.target.value)}>
        <option value="">Select...</option>
        {(options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  if (field_type === 'radio') return (
    <div className="dfv-field">
      {labelEl}
      <div className="dfv-radio-group">
        {(options || []).map(opt => (
          <label key={opt} className="dfv-radio-label">
            <input type="radio" name={`field-${field.id}`} value={opt}
              checked={value === opt} onChange={() => onChange(opt)} required={required} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  if (field_type === 'checkbox') return (
    <div className="dfv-field">
      {labelEl}
      <DynamicCheckboxGroup field={field} value={value} onChange={onChange} />
    </div>
  );

  if (field_type === 'file') return (
    <div className="dfv-field">
      {labelEl}
      <input 
        className="dfv-input" 
        type="file" 
        required={required}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            onChange(file.name);
          }
        }} 
      />
      <small className="dfv-hint">Upload a file (PDF, DOC, or image)</small>
    </div>
  );

  return null;
}
