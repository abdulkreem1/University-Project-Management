import React, { useState, useEffect, useRef } from 'react';
import { searchStudents } from '../api';
import './StudentSearch.css';

/**
 * Searchable student picker.
 * Props:
 *   value      – current university ID string
 *   onChange   – (username) => void
 *   placeholder
 *   id
 */
export default function StudentSearch({ value, onChange, placeholder = 'Search by name or ID…', id }) {
  const [query, setQuery]       = useState(value || '');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounce                = useRef(null);
  const wrapRef                 = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync display when value cleared externally
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(''); // clear selection while typing

    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchStudents(q);
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (student) => {
    setQuery(student.display);
    onChange(student.username);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="ss-wrap" ref={wrapRef}>
      <input
        id={id}
        type="text"
        className={`form-control ss-input ${value ? 'ss-input--selected' : ''}`}
        value={query}
        onChange={handleInput}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {loading && <span className="ss-spinner" aria-hidden="true">⏳</span>}
      {open && results.length > 0 && (
        <ul className="ss-dropdown" role="listbox">
          {results.map((s) => (
            <li
              key={s.username}
              className="ss-option"
              role="option"
              onMouseDown={() => handleSelect(s)}
            >
              <span className="ss-option-name">{s.name || s.username}</span>
              <span className="ss-option-id">{s.username}</span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && !loading && query.trim() && (
        <div className="ss-no-results">No students found</div>
      )}
    </div>
  );
}
