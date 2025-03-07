const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const clinicController = require('../controllers/clinic.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');

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

module.exports = router; 