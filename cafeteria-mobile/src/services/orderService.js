// src/services/orderService.js
import api from './api';

export const orderService = {
  placeOrder: async (cartItems) => {
    // cartItems: [{ menuItemId, quantity }]
    const res = await api.post('/orders', { items: cartItems });
    return res.data.order;
  },

  getMyOrders: async () => {
    const res = await api.get('/orders/my-orders');
    return res.data;
  },

  getQueue: async () => {
    const res = await api.get('/orders/queue');
    return res.data;
  },

  updateStatus: async (orderId, status) => {
    const res = await api.put(`/orders/${orderId}/status`, { status });
    return res.data.order;
  },

  verifyToken: async (orderToken) => {
    const res = await api.put('/orders/verify', { orderToken: orderToken.trim().toUpperCase() });
    return res.data; // { message, verifiedByRole, order }
  },
};

