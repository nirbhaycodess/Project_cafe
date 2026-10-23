// api.js — backward-compat re-export from src/services/api.js
// Keeps any existing imports of 'api' or 'SOCKET_URL' from root working.
export { default, SOCKET_URL, API_BASE } from './src/services/api';
