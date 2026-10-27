// File path: cafeteria-web/src/services/api.js
import axios from 'axios';

export const SOCKET_URL = 'https://project-cafe-vkif.onrender.com';
export const API_URL = `${SOCKET_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;