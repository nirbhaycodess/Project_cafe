// File path: cafeteria-backend/routes/order.js
const express = require('express');
const crypto = require('crypto');
const Order = require('../models/order');
const MenuItem = require('../models/menuitems');
const User = require('../models/user');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const Support = require('../models/support');

const router = express.Router();

// 1. POST /api/orders - Place a new order (Auto-sets status to 'Ready' if all items are Quick Packet items)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }

    let totalAmount = 0;
    const processedItems = [];
    let allQuickItems = true;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found.' });
      }
      if (!menuItem.isAvailable || (menuItem.stock !== -1 && menuItem.stock < item.quantity)) {
        return res.status(400).json({ message: `${menuItem.name} is out of stock or unavailable.` });
      }

      if (menuItem.stock !== -1) {
        menuItem.stock -= item.quantity;
        if (menuItem.stock === 0) {
          menuItem.isAvailable = false;
        }
        await menuItem.save();
      }

      if (!menuItem.isQuickItem) {
        allQuickItems = false;
      }

      const itemPrice = Number(menuItem.price);
      totalAmount += itemPrice * item.quantity;
      processedItems.push({
        menuItem: menuItem._id,
        quantity: item.quantity,
        priceAtPurchase: itemPrice,
        isQuickItem: Boolean(menuItem.isQuickItem),
      });
    }

    const orderToken = crypto.randomBytes(3).toString('hex').toUpperCase();

    // If every item in the cart is a Quick Packet item, set status straight to 'Ready'!
    const initialOrderStatus = allQuickItems ? 'Ready' : 'Received';

    const newOrder = new Order({
      user: req.user.userId,
      items: processedItems,
      totalAmount,
      orderToken,
      orderStatus: initialOrderStatus,
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: 'Paid',
    });

    const savedOrder = await newOrder.save();

    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price isQuickItem');

    req.io.emit('newOrder', populatedOrder);

    res.status(201).json({
      message: allQuickItems
        ? 'Quick Packet Order placed! Status is READY for instant pickup.'
        : 'Order placed successfully.',
      order: populatedOrder,
    });
  } catch (error) {
    console.error('Place Order Error:', error);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// 2. GET /api/orders/my-orders - Student's own order history
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate('items.menuItem', 'name price isQuickItem')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your orders.' });
  }
});

// 3. PUT /api/orders/verify - Verify QR Token & Record which Staff/Manager verified it
router.put('/verify', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { orderToken } = req.body;
    if (!orderToken) {
      return res.status(400).json({ message: 'Order token is required.' });
    }

    const order = await Order.findOne({ orderToken: orderToken.trim().toUpperCase() })
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price isQuickItem');

    if (!order) {
      return res.status(404).json({ message: 'Invalid QR token. Order not found.' });
    }
    if (order.orderStatus === 'Completed') {
      return res.status(400).json({ message: 'This order has already been verified and claimed.' });
    }
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'This order was cancelled.' });
    }

    order.orderStatus = 'Completed';
    order.verifiedBy = req.user.userId;
    order.verifiedAt = new Date();
    await order.save();

    const populatedVerified = await Order.findById(order._id)
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price isQuickItem')
      .populate('verifiedBy', 'name role email');

    req.io.emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.orderStatus,
      userId: order.user?._id,
    });

    res.status(200).json({
      message: 'Order verified and completed successfully.',
      verifiedByRole: req.user.role,
      order: populatedVerified,
    });
  } catch (error) {
    console.error('Verify Order Error:', error);
    res.status(500).json({ message: 'Failed to verify order token.' });
  }
});

// 4. GET /api/orders/queue - Active kitchen queue
router.get('/queue', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const activeOrders = await Order.find({ orderStatus: { $nin: ['Completed', 'Cancelled'] } })
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price isQuickItem')
      .sort({ createdAt: 1 });
    res.status(200).json(activeOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order queue.' });
  }
});

// 5. GET /api/orders/verified - All verified orders (For Manager & SuperAdmin)
router.get('/verified', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const verifiedOrders = await Order.find({ orderStatus: 'Completed' })
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price isQuickItem')
      .populate('verifiedBy', 'name role email')
      .sort({ verifiedAt: -1, updatedAt: -1 })
      .limit(100);
    res.status(200).json(verifiedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch verified orders.' });
  }
});

// 6. GET /api/orders/my-verified - Staff's own record of orders they verified
router.get('/my-verified', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const myVerifiedOrders = await Order.find({
      orderStatus: 'Completed',
      verifiedBy: req.user.userId,
    })
      .populate('user', 'name collegeId email')
      .populate('items.menuItem', 'name price isQuickItem')
      .populate('verifiedBy', 'name role')
      .sort({ verifiedAt: -1, updatedAt: -1 });
    res.status(200).json(myVerifiedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your verified orders.' });
  }
});

// 7. GET /api/orders/staff-list - Manager views Pending & Active Staff
router.get('/staff-list', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const staffMembers = await User.find({ role: 'Staff' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json(staffMembers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff list.' });
  }
});

// 8. PUT /api/orders/staff/:id/status - Manager approves/rejects/suspends a Staff member
router.put('/staff/:id/status', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { accountStatus } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Suspended'];
    if (!validStatuses.includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const staffUser = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'Staff' },
      {
        accountStatus,
        ...(accountStatus === 'Approved' ? { approvedBy: req.user.userId } : {}),
      },
      { new: true }
    ).select('-password');

    if (!staffUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    res.status(200).json({
      message: `Staff member ${staffUser.name} marked as ${accountStatus}.`,
      user: staffUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update staff status.' });
  }
});

// 9. PUT /api/orders/:id/status - Update order status (Staff, Manager, SuperAdmin)
router.put('/:id/status', verifyToken, verifyRole(['Staff', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status update.' });
    }

    const updatePayload = { orderStatus: status };
    if (status === 'Completed') {
      updatePayload.verifiedBy = req.user.userId;
      updatePayload.verifiedAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updatePayload, { new: true })
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name price isQuickItem')
      .populate('verifiedBy', 'name role');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    req.io.emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.orderStatus,
      userId: order.user?._id,
    });

    res.status(200).json({ message: `Order status updated to ${status}.`, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status.' });
  }
});

// 10. POST /api/orders/:id/feedback - Student submits order feedback
router.post('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    order.feedback = {
      rating: Number(rating) || 5,
      comment: comment ? comment.trim() : '',
      createdAt: new Date(),
    };
    await order.save();
    res.status(200).json({ message: 'Thank you for your feedback!', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback.' });
  }
});

// 11. POST /api/orders/support - Student sends Complaint, Refund Request, or Help ticket to Manager
router.post('/support', verifyToken, async (req, res) => {
  try {
    const { category, orderId, subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    const ticket = await Support.create({
      user: req.user.userId,
      order: orderId || null,
      category: category || 'Help',
      subject: subject.trim(),
      message: message.trim(),
    });

    const populatedTicket = await Support.findById(ticket._id)
      .populate('user', 'name collegeId email')
      .populate('order', 'orderToken totalAmount paymentMethod paymentStatus orderStatus');

    req.io.emit('newSupportTicket', populatedTicket);

    res.status(201).json({ message: 'Request sent to the Manager!', ticket: populatedTicket });
  } catch (error) {
    console.error('Support create error:', error);
    res.status(500).json({ message: 'Failed to submit support ticket.' });
  }
});

// 12. GET /api/orders/my-support - Student views their own Help, Refund & Complaint tickets
router.get('/my-support', verifyToken, async (req, res) => {
  try {
    const tickets = await Support.find({ user: req.user.userId })
      .populate('order', 'orderToken totalAmount paymentMethod paymentStatus')
      .sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load support history.' });
  }
});

// 13. GET /api/orders/all-support - Manager/SuperAdmin views all student complaints, refund requests & tickets
router.get('/all-support', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const tickets = await Support.find()
      .populate('user', 'name collegeId email')
      .populate('order', 'orderToken totalAmount paymentMethod paymentStatus orderStatus')
      .sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load support tickets.' });
  }
});

// 14. PUT /api/orders/support/:id/resolve - Manager replies to ticket, resolves it, or approves a refund
router.put('/support/:id/resolve', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { status, managerReply, markOrderRefunded } = req.body;
    const ticket = await Support.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    if (status) ticket.status = status;
    if (managerReply !== undefined) ticket.managerReply = managerReply.trim();

    // If Manager approves a refund and an order is attached, update that order's paymentStatus to 'Refunded'
    if (markOrderRefunded && ticket.order) {
      await Order.findByIdAndUpdate(ticket.order, { paymentStatus: 'Refunded' });
      ticket.status = 'Refunded';
    }

    await ticket.save();

    const updatedTicket = await Support.findById(ticket._id)
      .populate('user', 'name collegeId email')
      .populate('order', 'orderToken totalAmount paymentMethod paymentStatus orderStatus');

    req.io.emit('supportTicketUpdated', updatedTicket);

    res.status(200).json({
      message: markOrderRefunded
        ? 'Refund approved and response sent to student!'
        : 'Ticket updated and response sent!',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Resolve support error:', error);
    res.status(500).json({ message: 'Failed to update support ticket.' });
  }
});

// 15. GET /api/orders/feedback-list - Manager views all student ratings & order feedback
router.get('/feedback-list', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const feedbackOrders = await Order.find({ 'feedback.rating': { $exists: true } })
      .populate('user', 'name collegeId')
      .populate('items.menuItem', 'name')
      .sort({ 'feedback.createdAt': -1, updatedAt: -1 });
    res.status(200).json(feedbackOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load student feedback.' });
  }
});
module.exports = router;