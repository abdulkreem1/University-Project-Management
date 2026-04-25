import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createTask, updateTask, deleteTask,
         fetchComments, postComment, deleteComment,
         uploadAttachment, deleteAttachment,
         fetchBoardActivity } from '../api';
import './KanbanBoard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
export const COLUMNS = [
  { key: 'todo',        label: 'To Do',       color: '#64748b' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'in_review',   label: 'In Review',   color: '#6366f1' },
  { key: 'done',        label: 'Done',        color: '#22c55e' },
];

const PRIORITY_META = {
  low:    { color: '#22c55e', bg: '#f0fdf4', label: 'Low' },
  medium: { color: '#f59e0b', bg: '#fffbeb', label: 'Medium' },
  high:   { color: '#ef4444', bg: '#fef2f2', label: 'High' },
};

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📊', pptx: '📊', zip: '🗜️', rar: '🗜️',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
  mp4: '🎬', mp3: '🎵', txt: '📃', py: '🐍', js: '📜',
};
const fileIcon = (ext) => FILE_ICONS[ext] || '📎';
const fmtSize  = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const fmtDate  = (iso) => new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Plus:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Close:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Cal:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Flag:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Sup:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Attach:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  Comment: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Activity:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Send:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Download:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, canEdit, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const commentCount = task.comments?.length || 0;
  const attachCount  = task.attachments?.length || 0;

  return (
    <div
      className={`kb-task ${isDragging ? 'kb-task--dragging' : ''} ${!canEdit ? 'kb-task--readonly' : ''}`}
      draggable={canEdit}
      onDragStart={canEdit ? onDragStart : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
      onClick={() => onEdit(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(task)}
      aria-label={`Task: ${task.title}`}
    >
      <div className="kb-task-stripe" style={{ background: pm.color }} />
      <div className="kb-task-body">
        <div className="kb-task-header">
          <span className="kb-task-title">{task.title}</span>
          {canEdit && (
            <div className="kb-task-btns" onClick={(e) => e.stopPropagation()}>
              <button className="kb-icon-btn" onClick={() => onEdit(task)} title="Edit">{Icon.Edit}</button>
              <button className="kb-icon-btn kb-icon-btn--danger" onClick={() => onDelete(task.id)} title="Delete">{Icon.Trash}</button>
            </div>
          )}
        </div>
        {task.description && <p className="kb-task-desc">{task.description}</p>}
        <div className="kb-task-footer">
          <span className="kb-chip" style={{ color: pm.color, background: pm.bg }}>
            {Icon.Flag} {pm.label}
          </span>
          {task.assignee_name && (
            <span className="kb-chip kb-chip--neutral">{Icon.User} {task.assignee_name}</span>
          )}
          {task.due_date && (
            <span className={`kb-chip ${isOverdue ? 'kb-chip--overdue' : 'kb-chip--neutral'}`}>
              {Icon.Cal} {task.due_date}
            </span>
          )}
          {task.created_by_role === 'doctor' && (
            <span className="kb-chip kb-chip--supervisor" title="Assigned by supervisor">
              {Icon.Sup} Supervisor
            </span>
          )}
          {commentCount > 0 && (
            <span className="kb-chip kb-chip--neutral">{Icon.Comment} {commentCount}</span>
          )}
          {attachCount > 0 && (
            <span className="kb-chip kb-chip--neutral">{Icon.Attach} {attachCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Drawer ──────────────────────────────────────────────────────────────
function TaskDrawer({ task, board, onClose, onSave, onDelete, isSaving }) {
  const isNew = !task.id;
  const [tab, setTab] = useState('details');
  const [form, setForm] = useState({
    title:       task.title       || '',
    description: task.description || '',
    priority:    task.priority    || 'medium',
    status:      task.status      || 'todo',
    assignee:    task.assignee    || '',
    due_date:    task.due_date    || '',
  });

  // Comments
  const [comments, setComments]       = useState(task.comments || []);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef(null);

  // Activity
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim().length > 0;

  // Load activity when tab opens
  useEffect(() => {
    if (tab === 'activity' && !isNew && activities.length === 0) {
      setLoadingActivity(true);
      fetchBoardActivity(board.id)
        .then((res) => setActivities(res.data.filter((a) => a.task === task.id)))
        .catch(() => {})
        .finally(() => setLoadingActivity(false));
    }
  }, [tab, isNew, board.id, task.id, activities.length]);

  const handlePostComment = async () => {
    if (!commentBody.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await postComment(board.id, task.id, commentBody.trim());
      setComments((c) => [...c, res.data]);
      setCommentBody('');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (cid) => {
    if (!window.confirm('Delete this comment?')) return;
    await deleteComment(board.id, task.id, cid);
    setComments((c) => c.filter((x) => x.id !== cid));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAttachment(board.id, task.id, file);
      setAttachments((a) => [...a, res.data]);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (aid) => {
    if (!window.confirm('Delete this file?')) return;
    await deleteAttachment(board.id, task.id, aid);
    setAttachments((a) => a.filter((x) => x.id !== aid));
  };

  return (
    <div className="kb-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="kb-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="kb-drawer-header">
          <h3>{isNew ? 'New Task' : task.title}</h3>
          <button className="kb-icon-btn" onClick={onClose} aria-label="Close">{Icon.Close}</button>
        </div>

        {!isNew && (
          <div className="kb-drawer-tabs">
            <button className={`kb-tab ${tab === 'details' ? 'kb-tab--active' : ''}`} onClick={() => setTab('details')}>
              Details
            </button>
            <button className={`kb-tab ${tab === 'comments' ? 'kb-tab--active' : ''}`} onClick={() => setTab('comments')}>
              {Icon.Comment} Comments {comments.length > 0 && `(${comments.length})`}
            </button>
            <button className={`kb-tab ${tab === 'attachments' ? 'kb-tab--active' : ''}`} onClick={() => setTab('attachments')}>
              {Icon.Attach} Files {attachments.length > 0 && `(${attachments.length})`}
            </button>
            <button className={`kb-tab ${tab === 'activity' ? 'kb-tab--active' : ''}`} onClick={() => setTab('activity')}>
              {Icon.Activity} Activity
            </button>
          </div>
        )}

        <div className="kb-drawer-body">
          {/* DETAILS TAB */}
          {tab === 'details' && (
            <>
              <div className="kb-field">
                <label>Title <span className="kb-required">*</span></label>
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="What needs to be done?"
                  autoFocus
                  className={!form.title.trim() ? 'kb-input-error' : ''}
                />
              </div>
              <div className="kb-field">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Add more context…"
                  rows={4}
                />
              </div>
              <div className="kb-field">
                <label>Priority</label>
                <div className="kb-priority-group">
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className={`kb-priority-btn ${form.priority === k ? 'kb-priority-btn--active' : ''}`}
                      style={form.priority === k ? { borderColor: v.color, background: v.bg, color: v.color } : {}}
                      onClick={() => set('priority', k)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="kb-field-row">
                <div className="kb-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="kb-field">
                  <label>Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
                </div>
              </div>
              <div className="kb-field">
                <label>Assign To</label>
                <div className="kb-assignee-group">
                  <button
                    type="button"
                    className={`kb-assignee-btn ${!form.assignee ? 'kb-assignee-btn--active' : ''}`}
                    onClick={() => set('assignee', '')}
                  >
                    Unassigned
                  </button>
                  {board.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`kb-assignee-btn ${String(form.assignee) === String(m.id) ? 'kb-assignee-btn--active' : ''}`}
                      onClick={() => set('assignee', m.id)}
                    >
                      <span className="kb-avatar">{(m.name || m.username)[0].toUpperCase()}</span>
                      {m.name || m.username}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div className="kb-comments-wrap">
              <div className="kb-comments-list">
                {comments.length === 0 && (
                  <div className="kb-empty-state">No comments yet. Start the conversation!</div>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="kb-comment">
                    <div className="kb-comment-header">
                      <span className="kb-comment-author">
                        {c.author_name}
                        {c.author_role === 'doctor' && <span className="kb-badge-sup">Supervisor</span>}
                      </span>
                      <span className="kb-comment-time">{fmtDate(c.created_at)}</span>
                      <button className="kb-icon-btn kb-icon-btn--danger" onClick={() => handleDeleteComment(c.id)} title="Delete">
                        {Icon.Trash}
                      </button>
                    </div>
                    <p className="kb-comment-body">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="kb-comment-input">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePostComment();
                  }}
                />
                <button
                  className="kb-btn kb-btn--primary"
                  onClick={handlePostComment}
                  disabled={!commentBody.trim() || postingComment}
                >
                  {Icon.Send} {postingComment ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {tab === 'attachments' && (
            <div className="kb-attachments-wrap">
              <button className="kb-btn kb-btn--primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {Icon.Attach} {uploading ? 'Uploading…' : 'Upload File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <div className="kb-attachments-list">
                {attachments.length === 0 && (
                  <div className="kb-empty-state">No files attached yet.</div>
                )}
                {attachments.map((a) => (
                  <div key={a.id} className="kb-attachment">
                    <span className="kb-attachment-icon">{fileIcon(a.extension)}</span>
                    <div className="kb-attachment-info">
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="kb-attachment-name">
                        {a.filename}
                      </a>
                      <span className="kb-attachment-meta">
                        {fmtSize(a.file_size)} • {a.uploaded_by_name} • {fmtDate(a.created_at)}
                      </span>
                    </div>
                    <button className="kb-icon-btn" onClick={() => window.open(a.file_url, '_blank')} title="Download">
                      {Icon.Download}
                    </button>
                    <button className="kb-icon-btn kb-icon-btn--danger" onClick={() => handleDeleteAttachment(a.id)} title="Delete">
                      {Icon.Trash}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === 'activity' && (
            <div className="kb-activity-wrap">
              {loadingActivity && <div className="kb-empty-state">Loading activity…</div>}
              {!loadingActivity && activities.length === 0 && (
                <div className="kb-empty-state">No activity yet.</div>
              )}
              {!loadingActivity && activities.map((a) => (
                <div key={a.id} className="kb-activity-item">
                  <div className="kb-activity-dot" />
                  <div className="kb-activity-content">
                    <span className="kb-activity-actor">
                      {a.actor_name}
                      {a.actor_role === 'doctor' && <span className="kb-badge-sup">Supervisor</span>}
                    </span>
                    <span className="kb-activity-verb">{a.verb}</span>
                    {a.detail && <span className="kb-activity-detail">{a.detail}</span>}
                    <span className="kb-activity-time">{fmtDate(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="kb-drawer-footer">
          {!isNew && tab === 'details' && (
            <button className="kb-btn kb-btn--danger" onClick={() => onDelete(task.id)}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="kb-btn kb-btn--ghost" onClick={onClose}>
            {tab === 'details' ? 'Cancel' : 'Close'}
          </button>
          {tab === 'details' && (
            <button
              className="kb-btn kb-btn--primary"
              onClick={() => onSave(form)}
              disabled={isSaving || !valid}
            >
              {isSaving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Main KanbanBoard ─────────────────────────────────────────────────────────
export default function KanbanBoard({ board, setBoard, canEdit = true }) {
  const [drawer, setDrawer]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragNode                = useRef(null);

  const tasksByCol = (colKey) => (board?.tasks || []).filter((t) => t.status === colKey);
  const done  = (board?.tasks || []).filter((t) => t.status === 'done').length;
  const total = (board?.tasks || []).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const openCreate = (colKey) => setDrawer({ task: { status: colKey } });
  const openEdit   = (task)   => setDrawer({ task });
  const closeDrawer = ()      => setDrawer(null);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        status:      form.status,
        assignee:    form.assignee || null,
        due_date:    form.due_date || null,
      };
      if (!drawer.task.id) {
        const res = await createTask(board.id, payload);
        setBoard((b) => ({ ...b, tasks: [...b.tasks, res.data] }));
      } else {
        const res = await updateTask(board.id, drawer.task.id, payload);
        setBoard((b) => ({ ...b, tasks: b.tasks.map((t) => t.id === res.data.id ? res.data : t) }));
      }
      closeDrawer();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(board.id, taskId);
    setBoard((b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== taskId) }));
    closeDrawer();
  };

  const onDragStart = (task, e) => {
    setDragTask(task);
    dragNode.current = e.currentTarget;
    setTimeout(() => dragNode.current?.classList.add('kb-task--ghost'), 0);
  };

  const onDragEnd = () => {
    dragNode.current?.classList.remove('kb-task--ghost');
    setDragTask(null);
    setDragOver(null);
  };

  const onDrop = async (colKey) => {
    setDragOver(null);
    if (!dragTask || dragTask.status === colKey) return;
    const res = await updateTask(board.id, dragTask.id, { status: colKey });
    setBoard((b) => ({ ...b, tasks: b.tasks.map((t) => t.id === res.data.id ? res.data : t) }));
    setDragTask(null);
  };

  return (
    <div className="kb-wrap">
      <div className="kb-board-header">
        <div className="kb-board-info">
          <h2 className="kb-board-title">{board.title}</h2>
          <div className="kb-members">
            {board.members.map((m) => (
              <span key={m.id} className="kb-member-chip" title={m.name}>
                {(m.name || m.username)[0].toUpperCase()}
              </span>
            ))}
            <span className="kb-member-names">
              {board.members.map((m) => m.name || m.username).join(', ')}
            </span>
          </div>
        </div>
        <div className="kb-board-stats">
          <div className="kb-stat">
            <span className="kb-stat-val">{total}</span>
            <span className="kb-stat-label">Tasks</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat-val">{done}</span>
            <span className="kb-stat-label">Done</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat-val" style={{ color: pct === 100 ? '#22c55e' : '#6366f1' }}>{pct}%</span>
            <span className="kb-stat-label">Progress</span>
          </div>
        </div>
      </div>

      <div className="kb-progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="kb-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="kb-board">
        {COLUMNS.map((col) => {
          const colTasks = tasksByCol(col.key);
          const isOver   = dragOver === col.key;

          return (
            <div
              key={col.key}
              className={`kb-column ${isOver ? 'kb-column--over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col.key)}
            >
              <div className="kb-col-header" style={{ borderTopColor: col.color }}>
                <div className="kb-col-title-row">
                  <span className="kb-col-dot" style={{ background: col.color }} />
                  <span className="kb-col-title">{col.label}</span>
                  <span className="kb-col-count">{colTasks.length}</span>
                </div>
              </div>

              <div className="kb-col-body">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onDragStart={(e) => onDragStart(task, e)}
                    onDragEnd={onDragEnd}
                    isDragging={dragTask?.id === task.id}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="kb-col-empty">{isOver ? 'Drop here' : 'No tasks'}</div>
                )}
              </div>

              {canEdit && (
                <button className="kb-add-btn" onClick={() => openCreate(col.key)}>
                  {Icon.Plus} Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>

      {drawer && (
        <TaskDrawer
          task={drawer.task}
          board={board}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={saving}
        />
      )}
    </div>
  );
}
