import { useState, useEffect } from 'react';
import {
  fetchReviewableProjects, fetchProjectWorkflow, reviewWorkflowStage
} from '../api';
import './WorkflowReview.css';

const Icons = {
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  AlertCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  ThumbsUp: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>,
  ThumbsDown: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>,
};

const STATUS_META = {
  pending: { label: 'Pending', icon: <Icons.Clock />, cls: 'wr-status-pending' },
  submitted: { label: 'Submitted', icon: <Icons.CheckCircle />, cls: 'wr-status-submitted' },
  approved: { label: 'Approved', icon: <Icons.CheckCircle />, cls: 'wr-status-approved' },
  rejected: { label: 'Rejected', icon: <Icons.XCircle />, cls: 'wr-status-rejected' },
  overdue: { label: 'Overdue', icon: <Icons.AlertCircle />, cls: 'wr-status-overdue' },
};

export default function WorkflowReview({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetchReviewableProjects();
      setProjects(res.data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectWorkflow = async (projectId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProjectWorkflow(projectId);
      setWorkflow(res.data);
      setSelectedProject(projects.find(p => p.id === projectId));
    } catch {
      setError('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (stageInstanceId, action) => {
    if (action === 'reject' && !feedback.trim()) {
      setError('Please provide feedback for rejection');
      return;
    }

    setReviewing(true);
    setError('');
    try {
      await reviewWorkflowStage(stageInstanceId, {
        action,
        feedback: feedback.trim()
      });
      // Reload workflow
      await loadProjectWorkflow(selectedProject.id);
      setSelectedStage(null);
      setFeedback('');
    } catch {
      setError('Failed to review stage');
    } finally {
      setReviewing(false);
    }
  };

  if (loading && !workflow) {
    return <div className="wr-loading">Loading...</div>;
  }

  // Review modal
  if (selectedStage) {
    const meta = STATUS_META[selectedStage.status] || STATUS_META.pending;
    
    return (
      <div className="wr-container">
        <div className="wr-header">
          <button className="wr-back-btn" onClick={() => { setSelectedStage(null); setFeedback(''); setError(''); }}>
            <Icons.ArrowLeft /> Back
          </button>
          <h2>Review Stage Submission</h2>
        </div>

        <div className="wr-review-card">
          <div className="wr-stage-info">
            <h3>{selectedStage.stage_details.name}</h3>
            <span className={`wr-status-badge ${meta.cls}`}>
              {meta.icon}
              <span>{meta.label}</span>
            </span>
          </div>

          {selectedStage.stage_details.description && (
            <p className="wr-stage-desc">{selectedStage.stage_details.description}</p>
          )}

          <div className="wr-submission-info">
            <div className="wr-info-row">
              <span className="wr-info-label">Submitted:</span>
              <span>{new Date(selectedStage.submitted_at).toLocaleString()}</span>
            </div>
            {selectedStage.due_date && (
              <div className="wr-info-row">
                <span className="wr-info-label">Due Date:</span>
                <span>{new Date(selectedStage.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Display field responses */}
          {selectedStage.field_responses && selectedStage.field_responses.length > 0 && (
            <div className="wr-responses">
              <h4>Student Responses:</h4>
              {selectedStage.field_responses.map((response, idx) => (
                <div key={idx} className="wr-response-item">
                  <span className="wr-response-label">{response.field_label}:</span>
                  <span className="wr-response-value">{response.value || '—'}</span>
                </div>
              ))}
            </div>
          )}
          
          {(!selectedStage.field_responses || selectedStage.field_responses.length === 0) && (
            <div className="wr-no-responses">
              <p>No responses submitted yet.</p>
            </div>
          )}

          <div className="wr-feedback-section">
            <label className="wr-label">Feedback {selectedStage.status === 'submitted' && '(Required for rejection)'}:</label>
            <textarea
              className="wr-textarea"
              rows={4}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Provide feedback to the student..."
            />
          </div>

          {error && <div className="wr-error">{error}</div>}

          {selectedStage.status === 'submitted' && (
            <div className="wr-actions">
              <button
                className="wr-btn wr-btn-reject"
                onClick={() => handleReview(selectedStage.id, 'reject')}
                disabled={reviewing}
              >
                <Icons.ThumbsDown />
                {reviewing ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                className="wr-btn wr-btn-approve"
                onClick={() => handleReview(selectedStage.id, 'approve')}
                disabled={reviewing}
              >
                <Icons.ThumbsUp />
                {reviewing ? 'Approving...' : 'Approve'}
              </button>
            </div>
          )}

          {selectedStage.feedback && (
            <div className="wr-previous-feedback">
              <strong>Previous Feedback:</strong>
              <p>{selectedStage.feedback}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Project workflow view
  if (workflow) {
    const stages = workflow.stage_instances || [];
    const submittedStages = stages.filter(s => s.status === 'submitted');
    
    return (
      <div className="wr-container">
        <div className="wr-header">
          <button className="wr-back-btn" onClick={() => { setWorkflow(null); setSelectedProject(null); }}>
            <Icons.ArrowLeft /> Back to Projects
          </button>
          <div>
            <h2>{selectedProject?.title}</h2>
            <p className="wr-subtitle">{workflow.template_details?.name}</p>
          </div>
        </div>

        {submittedStages.length > 0 && (
          <div className="wr-alert wr-alert-info">
            <Icons.AlertCircle />
            <span>{submittedStages.length} stage(s) awaiting your review</span>
          </div>
        )}

        <div className="wr-stages-list">
          {stages.map((stage, idx) => {
            const meta = STATUS_META[stage.status] || STATUS_META.pending;
            
            return (
              <div key={stage.id} className="wr-stage-card">
                <div className="wr-stage-number">{idx + 1}</div>
                
                <div className="wr-stage-content">
                  <div className="wr-stage-header">
                    <h4>{stage.stage_details.name}</h4>
                    <span className={`wr-status-badge ${meta.cls}`}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </span>
                  </div>

                  {stage.submitted_at && (
                    <div className="wr-stage-meta">
                      <span>Submitted: {new Date(stage.submitted_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {stage.status === 'submitted' && (
                    <button
                      className="wr-review-btn"
                      onClick={() => setSelectedStage(stage)}
                    >
                      Review Submission
                    </button>
                  )}

                  {stage.feedback && stage.status !== 'submitted' && (
                    <div className="wr-feedback-display">
                      <strong>Your Feedback:</strong> {stage.feedback}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Projects list
  return (
    <div className="wr-container">
      <div className="wr-header">
        <button className="wr-back-btn" onClick={onBack}>
          <Icons.ArrowLeft /> Back
        </button>
        <h2>Review Workflow Submissions</h2>
      </div>

      {projects.length === 0 ? (
        <div className="wr-empty">
          <Icons.AlertCircle />
          <p>No projects with workflows found.</p>
          <p>Apply workflows to projects first.</p>
        </div>
      ) : (
        <div className="wr-projects-list">
          {projects.map(project => (
            <div
              key={project.id}
              className="wr-project-card"
              onClick={() => loadProjectWorkflow(project.id)}
            >
              <h3>{project.title}</h3>
              <div className="wr-project-meta">
                <span>Team: {project.team_members?.map(m => m.name).join(', ')}</span>
                <span>Supervisor: {project.supervisor_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
