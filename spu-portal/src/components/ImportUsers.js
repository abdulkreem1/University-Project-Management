import React, { useState, useRef } from 'react';
import { importUsers } from '../api';
import './ImportUsers.css';

export default function ImportUsers() {
  const [role, setRole] = useState('student');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

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
    <div className="import-page">
      {/* Info card */}
      <div className="import-info-card">
        <div className="import-info-icon" aria-hidden="true">📋</div>
        <div>
          <h2>Import Users via Excel</h2>
          <p>Upload an Excel file to bulk-create students or doctors. The file must contain three columns: <strong>full_name</strong>, <strong>identifier</strong>, and <strong>email</strong>. The initial password will be set to the identifier value.</p>
        </div>
      </div>

      {/* Form card */}
      <div className="import-card">
        <form onSubmit={handleSubmit}>
          {error  && <div className="alert alert-error"   role="alert">{error}</div>}
          {result && (
            <div className="alert alert-success" role="status">
              {result.message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="role-select">User Role</label>
            <select
              id="role-select"
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="file-input">Excel File (.xlsx)</label>
            <div className="file-drop-zone" onClick={() => fileRef.current.click()}>
              <span className="file-drop-icon" aria-hidden="true">📂</span>
              <span>{file ? file.name : 'Click to browse or drop file here'}</span>
              <input
                id="file-input"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0] || null)}
                aria-label="Upload Excel file"
              />
            </div>
          </div>

          <button className="btn btn-primary import-btn" type="submit" disabled={loading}>
            {loading ? 'Importing…' : 'Import Users'}
          </button>
        </form>
      </div>

      {/* Results table */}
      {result?.users?.length > 0 && (
        <div className="import-card">
          <h3 className="results-title">
            Created {role === 'student' ? 'Students' : 'Doctors'} ({result.users.length})
            <span className={`role-badge role-badge--${role}`}>
              {role === 'student' ? '🎓 Student' : '👨‍⚕️ Doctor'}
            </span>
          </h3>
          <div className="table-wrapper" role="region" aria-label="Imported users">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Initial Password</th>
                  <th>Role</th>
                  <th>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((u, i) => (
                  <tr key={u.username}>
                    <td>{i + 1}</td>
                    <td>{u.username}</td>
                    <td><code>{u.password}</code></td>
                    <td>
                      <span className={`role-badge role-badge--${role}`}>
                        {role === 'student' ? '🎓 Student' : '👨‍⚕️ Doctor'}
                      </span>
                    </td>
                    <td>
                      <span className="dashboard-hint">
                        {role === 'student' ? 'Courses · Grades · Schedule' : 'Courses · Grades · Schedule'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="import-note">
            ℹ️ Each user will be redirected to their <strong>{role}</strong> dashboard automatically upon login.
          </p>
        </div>
      )}
    </div>
  );
}
