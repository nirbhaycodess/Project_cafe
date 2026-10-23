// src/services/menuService.js
import api from './api';

export const menuService = {
  getAll: async () => {
    const res = await api.get('/menu');
    return res.data; // MenuItem[]
  },

  create: async (payload) => {
    const res = await api.post('/menu', payload);
    return res.data.item;
  },

  update: async (id, payload) => {
    const res = await api.put(`/menu/${id}`, payload);
    return res.data.item;
  },

  remove: async (id) => {
    await api.delete(`/menu/${id}`);
  },

  toggleAvailability: async (item) => {
    const res = await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
    return res.data.item;
  },
};

