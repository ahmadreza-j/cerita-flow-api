const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Roles } = require('../models/user.model');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', [
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').notEmpty().withMessage('رمز عبور الزامی است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const user = await User.getByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور نادرست است' });
        }

        const isValidPassword = await User.validatePassword(user, password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور نادرست است' });
        }

        const token = jwt.sign(
            { 
                userId: user.id,
                role: user.role,
                clinicId: user.clinic_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                clinicId: user.clinic_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطا در ورود به سیستم' });
    }
});

// Register
router.post('/register', [
    body('username').notEmpty().withMessage('نام کاربری الزامی است'),
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
    body('role').isIn(Object.values(Roles)).withMessage('نقش نامعتبر است'),
    body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
    body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
    body('phoneNumber').optional().matches(/^[0-9]+$/).withMessage('شماره تلفن نامعتبر است'),
    body('clinicId').optional().isInt().withMessage('شناسه مطب نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const existingUser = await User.getByEmail(req.body.email);
        if (existingUser) {
            return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است' });
        }

        const existingUsername = await User.getByUsername(req.body.username);
        if (existingUsername) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
        }

        const userId = await User.create(req.body);
        res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد', userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'خطا در ثبت‌نام' });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.getById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            clinicId: user.clinic_id
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
    }
});

// Update current user profile
router.put('/me', auth, [
    body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
    body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
    body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
    body('phoneNumber').optional().matches(/^[0-9]+$/).withMessage('شماره تلفن نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (req.body.email) {
            const existingUser = await User.getByEmail(req.body.email);
            if (existingUser && existingUser.id !== req.user.userId) {
                return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است' });
            }
        }

        const success = await User.update(req.user.userId, req.body);
        if (!success) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({ message: 'اطلاعات کاربر با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'خطا در بروزرسانی اطلاعات کاربر' });
    }
});

module.exports = router; 