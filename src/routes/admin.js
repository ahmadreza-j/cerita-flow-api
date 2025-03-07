const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { User, Roles } = require('../models/user.model');
const { 
  getAllClinics, 
  getClinicById, 
  createClinicDatabase,
  executeClinicQuery
} = require('../utils/databaseManager');
const bcrypt = require('bcryptjs');

// Middleware to check if user is admin
router.use(auth);
router.use(isAdmin);

// Get all clinics
router.get('/clinics', async (req, res) => {
  try {
    const clinics = await getAllClinics();
    res.json(clinics);
  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست مطب‌ها' });
  }
});

// Get clinic by ID
router.get('/clinics/:id', async (req, res) => {
  try {
    const clinic = await getClinicById(req.params.id);
    if (!clinic) {
      return res.status(404).json({ error: 'مطب یافت نشد' });
    }
    res.json(clinic);
  } catch (error) {
    console.error('Get clinic error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مطب' });
  }
});

// Create new clinic
router.post('/clinics', [
  body('name').notEmpty().withMessage('نام مطب الزامی است'),
  body('dbName').notEmpty().withMessage('نام دیتابیس الزامی است')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('نام دیتابیس فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد'),
  body('managerName').optional(),
  body('address').optional(),
  body('phone').optional(),
  body('establishmentYear').optional(),
  body('logoUrl').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const clinicId = await createClinicDatabase(
      req.body.name,
      req.body.dbName,
      {
        managerName: req.body.managerName,
        address: req.body.address,
        phone: req.body.phone,
        establishmentYear: req.body.establishmentYear,
        logoUrl: req.body.logoUrl
      }
    );

    // If manager credentials are provided, create manager account in the clinic database
    if (req.body.managerUsername && req.body.managerEmail && req.body.managerPassword) {
      const hashedPassword = await bcrypt.hash(req.body.managerPassword, 10);
      
      await executeClinicQuery(
        req.body.dbName,
        `INSERT INTO users (
          username,
          email,
          password,
          first_name,
          last_name,
          role,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.managerUsername,
          req.body.managerEmail,
          hashedPassword,
          req.body.managerFirstName || 'مدیر',
          req.body.managerLastName || 'مطب',
          'CLINIC_MANAGER',
          true
        ]
      );
    }

    res.status(201).json({ 
      message: 'مطب با موفقیت ایجاد شد', 
      clinicId,
      clinicName: req.body.name,
      dbName: req.body.dbName
    });
  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({ error: error.message || 'خطا در ایجاد مطب' });
  }
});

// Get clinic staff
router.get('/clinics/:dbName/staff', async (req, res) => {
  try {
    const users = await executeClinicQuery(
      req.params.dbName,
      `SELECT id, username, email, role, first_name, last_name, 
              phone_number, created_at, updated_at
       FROM users
       ORDER BY role, created_at DESC`
    );
    
    res.json(users);
  } catch (error) {
    console.error('Get clinic staff error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست کارکنان مطب' });
  }
});

// Create clinic staff
router.post('/clinics/:dbName/staff', [
  body('username').notEmpty().withMessage('نام کاربری الزامی است'),
  body('email').isEmail().withMessage('ایمیل نامعتبر است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
  body('role').isIn(['CLINIC_MANAGER', 'SECRETARY', 'DOCTOR', 'OPTICIAN']).withMessage('نقش نامعتبر است'),
  body('firstName').notEmpty().withMessage('نام الزامی است'),
  body('lastName').notEmpty().withMessage('نام خانوادگی الزامی است'),
  body('phoneNumber').optional().matches(/^\d+$/).withMessage('شماره تلفن نامعتبر است')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if username or email already exists
    const existingUsers = await executeClinicQuery(
      req.params.dbName,
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [req.body.username, req.body.email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'نام کاربری یا ایمیل قبلاً ثبت شده است' });
    }
    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    const result = await executeClinicQuery(
      req.params.dbName,
      `INSERT INTO users (
        username,
        email,
        password,
        first_name,
        last_name,
        phone_number,
        national_id,
        age,
        gender,
        address,
        medical_license_number,
        role,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [
        req.body.username,
        req.body.email,
        hashedPassword,
        req.body.firstName,
        req.body.lastName,
        req.body.phoneNumber || null,
        req.body.nationalId || null,
        req.body.age || null,
        req.body.gender || null,
        req.body.address || null,
        req.body.medicalLicenseNumber || null,
        req.body.role
      ]
    );
    
    res.status(201).json({ 
      message: 'کاربر با موفقیت ایجاد شد', 
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Create clinic staff error:', error);
    res.status(500).json({ error: 'خطا در ایجاد کاربر' });
  }
});

// Get all admin users
router.get('/users', async (req, res) => {
  try {
    const users = await User.getAll(req.query);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
  }
});

// Create new admin user
router.post('/users', [
  body('username').notEmpty().withMessage('نام کاربری الزامی است'),
  body('email').isEmail().withMessage('ایمیل نامعتبر است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
  body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
  body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
  body('phoneNumber').optional().matches(/^\d+$/).withMessage('شماره تلفن نامعتبر است')
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

    const userData = {
      ...req.body,
      role: Roles.ADMIN
    };

    const userId = await User.create(userData);
    res.status(201).json({ message: 'کاربر با موفقیت ایجاد شد', userId });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'خطا در ایجاد کاربر' });
  }
});

// Update admin user
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
  body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل ۶ کاراکتر باشد'),
  body('firstName').optional().notEmpty().withMessage('نام نمی‌تواند خالی باشد'),
  body('lastName').optional().notEmpty().withMessage('نام خانوادگی نمی‌تواند خالی باشد'),
  body('phoneNumber').optional().matches(/^\d+$/).withMessage('شماره تلفن نامعتبر است')
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

// Delete admin user
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
    const clinics = await getAllClinics();
    
    const [adminUsers] = await User.getAll({ role: Roles.ADMIN });
    
    res.json({
      totalClinics: clinics.length,
      totalAdminUsers: adminUsers.length,
      recentClinics: clinics.slice(0, 5)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

module.exports = router; 