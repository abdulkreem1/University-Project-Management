import React, { useState } from 'react';
import { submitProjectIdea } from '../api';
import './SubmitIdea.css';

const DEPARTMENTS = [
  { value: 'software_engineering',    label: 'Software Engineering' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'information_security',    label: 'Information Security' },
  { value: 'communications',          label: 'Communications' },
  { value: 'control_robotics',        label: 'Control & Robotics' },
];

const EMPTY = { title: '', description: '', department: '', required_skills: '', max_team_size: 2 };

export default function SubmitIdea({ onBack }) {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await submitProjectIdea({ ...form, max_team_size: Number(form.max_team_size) });
      setSuccess(true);
      setForm(EMPTY);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setError(Object.values(data).flat().join(' '));
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="submit-idea-wrap">
        <div className="submit-idea-success" role="alert">
          <span className="submit-idea-success-icon" aria-hidden="true">✅</span>
          <h2>Idea Submitted Successfully</h2>
          <span className="submit-idea-success-badge">⏳ Pending Review</span>
          <p>Your project idea has been received and is awaiting review.</p>
          <div className="submit-idea-actions">
            <button className="btn btn-primary" onClick={() => setSuccess(false)}>Submit Another</button>
            <button className="btn btn-outline" onClick={onBack}>View My Ideas</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-idea-wrap">
      <div className="submit-idea-page-header">
        <button className="btn-back" onClick={onBack} aria-label="Back to dashboard">
          ← Back
        </button>
        <h2>Submit New Project Idea</h2>
      </div>

      <div className="submit-idea-info" role="note">
        <span aria-hidden="true">💡</span>
        <span>Fill in the details below. Your idea will be saved with status <strong>Pending Review</strong> and forwarded to the department.</span>
      </div>

      <div className="submit-idea-card">
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title">Title <span aria-hidden="true">*</span></label>
            <input
              id="title" name="title" type="text"
              className="form-control"
              value={form.title} onChange={handleChange}
              placeholder="e.g. AI-based Attendance System"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description <span aria-hidden="true">*</span></label>
            <textarea
              id="description" name="description" rows={4}
              className="form-control"
              value={form.description} onChange={handleChange}
              placeholder="Describe the project goals and scope..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department <span aria-hidden="true">*</span></label>
              <select
                id="department" name="department"
                className="form-control"
                value={form.department} onChange={handleChange}
                required
              >
                <option value="">— Select —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="max_team_size">Max Team Size <span aria-hidden="true">*</span></label>
              <select
                id="max_team_size" name="max_team_size"
                className="form-control"
                value={form.max_team_size} onChange={handleChange}
              >
                <option value={2}>2 Students</option>
                <option value={3}>3 Students</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="required_skills">Required Skills</label>
            <input
              id="required_skills" name="required_skills" type="text"
              className="form-control"
              value={form.required_skills} onChange={handleChange}
              placeholder="e.g. Python, Machine Learning, React"
            />
            <span className="form-hint">Comma-separated tags</span>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Submitting…' : '📤 Submit Idea'}
          </button>
        </form>
      </div>
    </div>
  );
}
