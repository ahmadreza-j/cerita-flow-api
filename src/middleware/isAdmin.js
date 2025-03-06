const { UserRoles } = require('../models/user.model');

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== UserRoles.ADMIN) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
};

module.exports = isAdmin; 