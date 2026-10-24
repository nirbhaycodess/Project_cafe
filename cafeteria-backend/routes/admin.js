// File path: cafeteria-backend/routes/admin.js
const express = require('express');
const User = require('../models/user');
const Order = require('../models/order');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes in this file: strictly SuperAdmin only
router.use(verifyToken, verifyRole(['SuperAdmin']));

// 1. GET /api/admin/analytics - Orders & Payment Analytical Graph Data
router.get('/analytics', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    let totalRevenue = 0;
    const paymentStatusBreakdown = { Paid: 0, Pending: 0, Failed: 0, Refunded: 0 };
    const paymentMethodBreakdown = { UPI: 0, Card: 0, Counter: 0 };
    const orderStatusBreakdown = {
      Received: 0,
      Preparing: 0,
      Ready: 0,
      Completed: 0,
      Cancelled: 0,
    };

    // Build last 7 days revenue & order count buckets for the bar chart
    const last7Days = [];
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      dayMap[dateKey] = { dateKey, label, revenue: 0, orders: 0 };
      last7Days.push(dayMap[dateKey]);
    }

    orders.forEach((o) => {
      const pStatus = o.paymentStatus || 'Paid';
      const pMethod = o.paymentMethod || 'UPI';
      const oStatus = o.orderStatus || 'Received';

      paymentStatusBreakdown[pStatus] = (paymentStatusBreakdown[pStatus] || 0) + 1;
      paymentMethodBreakdown[pMethod] = (paymentMethodBreakdown[pMethod] || 0) + 1;
      orderStatusBreakdown[oStatus] = (orderStatusBreakdown[oStatus] || 0) + 1;

      if (oStatus !== 'Cancelled' && pStatus === 'Paid') {
        totalRevenue += Number(o.totalAmount || 0);
      }

      if (o.createdAt) {
        const key = new Date(o.createdAt).toISOString().split('T')[0];
        if (dayMap[key]) {
          dayMap[key].orders += 1;
          if (oStatus !== 'Cancelled' && pStatus === 'Paid') {
            dayMap[key].revenue += Number(o.totalAmount || 0);
          }
        }
      }
    });

    const pendingApprovalsCount = await User.countDocuments({
      role: { $in: ['Manager', 'Staff'] },
      accountStatus: 'Pending',
    });

    const activeStaffCount = await User.countDocuments({
      role: { $in: ['Manager', 'Staff'] },
      accountStatus: 'Approved',
    });

    res.status(200).json({
      totalOrders: orders.length,
      totalRevenue,
      pendingApprovalsCount,
      activeStaffCount,
      paymentStatusBreakdown,
      paymentMethodBreakdown,
      orderStatusBreakdown,
      dailyChart: last7Days,
    });
  } catch (error) {
    console.error('Admin Analytics Error:', error);
    res.status(500).json({ message: 'Failed to load analytics.' });
  }
});

// 2. GET /api/admin/staff-managers - Fetch Pending & Active Managers and Staff
router.get('/staff-managers', async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['Manager', 'Staff'] },
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managers and staff.' });
  }
});

// 3. PUT /api/admin/users/:id/status - Approve, Reject, Suspend, or Change Role
router.put('/users/:id/status', async (req, res) => {
  try {
    const { accountStatus, role } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Suspended'];
    const validRoles = ['Student', 'Staff', 'Manager'];

    const updateFields = {};
    if (accountStatus && validStatuses.includes(accountStatus)) {
      updateFields.accountStatus = accountStatus;
      if (accountStatus === 'Approved') {
        updateFields.approvedBy = req.user.userId;
      }
    }
    if (role && validRoles.includes(role)) {
      updateFields.role = role;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: `${updatedUser.name} is now ${updatedUser.role} (${updatedUser.accountStatus}).`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status.' });
  }
});

// 4. GET /api/admin/orders - View recent orders & payment statuses
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name collegeId email role')
      .populate('items.menuItem', 'name price')
      .populate('verifiedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// 5. PUT /api/admin/orders/:id/payment - Verify or update payment status
router.put('/orders/:id/payment', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    )
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price');

    if (!order) return res.status(404).json({ message: 'Order not found.' });

    res.status(200).json({ message: `Payment marked as ${paymentStatus}.`, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update payment status.' });
  }
});

module.exports = router;