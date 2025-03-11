const { validationResult } = require('express-validator');
const { User, Roles } = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

        // بررسی فعال بودن کاربر
        if (!user.is_active) {
            return res.status(403).json({ error: 'حساب کاربری غیرفعال است' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطا در ورود به سیستم' });
    }
};

const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, firstName, lastName, role } = req.body;

        // فقط ادمین می‌تواند کاربر با نقش ادمین ایجاد کند
        if (role === Roles.ADMIN && (!req.user || req.user.role !== Roles.ADMIN)) {
            return res.status(403).json({ error: 'فقط ادمین می‌تواند کاربر ادمین ایجاد کند' });
        }

        // بررسی تکراری نبودن نام کاربری
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
        }

        // بررسی تکراری نبودن ایمیل
        const existingEmail = await User.getByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است' });
        }

        // هش کردن پسورد
        const hashedPassword = await bcrypt.hash(password, 12);

        const userId = await User.create({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            is_active: true
        });

        const user = await User.getById(userId);

        res.status(201).json({
            message: 'کاربر با موفقیت ایجاد شد',
            user: {
                id: user.id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
    }
};

const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;
        const user = await User.getById(req.user.userId);

        // بررسی پسورد فعلی
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
        }

        // هش کردن پسورد جدید
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // آپدیت پسورد
        await User.update(user.id, { password: hashedPassword });

        res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.getById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            isActive: user.is_active
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات پروفایل' });
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
    register,
    changePassword,
    getUserProfile,
    getUsersByRole
}; 