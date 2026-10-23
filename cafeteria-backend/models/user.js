// File path: cafeteria-backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  collegeId: { 
    type: String, 
    unique: true, 
    sparse: true, // Allows multiple users to not have a collegeId
    trim: true 
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, // Allows students to not have an email
    trim: true,
    lowercase: true
  },
  name: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['Student', 'Staff', 'Manager', 'SuperAdmin'], 
    default: 'Student' 
  },
  isBlocked: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);