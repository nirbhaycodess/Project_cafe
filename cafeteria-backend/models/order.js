// File path: cafeteria-backend/models/order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      priceAtPurchase: {
        type: Number,
        required: true
      },
      isQuickItem: {
        type: Boolean,
        default: false
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
    default: 'Received'
  },
  orderToken: {
    type: String,
    required: true,
    unique: true
  },
  // Payment tracking for Student & Admin Analytics
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Paid'
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Card', 'Counter'],
    default: 'UPI'
  },
  // Tracks which Staff or Manager scanned/verified this QR order
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  // Student Feedback on the order
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
    createdAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);