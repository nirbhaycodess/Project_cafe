// File path: cafeteria-backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Added JWT library
const User = require('../models/user');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// POST: Register a new user
router.post('/register', async (req, res) => {
  // ... (Keep your existing register code inside here) ...
  try {
    const { collegeId, email, name, password, role } = req.body;
    const userRole = role || 'Student';

    if (userRole === 'Student' && !collegeId) {
      return res.status(400).json({ message: 'College ID is required for Students.' });
    }                                                                                                                                
    if (userRole !== 'Student' && !email) {
      return res.status(400).json({ message: 'Email is required for Staff, Managers, and Admins.' });
    }

    const query = userRole === 'Student' ? { collegeId } : { email };
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this credential already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      collegeId: userRole === 'Student' ? collegeId : undefined,
      email: userRole !== 'Student' ? email : undefined,
      name,
      password: hashedPassword,
      role: userRole
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully.' });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST: Login user
router.post('/login', async (req, res) => {
  try {
    // We use "identifier" so the user can send either a College ID or an Email
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide both an identifier and a password.' });
    }

    // Find the user by checking if the identifier matches either collegeId OR email
    const user = await User.findOne({
      $or: [{ collegeId: identifier }, { email: identifier }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if the account is blocked by the SuperAdmin
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Create the JWT payload
    const payload = {
      userId: user._id,
      role: user.role
    };

    // Sign the token with our secret key, set it to expire in 7 days
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;


// GET: A protected test route only Managers and SuperAdmins can access
router.get('/admin-only', verifyToken, verifyRole(['Manager', 'SuperAdmin']), (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the admin area!', 
    userData: req.user 
  });
});

// GET: A protected test route for anyone who is logged in
router.get('/profile', verifyToken, (req, res) => {
  res.status(200).json({ 
    message: 'You have access to your profile.', 
    userData: req.user 
  });
});