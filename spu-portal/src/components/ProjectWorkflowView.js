import { useState, useEffect, useCallback } from 'react';
import { fetchProjectWorkflow, submitWorkflowStage, openWorkflowResponseFile } from '../api';
import './ProjectWorkflowView.css';

const Icons = {
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  AlertCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
};

const STATUS_META = {
  pending: { label: 'Pending', icon: <Icons.Clock />, cls: 'pwv-status-pending' },
  in_progress: { label: 'In Progress', icon: <Icons.Clock />, cls: 'pwv-status-progress' },
  submitted: { label: 'Submitted', icon: <Icons.CheckCircle />, cls: 'pwv-status-submitted' },
  approved: { label: 'Approved', icon: <Icons.CheckCircle />, cls: 'pwv-status-approved' },
  rejected: { label: 'Rejected', icon: <Icons.XCircle />, cls: 'pwv-status-rejected' },
  overdue: { label: 'Overdue', icon: <Icons.AlertCircle />, cls: 'pwv-status-overdue' },
};

function WorkflowStageForm({ stageInstance, onSubmit, onCancel, onOpenFile, submitting, error }) {
  const fields = stageInstance.stage_details.fields || [];
  const [formData, setFormData] = useState({});
  const existingResponses = stageInstance.field_responses || [];

  // Initialize form data with existing responses
  useEffect(() => {
    const initialData = {};
    stageInstance.field_responses?.forEach(response => {
      initialData[response.field] = response.value;
    });
    setFormData(initialData);
  }, [stageInstance]);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    const currentValue = formData[fieldId] || '';
    const currentOptions = currentValue ? currentValue.split(',') : [];
    
    let newOptions;
    if (checked) {
      newOptions = [...currentOptions, option];
    } else {
      newOptions = currentOptions.filter(o => o !== option);
    }
    
    setFormData(prev => ({ ...prev, [fieldId]: newOptions.join(',') }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.id]) {
        alert(`Please fill in the required field: ${field.label}`);
        return;
      }
    }
    
    onSubmit(formData, fields);
  };

  return (
    <form onSubmit={handleSubmit} className="pwv-form">
      {fields.map(field => {
        const value = formData[field.id] || '';
        const existingFile = existingResponses.find(
          response => response.field === field.id && response.has_file
        );
        
        return (
          <div key={field.id} className="pwv-form-field">
            <label className="pwv-form-label">
              {field.label}
              {field.required && <span className="pwv-required">*</span>}
            </label>
            
            {field.field_type === 'text' && (
              <input
                type="text"
                className="pwv-form-input"
                value={value}
                onChange={e => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            )}
            
            {field.field_type === 'textarea' && (
              <textarea
                className="pwv-form-textarea"
                rows={4}
                value={value}
                onChange={e => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            )}
            
            {field.field_type === 'number' && (
              <input
                type="number"
                className="pwv-form-input"
                value={value}
                onChange={e => handleFieldChange(field.id, e.target.value)}
                required={field.required}
                min="0"
                step="any"
              />
            )}
            
            {field.field_type === 'date' && (
              <input
                type="date"
                className="pwv-form-input"
                value={value}
                onChange={e => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            )}
            
            {field.field_type === 'select' && (
              <select
                className="pwv-form-select"
                value={value}
                onChange={e => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              >
                <option value="">Select an option...</option>
                {(field.options || []).map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            )}
            
            {field.field_type === 'radio' && (
              <div className="pwv-form-radio-group">
                {(field.options || []).map((option, idx) => (
                  <label key={idx} className="pwv-form-radio-label">
                    <input
                      type="radio"
                      name={`field-${field.id}`}
                      value={option}
                      checked={value === option}
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                      required={field.required}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {field.field_type === 'checkbox' && (
              <div className="pwv-form-checkbox-group">
                {(field.options || []).map((option, idx) => {
                  const selectedOptions = value ? value.split(',') : [];
                  return (
                    <label key={idx} className="pwv-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(option)}
                        onChange={e => handleCheckboxChange(field.id, option, e.target.checked)}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}
            
            {field.field_type === 'file' && (
              <>
                {existingFile && !(value instanceof File) && (
                  <button type="button" className="pwv-file-link" onClick={() => onOpenFile(stageInstance.id, existingFile)}>
                    Open current file: {existingFile.filename || existingFile.value}
                  </button>
                )}
                {value instanceof File && (
                  <div className="pwv-file-selected">Selected: {value.name}</div>
                )}
                <input
                  type="file"
                  className="pwv-form-file"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      handleFieldChange(field.id, file);
                    }
                  }}
                  required={field.required && !existingFile}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                />
              </>
            )}
          </div>
        );
      })}
      
      {error && <div className="pwv-form-error">{error}</div>}
      
      <div className="pwv-form-actions">
        <button type="button" className="pwv-btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="pwv-btn-submit" disabled={submitting}>
          <Icons.Send />
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

export default function ProjectWorkflowView({ projectBoardId }) {
  const [workflow, setWorkflow] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadWorkflow = useCallback(() => {
    setLoading(true);
    setError('');
    fetchProjectWorkflow(projectBoardId)
      .then(res => {
        setWorkflow(res.data);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('No workflow assigned to this project yet.');
        } else {
          setError('Failed to load workflow.');
        }
      })
      .finally(() => setLoading(false));
  }, [projectBoardId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const handleOpenWorkflowFile = async (stageInstanceId, response) => {
    const popup = window.open('', '_blank');
    try {
      const res = await openWorkflowResponseFile(stageInstanceId, response.id);
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      if (popup) {
        popup.location.href = blobUrl;
      } else {
        window.location.href = blobUrl;
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      if (popup) popup.close();
      alert('Could not open this workflow file. Please try again.');
    }
  };

  const handleSubmitStage = async (formData, fields) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      const responses = {};

      fields.forEach((field) => {
        const value = formData[field.id];
        if (field.field_type === 'file' && value instanceof File) {
          responses[field.id] = value.name;
          payload.append(`file_${field.id}`, value);
        } else {
          responses[field.id] = value || '';
        }
      });

      payload.append('field_responses', JSON.stringify(responses));
      await submitWorkflowStage(selectedStage.id, payload);
      loadWorkflow();
      setSelectedStage(null);
    } catch {
      setError('Failed to submit stage. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="pwv-loading">Loading workflow...</div>;
  }

  if (error && !workflow) {
    return (
      <div className="pwv-error-state">
        <Icons.AlertCircle />
        <p>{error}</p>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  // If a stage is selected for filling
  if (selectedStage) {
    return (
      <div className="pwv-container">
        <div className="pwv-header">
          <button className="pwv-back-btn" onClick={() => setSelectedStage(null)}>
            ← Back to Workflow
          </button>
          <h3>{selectedStage.stage_details.name}</h3>
        </div>
        
        {selectedStage.stage_details.description && (
          <p className="pwv-stage-desc">{selectedStage.stage_details.description}</p>
        )}

        <WorkflowStageForm
          stageInstance={selectedStage}
          onSubmit={handleSubmitStage}
          onOpenFile={handleOpenWorkflowFile}
          onCancel={() => setSelectedStage(null)}
          submitting={submitting}
          error={error}
        />
      </div>
    );
  }

  // Main workflow view
  const stages = workflow.stage_instances || [];
  const completedCount = stages.filter(s => ['submitted', 'approved'].includes(s.status)).length;
  const progress = stages.length > 0 ? (completedCount / stages.length) * 100 : 0;

  return (
    <div className="pwv-container">
      <div className="pwv-header">
        <h2>Project Workflow</h2>
        <p className="pwv-subtitle">{workflow.template_details?.name}</p>
      </div>

      {workflow.template_details?.description && (
        <div className="pwv-description">
          {workflow.template_details.description}
        </div>
      )}

      <div className="pwv-progress-section">
        <div className="pwv-progress-header">
          <span>Progress</span>
          <span>{completedCount} / {stages.length} completed</span>
        </div>
        <div className="pwv-progress-bar">
          <div className="pwv-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="pwv-stages-list">
        {stages.map((stageInstance, idx) => {
          const meta = STATUS_META[stageInstance.status] || STATUS_META.pending;
          const canSubmit = ['pending', 'in_progress', 'rejected'].includes(stageInstance.status);
          const hasFields = (stageInstance.stage_details.fields || []).length > 0;
          
          return (
            <div key={stageInstance.id} className="pwv-stage-card">
              <div className="pwv-stage-number">{idx + 1}</div>
              
              <div className="pwv-stage-content">
                <div className="pwv-stage-header">
                  <h4>{stageInstance.stage_details.name}</h4>
                  <span className={`pwv-status-badge ${meta.cls}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                </div>

                {stageInstance.stage_details.description && (
                  <p className="pwv-stage-text">{stageInstance.stage_details.description}</p>
                )}

                <div className="pwv-stage-meta">
                  {stageInstance.due_date && (
                    <span className="pwv-meta-item">
                      <Icons.Clock /> Due: {new Date(stageInstance.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {stageInstance.stage_details.is_required && (
                    <span className="pwv-meta-item pwv-required">Required</span>
                  )}
                </div>

                {stageInstance.submitted_at && (
                  <div className="pwv-submission-info">
                    <span>Submitted on {new Date(stageInstance.submitted_at).toLocaleDateString()}</span>
                  </div>
                )}

                {stageInstance.feedback && (
                  <div className="pwv-feedback">
                    <strong>Feedback:</strong> {stageInstance.feedback}
                  </div>
                )}

                {canSubmit && hasFields && (
                  <button
                    className="pwv-submit-btn"
                    onClick={() => setSelectedStage(stageInstance)}
                  >
                    <Icons.FileText />
                    {stageInstance.status === 'rejected' ? 'Resubmit' : 'Fill Form'}
                  </button>
                )}
                
                {!hasFields && canSubmit && (
                  <div className="pwv-no-fields">
                    <p>No form configured for this stage.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="pwv-error">{error}</div>}
    </div>
  );
}
