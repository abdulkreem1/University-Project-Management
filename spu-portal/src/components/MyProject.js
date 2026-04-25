import React, { useState, useEffect } from 'react';
import { fetchMyBoard } from '../api';
import KanbanBoard from './KanbanBoard';

export default function MyProject() {
  const [board, setBoard]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchMyBoard()
      .then((res) => { if (res.data.has_project) setBoard(res.data.board); })
      .catch(() => setError('Failed to load board.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading your project board…</div>;
  if (error)   return <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>{error}</div>;

  if (!board) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', color: '#64748b' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
      <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>No Active Project</h3>
      <p style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>
        Your project board will appear here once your project proposal is approved by the Head of Department.
      </p>
    </div>
  );

  return <KanbanBoard board={board} setBoard={setBoard} canEdit={true} />;
}
