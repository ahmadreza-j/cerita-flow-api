const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { User, Roles } = require('../models/user.model');
const bcrypt = require('bcryptjs');

// Middleware to check if user is admin
router.use(auth);
router.use(isAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// Create new user
router.post('/users', [
  body('username').notEmpty().withMessage('نام کاربری الزامی است'),
  body('email').isEmail().withMessage('ایمیل نامعتبر است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
  body('firstName').notEmpty().withMessage('نام الزامی است'),
  body('lastName').notEmpty().withMessage('نام خانوادگی الزامی است'),
  body('role').isIn([Roles.SECRETARY, Roles.DOCTOR, Roles.OPTICIAN]).withMessage('نقش کاربری نامعتبر است'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if username or email already exists
    const existingUser = await User.getByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
    }

    const existingEmail = await User.getByEmail(req.body.email);
    if (existingEmail) {
      return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create user
    const newUser = {
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber || null,
      nationalId: req.body.nationalId || null,
      role: req.body.role,
      medicalLicenseNumber: req.body.medicalLicenseNumber || null,
      isActive: true
    };

    const userId = await User.create(newUser);
    res.status(201).json({ 
      message: 'کاربر با موفقیت ایجاد شد',
      userId 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'خطا در ایجاد کاربر' });
  }
});

// Update user
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
  body('firstName').optional(),
  body('lastName').optional(),
  body('role').optional().isIn([Roles.SECRETARY, Roles.DOCTOR, Roles.OPTICIAN]).withMessage('نقش کاربری نامعتبر است'),
  body('isActive').optional().isBoolean().withMessage('وضعیت کاربر باید true یا false باشد'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.params.id;
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== user.email) {
      const existingEmail = await User.getByEmail(req.body.email);
      if (existingEmail && existingEmail.id !== parseInt(userId)) {
        return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
      }
    }

    // Update user
    const updatedUser = {
      email: req.body.email || user.email,
      firstName: req.body.firstName || user.firstName,
      lastName: req.body.lastName || user.lastName,
      phoneNumber: req.body.phoneNumber !== undefined ? req.body.phoneNumber : user.phoneNumber,
      nationalId: req.body.nationalId !== undefined ? req.body.nationalId : user.nationalId,
      role: req.body.role || user.role,
      medicalLicenseNumber: req.body.medicalLicenseNumber !== undefined ? req.body.medicalLicenseNumber : user.medicalLicenseNumber,
      isActive: req.body.isActive !== undefined ? req.body.isActive : user.isActive
    };

    await User.update(userId, updatedUser);
    res.json({ message: 'کاربر با موفقیت بروزرسانی شد' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'خطا در بروزرسانی کاربر' });
  }
});

// Change user password
router.put('/users/:id/password', [
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.params.id;
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Update password
    await User.updatePassword(userId, hashedPassword);
    res.json({ message: 'رمز عبور با موفقیت تغییر یافت' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    await User.delete(userId);
    res.json({ message: 'کاربر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'خطا در حذف کاربر' });
  }
});

module.exports = router; 