// File path: cafeteria-backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, collegeId, email, password, role } = req.body;
    const requestedRole = role || 'Student';

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required.' });
    }

    if (requestedRole === 'SuperAdmin') {
      return res.status(403).json({ message: 'SuperAdmin cannot be registered publicly.' });
    }

    if (requestedRole === 'Student' && !collegeId) {
      return res.status(400).json({ message: 'College ID is required for students.' });
    }

    if ((requestedRole === 'Staff' || requestedRole === 'Manager') && !email) {
      return res.status(400).json({ message: `Email is required for ${requestedRole} registration.` });
    }

    // Check existing user
    const existingQuery = requestedRole === 'Student'
      ? { collegeId: collegeId.trim().toUpperCase() }
      : { email: email.trim().toLowerCase() };

    const existingUser = await User.findOne(existingQuery);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this ID or Email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Students are Approved immediately; Staff and Managers start as Pending
    const accountStatus = requestedRole === 'Student' ? 'Approved' : 'Pending';

    const newUser = new User({
      name: name.trim(),
      collegeId: requestedRole === 'Student' ? collegeId.trim().toUpperCase() : undefined,
      email: requestedRole !== 'Student' ? email.trim().toLowerCase() : undefined,
      password: hashedPassword,
      role: requestedRole,
      accountStatus
    });

    await newUser.save();

    res.status(201).json({
      message: accountStatus === 'Pending'
        ? `${requestedRole} registration submitted! Please wait for approval before signing in.`
        : 'Registration successful! You can now sign in.',
      accountStatus,
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        accountStatus: newUser.accountStatus
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide your ID/Email and password.' });
    }

    const cleanId = identifier.trim();

    // Find by either email (lowercase) or collegeId (uppercase/exact)
    const user = await User.findOne({
      $or: [
        { email: cleanId.toLowerCase() },
        { collegeId: cleanId.toUpperCase() },
        { collegeId: cleanId }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check Approval / Account Status (treat legacy accounts without accountStatus as Approved)
    const currentStatus = user.accountStatus || 'Approved';

    if (currentStatus === 'Pending') {
      return res.status(403).json({
        message: `Your ${user.role} account is still pending approval.`
      });
    }

    if (currentStatus === 'Rejected' || currentStatus === 'Suspended') {
      return res.status(403).json({
        message: `Your account has been ${currentStatus.toLowerCase()}. Please contact administration.`
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        collegeId: user.collegeId,
        email: user.email,
        role: user.role,
        accountStatus: currentStatus
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;