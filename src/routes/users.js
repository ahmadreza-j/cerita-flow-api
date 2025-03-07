const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate, authorize, requireManagerOrAdmin } = require('../middleware/auth.middleware');
const { Roles } = require('../models/user.model');

// All routes require authentication
router.use(authenticate);

// Get current user's profile
router.get('/me', userController.getUserById);

// Routes below require manager or admin permissions
router.use(requireManagerOrAdmin);

// Create a new user
router.post(
  '/',
  [
    body('username').notEmpty().withMessage('نام کاربری الزامی است'),
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
    body('firstName').notEmpty().withMessage('نام الزامی است'),
    body('lastName').notEmpty().withMessage('نام خانوادگی الزامی است'),
    body('role').isIn(Object.values(Roles)).withMessage('نقش کاربری نامعتبر است')
  ],
  userController.createUser
);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user
router.put(
  '/:id',
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
    body('isActive').optional().isBoolean().withMessage('وضعیت فعال بودن باید true یا false باشد')
  ],
  userController.updateUser
);

// Delete user (mark as inactive)
router.delete('/:id', userController.deleteUser);

// Get clinic staff
router.get('/clinic/staff', userController.getClinicStaff);

module.exports = router; 