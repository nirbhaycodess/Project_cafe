// src/services/authService.js
import api from './api';

export const authService = {
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
    return res.data; // { token, user: { id, name, role } }
  },
};

