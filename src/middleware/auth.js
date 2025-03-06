const { User, Roles } = require('../models/user.model');
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'توکن احراز هویت یافت نشد' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // بررسی وجود کاربر در دیتابیس
        const user = await User.getById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'کاربر یافت نشد' });
        }

        // بررسی فعال بودن کاربر
        if (!user.is_active) {
            return res.status(403).json({ error: 'حساب کاربری غیرفعال است' });
        }

        req.user = {
            userId: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            clinicId: user.clinic_id,
            isActive: user.is_active
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'توکن نامعتبر است' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'توکن منقضی شده است' });
        }
        res.status(500).json({ error: 'خطا در احراز هویت' });
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

module.exports = { auth, checkRole, checkClinic }; 