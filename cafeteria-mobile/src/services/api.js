// src/services/api.js
// Axios instance with JWT interceptor — single source of truth for HTTP

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOCKET_URL = 'http://10.46.139.89:5000';
export const API_BASE   = `${SOCKET_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timed out. Check your connection.' : 'Network error. Is the server running?');
    return Promise.reject({ ...error, userMessage: message });
  }
);

export default api;

