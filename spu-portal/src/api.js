import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (username, password) =>
  api.post('/api/token/', { username, password });

export const importUsers = (file, role) => {
  const form = new FormData();
  form.append('file', file);
  form.append('role', role);
  return api.post('/api/import-users/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const logoutUser = () =>
  api.post('/api/logout/', { refresh: localStorage.getItem('refresh') });

export const changePassword = (new_password, confirm_password) =>
  api.post('/api/change-password/', { new_password, confirm_password });

export const fetchDoctors = () => api.get('/api/doctors/');
export const fetchDepartments = () => api.get('/api/departments/');
export const assignHod = (doctor_id, department) =>
  api.post('/api/assign-hod/', { doctor_id, department });

export const uploadReferenceDb = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/api/upload-reference/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const studentSelfRegister = (university_id, password) =>
  api.post('/api/register/', { university_id, password });

// ── Projects: Doctor (UC-01) ──────────────────────────────────────────────────
export const submitProjectIdea = (data) =>
  api.post('/api/projects/ideas/submit/', data);

export const fetchMyIdeas = () =>
  api.get('/api/projects/ideas/');

// ── Projects: Student (UC-02) ─────────────────────────────────────────────────
export const submitStudentProposal = (data) =>
  api.post('/api/projects/proposals/submit/', data);

export const fetchMyProposal = () =>
  api.get('/api/projects/proposals/mine/');

// ── Projects: UC-03 Browse & Apply ───────────────────────────────────────────
export const browseIdeas = () =>
  api.get('/api/projects/ideas/browse/');

export const applyOnIdea = (ideaId, data) =>
  api.post(`/api/projects/ideas/${ideaId}/apply/`, data);

export const fetchMyIdeaApplication = () =>
  api.get('/api/projects/applications/mine/');

// ── Projects: Doctor reviews applications ─────────────────────────────────────
export const fetchDoctorPendingApplications = () =>
  api.get('/api/projects/applications/pending-doctor/');

export const doctorReviewApplication = (appId, data) =>
  api.post(`/api/projects/applications/${appId}/doctor-review/`, data);

// ── Projects: Supervisor review ───────────────────────────────────────────────
export const fetchSupervisorPending = () =>
  api.get('/api/projects/proposals/pending-supervisor/');

export const supervisorReview = (proposalId, data) =>
  api.post(`/api/projects/proposals/${proposalId}/supervisor-review/`, data);

// ── Projects: HoD review ──────────────────────────────────────────────────────
export const fetchHodPending = () =>
  api.get('/api/projects/proposals/pending-hod/');

export const hodReview = (proposalId, data) =>
  api.post(`/api/projects/proposals/${proposalId}/hod-review/`, data);

export const fetchHodPendingDoctorIdeas = () =>
  api.get('/api/projects/ideas/pending-hod/');

export const hodReviewDoctorIdea = (ideaId, data) =>
  api.post(`/api/projects/ideas/${ideaId}/hod-review/`, data);

export const fetchHodPendingApplications = () =>
  api.get('/api/projects/applications/pending-hod/');

export const hodReviewApplication = (appId, data) =>
  api.post(`/api/projects/applications/${appId}/hod-review/`, data);

// ── Team invitations ──────────────────────────────────────────────────────────
export const fetchMyInvitations = () =>
  api.get('/api/projects/invitations/mine/');

export const respondToInvitation = (invId, action) =>
  api.post(`/api/projects/invitations/${invId}/respond/`, { action });

// ── Proposal invitations (student proposals) ──────────────────────────────────
export const fetchMyProposalInvitations = () =>
  api.get('/api/projects/proposal-invitations/mine/');

export const respondToProposalInvitation = (invId, action) =>
  api.post(`/api/projects/proposal-invitations/${invId}/respond/`, { action });

// ── Doctors list (for supervisor dropdown) ────────────────────────────────────
export const fetchDoctorsList = () =>
  api.get('/api/projects/doctors/');

export const searchStudents = (q) =>
  api.get('/api/projects/students/', { params: { q } });

export default api;

// ── Notifications ─────────────────────────────────────────────────────────────
export const fetchNotifications = () =>
  api.get('/api/notifications/');

export const fetchUnreadCount = () =>
  api.get('/api/notifications/unread-count/');

export const markNotifRead = (id) =>
  api.post(`/api/notifications/${id}/read/`);

export const markAllNotifsRead = () =>
  api.post('/api/notifications/mark-all-read/');
