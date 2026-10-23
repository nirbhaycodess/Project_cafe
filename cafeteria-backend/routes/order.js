// File path: cafeteria-backend/routes/order.js
const express = require('express');
const crypto = require('crypto');
const Order = require('../models/order');
const MenuItem = require('../models/menuitems');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const router = express.Router();

// POST: Place a new order (Accessible by any logged-in user)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found.' });
      }
      if (!menuItem.isAvailable || (menuItem.stock !== -1 && menuItem.stock < item.quantity)) {
        return res.status(400).json({ message: `${menuItem.name} is out of stock or unavailable.` });
      }

      // Deduct stock if the item tracks limited inventory (stock !== -1)
      if (menuItem.stock !== -1) {
        menuItem.stock -= item.quantity;
        if (menuItem.stock === 0) {
          menuItem.isAvailable = false;
        }
        await menuItem.save();
      }

      totalAmount += menuItem.price * item.quantity;
      processedItems.push({
        menuItem: menuItem._id,
        quantity: item.quantity,
        priceAtPurchase: menuItem.price
      });
    }

    const orderToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const newOrder = new Order({
      user: req.user.userId,
      items: processedItems,
      totalAmount,
      orderToken
    });

    const savedOrder = await newOrder.save();

    // Populate user and food names before broadcasting to the live kitchen queue
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price');

    req.io.emit('newOrder', populatedOrder);

    res.status(201).json({ message: 'Order placed successfully.', order: populatedOrder });
  } catch (error) {
    console.error('Place Order Error:', error);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// GET: Retrieve a user's own orders
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your orders.' });
  }
});

// PUT: Verify QR Code Token and complete the order (Staff, Manager, SuperAdmin)
router.put('/verify', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { orderToken } = req.body;
    if (!orderToken) {
      return res.status(400).json({ message: 'Order token is required.' });
    }

    // Find the order and populate student info + item names for the scanner screen
    const order = await Order.findOne({ orderToken: orderToken.toUpperCase() })
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Invalid QR token. Order not found.' });
    }
    if (order.orderStatus === 'Completed') {
      return res.status(400).json({ message: 'This order has already been claimed.' });
    }
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'This order was cancelled.' });
    }

    order.orderStatus = 'Completed';
    await order.save();

    req.io.emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.orderStatus,
      userId: order.user._id
    });

    res.status(200).json({
      message: 'Order verified and completed successfully.',
      verifiedByRole: req.user.role,
      order
    });
  } catch (error) {
    console.error('Verify Order Error:', error);
    res.status(500).json({ message: 'Failed to verify order token.' });
  }
});

// GET: Retrieve the active kitchen queue (Staff, Manager, SuperAdmin)
router.get('/queue', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const activeOrders = await Order.find({ orderStatus: { $nin: ['Completed', 'Cancelled'] } })
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: 1 });
    res.status(200).json(activeOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order queue.' });
  }
});

// PUT: Update order status (Staff, Manager, SuperAdmin)
router.put('/:id/status', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status update.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    )
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    req.io.emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.orderStatus,
      userId: order.user._id
    });

    res.status(200).json({ message: `Order status updated to ${status}.`, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status.' });
  }
});

module.exports = router;