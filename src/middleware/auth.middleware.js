const jwt = require('jsonwebtoken');
const { User, Roles } = require('../models/user.model');
const Admin = require('../models/admin.model');

/**
 * Authenticate JWT token and add user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token
    if (decoded.role === 'ADMIN') {
      const admin = await Admin.getById(decoded.userId);
      
      if (!admin || !admin.is_active) {
        return res.status(401).json({ message: 'Invalid authentication' });
      }
      
      // Add admin info to request
      req.user = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: 'ADMIN'
      };
      
      return next();
    }
    
    // Regular user authentication
    const user = await User.getById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }
    
    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid authentication' });
  }
};

/**
 * Check if user has required role
 * @param {string|string[]} roles - Required role(s)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    // Admin has access to everything
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Convert roles to array if it's a single role
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
};

/**
 * Check if user is an admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin
}; 