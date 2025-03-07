const jwt = require('jsonwebtoken');
const { User, Roles } = require('../models/user.model');
const SuperAdmin = require('../models/superAdmin.model');
const Clinic = require('../models/clinic.model');

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
    
    // Check if it's a super admin token
    if (decoded.isSuperAdmin) {
      const superAdmin = await SuperAdmin.getById(decoded.id);
      
      if (!superAdmin || !superAdmin.is_active) {
        return res.status(401).json({ message: 'Invalid authentication' });
      }
      
      // Add super admin info to request
      req.user = {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        firstName: superAdmin.first_name,
        lastName: superAdmin.last_name,
        isSuperAdmin: true
      };
      
      return next();
    }
    
    // Regular user authentication
    // Get clinic database name from token
    if (!decoded.clinicDbName) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }
    
    // Store clinic database name in request for database operations
    req.clinicDbName = decoded.clinicDbName;
    
    // Get clinic info
    const clinic = await Clinic.getByDbName(decoded.clinicDbName);
    if (!clinic || !clinic.is_active) {
      return res.status(401).json({ message: 'Clinic not found or inactive' });
    }
    
    // Add clinic info to request
    req.clinic = {
      id: clinic.id,
      name: clinic.name,
      dbName: clinic.db_name
    };
    
    // Get user from database
    const user = await User.getById(decoded.id, decoded.clinicDbName);
    
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
      role: user.role,
      clinicId: user.clinic_id,
      isSuperAdmin: false
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
    // Super admin has access to everything
    if (req.user.isSuperAdmin) {
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
 * Check if user is a super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  
  next();
};

/**
 * Check if user is a clinic manager or admin
 */
const requireManagerOrAdmin = (req, res, next) => {
  if (req.user.isSuperAdmin || req.user.role === Roles.ADMIN || req.user.role === Roles.CLINIC_MANAGER) {
    return next();
  }
  
  res.status(403).json({ message: 'Manager or admin access required' });
};

module.exports = {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireManagerOrAdmin
}; 