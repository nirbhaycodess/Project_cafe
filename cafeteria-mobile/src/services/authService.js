// src/services/authService.js
import api from './api';

export const authService = {
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
    return res.data; // { token, user: { id, name, role } }
  },

  /**
   * Register a new user.
   * Backend rules (from routes/auth.js):
   *  - Student  → requires collegeId, no email
   *  - Staff / Manager → requires email, no collegeId
   */
  register: async ({ name, role, collegeId, email, password }) => {
    const payload = {
      name: name.trim(),
      password,
      role,
      ...(role === 'Student'
        ? { collegeId: collegeId.trim() }
        : { email: email.trim().toLowerCase() }),
    };
    const res = await api.post('/auth/register', payload);
    return res.data; // { message }
  },
};
