const { User, Roles } = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { getClinicByDbName, executeClinicQuery } = require('../utils/databaseManager');

/**
 * Authentication middleware for admin users
 */
const authAdmin = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: توکن ارائه نشده است' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists in admin database
        const user = await User.getById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
        }
        
        // Add user info to request
        req.user = {
            userId: user.id,
            role: user.role,
            isAdmin: true
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'دسترسی غیرمجاز: توکن نامعتبر است' });
    }
};

/**
 * Authentication middleware for clinic users
 */
const authClinic = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: توکن ارائه نشده است' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if clinic exists
        const clinic = await getClinicByDbName(decoded.dbName);
        
        if (!clinic) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: مطب یافت نشد' });
        }
        
        // Check if user exists in clinic database
        const users = await executeClinicQuery(
            decoded.dbName,
            'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.userId]
        );
        
        if (!users || users.length === 0) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
        }
        
        const user = users[0];
        
        // Add user and clinic info to request
        req.user = {
            userId: user.id,
            role: user.role,
            isAdmin: false
        };
        
        req.clinic = {
            id: clinic.id,
            name: clinic.name,
            dbName: clinic.db_name
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'دسترسی غیرمجاز: توکن نامعتبر است' });
    }
};

/**
 * General authentication middleware that handles both admin and clinic users
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
        if (decoded.isAdmin) {
            // Check if user exists in admin database
            const user = await User.getById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
            }
            
            // Add user info to request
            req.user = {
                userId: user.id,
                role: user.role,
                isAdmin: true
            };
        } else {
            // It's a clinic user token
            // Check if clinic exists
            const clinic = await getClinicByDbName(decoded.dbName);
            
            if (!clinic) {
                return res.status(401).json({ error: 'دسترسی غیرمجاز: مطب یافت نشد' });
            }
            
            // Check if user exists in clinic database
            const users = await executeClinicQuery(
                decoded.dbName,
                'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
                [decoded.userId]
            );
            
            if (!users || users.length === 0) {
                return res.status(401).json({ error: 'دسترسی غیرمجاز: کاربر یافت نشد' });
            }
            
            const user = users[0];
            
            // Add user and clinic info to request
            req.user = {
                userId: user.id,
                role: user.role,
                isAdmin: false
            };
            
            req.clinic = {
                id: clinic.id,
                name: clinic.name,
                dbName: clinic.db_name
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

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'شما دسترسی به این بخش را ندارید',
                requiredRoles: roles,
                currentRole: req.user.role
            });
        }

        next();
    };
};

const checkClinic = (req, res, next) => {
    if (!req.user.clinicId && req.user.role !== Roles.ADMIN) {
        return res.status(403).json({ error: 'شما به هیچ مطبی متصل نیستید' });
    }

    // اگر ادمین باشد، محدودیت مطب ندارد
    if (req.user.role === Roles.ADMIN) {
        return next();
    }

    // بررسی تطابق مطب درخواستی با مطب کاربر
    const requestedClinicId = parseInt(req.params.clinicId || req.body.clinicId);
    if (requestedClinicId && requestedClinicId !== req.user.clinicId) {
        return res.status(403).json({ error: 'شما به این مطب دسترسی ندارید' });
    }

    next();
};

module.exports = {
    auth,
    authAdmin,
    authClinic,
    checkRole,
    checkClinic
}; 