const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true } // Security: store price at time of purchase
  }],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'], 
    default: 'Pending' 
  },
  orderStatus: { 
    type: String, 
    enum: ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'], 
    default: 'Received' 
  },
  orderToken: { 
    type: String, 
    unique: true, 
    sparse: true // Unique code for QR generation
  },
  transactionId: { 
    type: String 
  }
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);