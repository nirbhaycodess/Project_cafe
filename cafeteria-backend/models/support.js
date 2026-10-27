// File path: cafeteria-backend/models/support.js
const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  category: {
    type: String,
    enum: ['Refund', 'Complaint', 'Feedback', 'Help'],
    default: 'Help',
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved', 'Refunded'],
    default: 'Open',
  },
  managerReply: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Support', supportSchema);