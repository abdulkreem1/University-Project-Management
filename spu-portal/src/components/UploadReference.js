import React, { useState, useRef } from 'react';
import { uploadReferenceDb } from '../api';
import './ImportUsers.css'; // reuse same styles

export default function UploadReference() {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setMessage({ type: 'error', text: 'Please select a file.' }); return; }
    setLoading(true);
    setMessage(null);
    try {
      const res = await uploadReferenceDb(file);
      setMessage({ type: 'success', text: res.data.message });
      setFile(null);
      fileRef.current.value = '';
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-page">
      <div className="import-info-card">
        <div className="import-info-icon" aria-hidden="true">🗄️</div>
        <div>
          <h2>Upload Reference Database</h2>
          <p>
            Upload the official university student records file. Students will use their
            University ID to self-register — the system will verify against this file.
            <br /><br />
            Required columns: <strong>university_id</strong> | <strong>full_name</strong> | <strong>department</strong> | <strong>year</strong> | <strong>email</strong> (optional)
          </p>
        </div>
      </div>

      <div className="import-card">
        <form onSubmit={handleSubmit}>
          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} role="alert">
              {message.text}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="ref-file">Reference File (.xlsx / .csv)</label>
            <div className="file-drop-zone" onClick={() => fileRef.current.click()}>
              <span className="file-drop-icon" aria-hidden="true">📂</span>
              <span>{file ? file.name : 'Click to browse or drop file here'}</span>
              <input
                id="ref-file"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0] || null)}
                aria-label="Upload reference database file"
              />
            </div>
          </div>
          <button className="btn btn-primary import-btn" type="submit" disabled={loading}>
            {loading ? 'Uploading…' : 'Upload Reference Database'}
          </button>
        </form>
      </div>
    </div>
  );
}
