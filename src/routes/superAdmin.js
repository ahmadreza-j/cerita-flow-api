const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const clinicController = require('../controllers/clinic.controller');
const userController = require('../controllers/user.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');
const { Roles } = require('../models/user.model');

// Super admin authentication routes
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.superAdminLogin
);

// Protected routes (require super admin authentication)
router.use(authenticate);
router.use(requireSuperAdmin);

// Get super admin profile
router.get('/profile', authController.getProfile);

// Change password
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ],
  authController.changePassword
);

// Clinic management routes
router.post(
  '/clinics',
  [
    body('name').notEmpty().withMessage('Clinic name is required'),
    body('address').optional(),
    body('phone').optional(),
    body('managerName').optional(),
    body('establishmentYear').optional(),
    body('logoUrl').optional()
  ],
  clinicController.createClinic
);

router.get('/clinics', clinicController.getAllClinics);
router.get('/clinics/:id', clinicController.getClinicById);

router.put(
  '/clinics/:id',
  [
    body('name').optional(),
    body('address').optional(),
    body('phone').optional(),
    body('managerName').optional(),
    body('establishmentYear').optional(),
    body('logoUrl').optional(),
    body('isActive').optional().isBoolean()
  ],
  clinicController.updateClinic
);

router.delete('/clinics/:id', clinicController.deleteClinic);

// User management routes for super admin
router.post(
  '/users',
  [
    body('username').notEmpty().withMessage('نام کاربری الزامی است'),
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
    body('firstName').notEmpty().withMessage('نام الزامی است'),
    body('lastName').notEmpty().withMessage('نام خانوادگی الزامی است'),
    body('role').isIn(Object.values(Roles)).withMessage('نقش کاربری نامعتبر است'),
    body('clinicId').notEmpty().withMessage('شناسه کلینیک الزامی است')
  ],
  userController.createUser
);

router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);

router.put(
  '/users/:id',
  [
    body('username').optional(),
    body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
    body('firstName').optional(),
    body('lastName').optional(),
    body('phoneNumber').optional(),
    body('nationalId').optional(),
    body('age').optional().isNumeric().withMessage('سن باید عدد باشد'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('جنسیت نامعتبر است'),
    body('address').optional(),
    body('medicalLicenseNumber').optional(),
    body('role').optional().isIn(Object.values(Roles)).withMessage('نقش کاربری نامعتبر است'),
    body('isActive').optional().isBoolean().withMessage('وضعیت فعال بودن باید true یا false باشد'),
    body('clinicId').optional()
  ],
  userController.updateUser
);

router.delete('/users/:id', userController.deleteUser);

// Get clinic managers
router.get('/clinic-managers', userController.getClinicManagers);

module.exports = router; 