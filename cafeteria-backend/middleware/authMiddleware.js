// File path: cafeteria-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware to verify if the user has a valid token
const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' });
  }

  try {
    // Tokens are usually sent as "Bearer <token>". This extracts just the token part.
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    
    // Verify the token using our secret key
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the decoded user payload (userId and role) to the request object
    req.user = verified; 
    
    // Move to the next function (the actual route handler)
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to check if the user has the required role
const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.user was set by the verifyToken middleware above
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access Denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };