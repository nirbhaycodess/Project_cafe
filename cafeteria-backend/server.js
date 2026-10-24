// File path: cafeteria-backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // 1. Import built-in http module
const { Server } = require('socket.io'); // 2. Import Socket.IO
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());
app.use(cors());

// 3. Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow mobile app to connect
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connection established successfully.');

    // Auto-seed default SuperAdmin if none exists
    const existingAdmin = await User.findOne({ role: 'SuperAdmin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Campus SuperAdmin',
        email: 'admin@college.edu',
        password: hashedPassword,
        role: 'SuperAdmin',
        accountStatus: 'Approved',
      });
      console.log('Default SuperAdmin created: admin@college.edu / admin123');
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Database Models
require('./models/user');
require('./models/menuitems');
require('./models/order');

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const menuRoutes = require('./routes/menu');
app.use('/api/menu', menuRoutes);

const orderRoutes = require('./routes/order');
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.send('Cafeteria Backend is running.');
});

// 4. Listen for Socket.IO connections
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // You can listen for custom events here later
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 5. CRITICAL: Use server.listen instead of app.listen!
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});