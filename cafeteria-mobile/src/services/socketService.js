// src/services/socketService.js
// Singleton Socket.IO connection — connect once, reuse across screens

import { io } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket = null;

export const socketService = {
  connect: () => {
    if (!socket || !socket.connected) {
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }
    return socket;
  },

  getSocket: () => socket,

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  on: (event, handler) => {
    if (socket) socket.on(event, handler);
  },

  off: (event, handler) => {
    if (socket) socket.off(event, handler);
  },
};

