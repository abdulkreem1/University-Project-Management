import React, { useState, useRef } from 'react';
import { importUsers } from '../api';
import './ImportUsers.css';

/* Premium SVG Icons */
const Icons = {
  FileUp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>,
  UploadAction: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Student: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Doctor: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  ArrowLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
};

export default function ImportUsers({ onBack }) {
  const [role, setRole] = useState('student');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select an Excel file.'); return; }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await importUsers(file, role);
      setResult(res.data);
      setFile(null);
      fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-dashboard import-wrapper">
      {onBack && (
        <button className="btn-back" onClick={onBack} aria-label="Back to dashboard">
          {Icons.ArrowLeft} Back to Dashboard
        </button>
      )}
      <header className="pd-header">
        <div className="pd-greeting-area">
          <h1 className="pd-title">Import Users</h1>
          <p className="pd-subtitle">Bulk-create students or doctors using an Excel file.</p>
        </div>
      </header>

      {/* Modern Info Banner */}
      <div className="import-info-banner">
        <div className="import-info-icon">{Icons.Info}</div>
        <div className="import-info-text">
          <strong>Important Instructions:</strong> The Excel file must contain exactly three columns: <code>full_name</code>, <code>identifier</code>, and <code>email</code>. Imported users must change their temporary password after first login.
        </div>
      </div>

      {/* Form Card */}
      <div className="import-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert-strip alert-error-strip" role="alert">
              <span className="alert-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {result && (
            <div className="alert-strip alert-success-strip" role="status">
              <span className="alert-icon">✓</span>
              <span>{result.message}</span>
            </div>
          )}

          <div className="import-form-grid">
            <div className="form-group">
              <label htmlFor="role-select">Target Role</label>
              <select
                id="role-select"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">🎓 Student Batch</option>
                <option value="doctor">👨‍⚕️ Faculty / Doctor Batch</option>
              </select>
            </div>

            <div className="form-group">
              <label>Upload Spreadsheet (.xlsx, .xls)</label>
              <div 
                className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                onClick={() => fileRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="file-drop-icon">
                  {file ? Icons.FileUp : Icons.UploadAction}
                </div>
                <div className="file-drop-text">
                  <span className="drop-title">{file ? file.name : 'Click to upload or drag and drop'}</span>
                  <span className="drop-subtitle">Excel files only (Max 10MB)</span>
                </div>
                
                <input
                  id="file-input"
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Upload Excel file"
                />
              </div>
            </div>
          </div>

          <button className="btn btn-primary import-btn" type="submit" disabled={loading}>
            {loading ? 'Processing Import…' : 'Start Import Process'}
          </button>
        </form>
      </div>

      {/* Results table */}
      {result?.users?.length > 0 && (
        <div className="import-card">
          <div className="results-header-modern">
            <h3 className="results-title">
              Successfully Imported: {result.users.length} {role === 'student' ? 'Students' : 'Doctors'}
            </h3>
            <span className={`role-badge role-badge--${role}`}>
              {role === 'student' ? Icons.Student : Icons.Doctor}
              {role === 'student' ? ' Student' : ' Faculty'}
            </span>
          </div>

          <div className="table-wrapper" role="region" aria-label="Imported users">
            <table className="users-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>System Username</th>
                  <th>Account Type</th>
                  <th>Access Scope</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((u, i) => (
                  <tr key={u.username}>
                    <td>{i + 1}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`role-badge role-badge--${role}`}>
                        {role === 'student' ? Icons.Student : Icons.Doctor}
                        {role === 'student' ? ' Student' : ' Faculty'}
                      </span>
                    </td>
                    <td>
                      <span className="dashboard-hint">
                        {role === 'student' ? 'Standard Access' : 'Faculty Access'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-note-modern">
            <div className="import-note-icon">{Icons.Info}</div>
            <p>Users have been added to the system database. Share credentials through a secure channel and force a password change on first login.</p>
          </div>
        </div>
      )}
    </div>
  );
}
