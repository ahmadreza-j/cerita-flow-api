const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { User, UserRoles, Roles } = require('../models/user.model');
const { executeQuery } = require('../config/database');

// Middleware to check if user is admin
router.use(auth);
router.use(isAdmin);

// Get all users with filters
router.get('/users', [
    query('role').optional().isIn(Object.values(Roles)),
    query('clinicId').optional().isInt(),
    query('search').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const users = await User.getAll(req.query);
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }
});

// Get clinic staff
router.get('/clinics/:clinicId/staff', [
    query('clinicId').isInt().withMessage('شناسه مطب نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const staff = await User.getClinicStaff(req.params.clinicId);
        res.json(staff);
    } catch (error) {
        console.error('Get clinic staff error:', error);
        res.status(500).json({ error: 'خطا در دریافت لیست کارکنان مطب' });
    }
});

// Create new user
router.post('/users', [
    body('username').notEmpty().withMessage('نام کاربری الزامی است'),
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
    body('role').isIn(Object.values(Roles)).withMessage('نقش نامعتبر است'),
    body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
    body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
    body('phoneNumber').optional().matches(/^\d+$/).withMessage('شماره تلفن نامعتبر است'),
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
        res.status(201).json({ message: 'کاربر با موفقیت ایجاد شد', userId });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
    }
});

// Update user
router.put('/users/:id', [
    body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
    body('role').optional().isIn(Object.values(Roles)).withMessage('نقش نامعتبر است'),
    body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
    body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
    body('phoneNumber').optional().matches(/^\d+$/).withMessage('شماره تلفن نامعتبر است'),
    body('clinicId').optional().isInt().withMessage('شناسه مطب نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (req.body.email) {
            const existingUser = await User.getByEmail(req.body.email);
            if (existingUser && existingUser.id !== parseInt(req.params.id)) {
                return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است' });
            }
        }

        const success = await User.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({ message: 'کاربر با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'خطا در بروزرسانی کاربر' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const success = await User.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({ message: 'کاربر با موفقیت حذف شد' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'خطا در حذف کاربر' });
    }
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers] = await executeQuery(
            'SELECT COUNT(*) as count FROM users WHERE is_active = true'
        );

        const [doctorsCount] = await executeQuery(
            'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = true',
            [UserRoles.DOCTOR]
        );

        const [secretariesCount] = await executeQuery(
            'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = true',
            [UserRoles.SECRETARY]
        );

        const [opticiansCount] = await executeQuery(
            'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = true',
            [UserRoles.OPTICIAN]
        );

        res.json({
            totalUsers: totalUsers[0].count,
            doctorsCount: doctorsCount[0].count,
            secretariesCount: secretariesCount[0].count,
            opticiansCount: opticiansCount[0].count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت آمار' });
    }
});

// Get recent users
router.get('/users/recent', async (req, res) => {
    try {
        const [users] = await executeQuery(
            `SELECT id, username, full_name, role, created_at 
             FROM users 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY created_at DESC
             LIMIT 5`
        );
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت لیست کاربران اخیر' });
    }
});

// Get recent visits
router.get('/visits/recent', async (req, res) => {
    try {
        const [visits] = await executeQuery(
            `SELECT v.id, v.visit_date,
                    p.first_name, p.last_name,
                    u.full_name as doctor_name
             FROM visits v
             JOIN patients p ON v.patient_id = p.id
             JOIN users u ON v.doctor_id = u.id
             WHERE v.visit_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY v.visit_date DESC
             LIMIT 5`
        );

        const formattedVisits = visits.map(visit => ({
            id: visit.id,
            visitDate: visit.visit_date,
            patientName: `${visit.first_name} ${visit.last_name}`,
            doctorName: visit.doctor_name
        }));

        res.json(formattedVisits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت لیست ویزیت‌های اخیر' });
    }
});

module.exports = router; 