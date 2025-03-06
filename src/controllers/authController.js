const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const user = await User.findByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        const isValidPassword = await User.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ورود به سیستم' });
    }
};

const createUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, fullName, role } = req.body;

        // Check if username already exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
        }

        const userId = await User.create({ username, password, fullName, role });
        const user = await User.findById(userId);

        res.status(201).json({
            message: 'کاربر با موفقیت ایجاد شد',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
    }
};

const getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await User.findByRole(role);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }
};

module.exports = {
    login,
    createUser,
    getUsersByRole
}; 