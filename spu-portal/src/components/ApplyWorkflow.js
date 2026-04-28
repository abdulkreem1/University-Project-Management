import { useState, useEffect } from 'react';
import { fetchWorkflowTemplates, applyWorkflowToProject, fetchAvailableProjects } from '../api';
import './ApplyWorkflow.css';

const Icons = {
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  AlertCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  List: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
};

export default function ApplyWorkflow({ onBack }) {
  const [templates, setTemplates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, projectsRes] = await Promise.all([
        fetchWorkflowTemplates(),
        fetchAvailableProjects()
      ]);
      setTemplates(templatesRes.data.filter(t => t.status === 'active'));
      setProjects(projectsRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplate || !selectedProject) {
      setError('Please select both template and project');
      return;
    }

    setApplying(true);
    setError('');
    setSuccess(false);

    try {
      await applyWorkflowToProject({
        template_id: Number(selectedTemplate),
        project_board_id: Number(selectedProject)
      });
      setSuccess(true);
      setSelectedTemplate('');
      setSelectedProject('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to apply workflow';
      setError(msg);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="aw-loading">Loading...</div>;
  }

  const selectedTemplateData = templates.find(t => t.id === Number(selectedTemplate));

  return (
    <div className="aw-container">
      <div className="aw-header">
        <button className="aw-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Apply Workflow to Project</h2>
      </div>

      <div className="aw-form">
        <div className="aw-form-group">
          <label className="aw-label">Select Workflow Template</label>
          <select
            className="aw-select"
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
          >
            <option value="">Choose a template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.stages?.length || 0} stages)
              </option>
            ))}
          </select>
        </div>

        {selectedTemplateData && (
          <div className="aw-template-preview">
            <h4>{selectedTemplateData.name}</h4>
            {selectedTemplateData.description && (
              <p className="aw-template-desc">{selectedTemplateData.description}</p>
            )}
            <div className="aw-stages-preview">
              <span className="aw-stages-label"><Icons.List /> Stages:</span>
              <ul>
                {selectedTemplateData.stages?.map((stage, idx) => (
                  <li key={stage.id}>
                    {idx + 1}. {stage.name} ({stage.trigger_type})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="aw-form-group">
          <label className="aw-label">Select Project</label>
          <select
            className="aw-select"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">Choose a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} disabled={p.has_workflow}>
                {p.title} - {p.team_members?.map(m => m.name).join(', ')}
                {p.has_workflow ? ' (Already has workflow)' : ''}
              </option>
            ))}
          </select>
          {projects.length === 0 && !loading && (
            <small style={{fontSize: 12, color: '#64748b', marginTop: 4, display: 'block'}}>
              No projects available. {projects.length === 0 ? 'Projects must be assigned first.' : ''}
            </small>
          )}
        </div>

        {error && (
          <div className="aw-alert aw-alert-error">
            <Icons.AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="aw-alert aw-alert-success">
            <Icons.CheckCircle />
            <span>Workflow applied successfully!</span>
          </div>
        )}

        <button
          className="aw-apply-btn"
          onClick={handleApply}
          disabled={applying || !selectedTemplate || !selectedProject}
        >
          {applying ? 'Applying...' : 'Apply Workflow'}
        </button>
      </div>
    </div>
  );
}
