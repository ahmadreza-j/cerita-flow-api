const { User, Roles } = require('../models/user.model');
const Admin = require('../models/admin.model');
const jwt = require('jsonwebtoken');

/**
 * General authentication middleware
 */
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: توکن ارائه نشده است' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's an admin token
        if (decoded.role === 'ADMIN') {
            // Check if admin exists
            const admin = await Admin.getById(decoded.userId);
            
            if (!admin || !admin.is_active) {
                return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
            }
            
            // Add admin info to request
            req.user = {
                userId: admin.id,
                role: 'ADMIN'
            };
        } else {
            // It's a regular user token
            const user = await User.getById(decoded.userId);
            
            if (!user || !user.is_active) {
                return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
            }
            
            // Add user info to request
            req.user = {
                userId: user.id,
                role: user.role
            };
        }
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'دسترسی غیرمجاز: توکن نامعتبر است' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'لطفا ابتدا وارد شوید' });
        }

        // Admin has access to everything
        if (req.user.role === 'ADMIN') {
            return next();
        }

        // Convert roles to array if it's a single role
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'شما دسترسی به این بخش را ندارید',
                requiredRoles: allowedRoles,
                currentRole: req.user.role
            });
        }

        next();
    };
};

module.exports = {
    auth,
    checkRole
}; 