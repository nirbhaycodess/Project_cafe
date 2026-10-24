
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: String, // or Number
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: -1 // -1 means unlimited stock
  },
  // NEW: Quick Packet Item flag (instant Ready status for packed snacks/beverages)
  isQuickItem: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);