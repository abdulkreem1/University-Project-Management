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

export default api;
