import React, { useEffect, useState } from 'react';
import { fetchDoctors, fetchDepartments, assignHod } from '../api';
import './AssignHod.css';

const DEPT_LABELS = {
  software_engineering:   'Software Engineering',
  artificial_intelligence:'Artificial Intelligence',
  information_security:   'Information Security',
  communications:         'Communications',
  control_robotics:       'Control & Robotics',
};

export default function AssignHod() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors]         = useState([]);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState({ dept: null, doctorId: null });
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState(null); // {type, text}

  useEffect(() => {
    fetchDepartments().then(r => setDepartments(r.data));
    fetchDoctors().then(r => setDoctors(r.data));
  }, []);

  const filtered = doctors.filter(d => {
    const name = `${d.first_name} ${d.last_name} ${d.username}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleAssign = async () => {
    if (!selected.dept || !selected.doctorId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await assignHod(selected.doctorId, selected.dept);
      setMessage({ type: 'success', text: res.data.message });
      // Refresh departments
      const updated = await fetchDepartments();
      setDepartments(updated.data);
      // Refresh doctors (role may have changed)
      const updatedDocs = await fetchDoctors();
      setDoctors(updatedDocs.data);
      setSelected({ dept: null, doctorId: null });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Assignment failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ahod-page">

      {/* Department cards */}
      <div className="ahod-section-title">Departments</div>
      <div className="ahod-dept-grid" role="list">
        {departments.map(dept => (
          <div
            key={dept.key}
            className={`ahod-dept-card ${selected.dept === dept.key ? 'ahod-dept-card--active' : ''}`}
            role="listitem"
            onClick={() => setSelected(s => ({ ...s, dept: dept.key }))}
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setSelected(s => ({ ...s, dept: dept.key }))}
            aria-pressed={selected.dept === dept.key}
          >
            <span className="ahod-dept-icon" aria-hidden="true">🏛️</span>
            <span className="ahod-dept-label">{dept.label}</span>
            {dept.hod ? (
              <span className="ahod-dept-hod">
                <span className="ahod-hod-badge">HoD</span>
                {dept.hod.full_name}
              </span>
            ) : (
              <span className="ahod-dept-empty">No HoD assigned</span>
            )}
          </div>
        ))}
      </div>

      {/* Doctor picker */}
      <div className="ahod-section-title">
        Select a Doctor to Assign
        {selected.dept && (
          <span className="ahod-selected-dept"> → {DEPT_LABELS[selected.dept]}</span>
        )}
      </div>

      <div className="ahod-card">
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} role="alert">
            {message.text}
          </div>
        )}

        <input
          className="form-control ahod-search"
          type="search"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search doctors"
        />

        <div className="ahod-doctor-list" role="listbox" aria-label="Doctors">
          {filtered.length === 0 && (
            <p className="ahod-empty">No doctors found. Import doctors first.</p>
          )}
          {filtered.map(doc => {
            const fullName = `${doc.first_name} ${doc.last_name}`.trim() || doc.username;
            const isHod = doc.role === 'hod';
            return (
              <div
                key={doc.id}
                className={`ahod-doctor-row ${selected.doctorId === doc.id ? 'ahod-doctor-row--active' : ''}`}
                role="option"
                aria-selected={selected.doctorId === doc.id}
                onClick={() => setSelected(s => ({ ...s, doctorId: doc.id }))}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(s => ({ ...s, doctorId: doc.id }))}
              >
                <div className="ahod-doctor-avatar" aria-hidden="true">
                  {isHod ? '👨‍💼' : '👨‍🏫'}
                </div>
                <div className="ahod-doctor-info">
                  <span className="ahod-doctor-name">{fullName}</span>
                  <span className="ahod-doctor-id">ID: {doc.username}</span>
                </div>
                {isHod && (
                  <span className="ahod-hod-badge ahod-hod-badge--sm">
                    HoD · {DEPT_LABELS[doc.department] || doc.department}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-primary ahod-btn"
          onClick={handleAssign}
          disabled={!selected.dept || !selected.doctorId || loading}
        >
          {loading ? 'Assigning…' : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  );
}
