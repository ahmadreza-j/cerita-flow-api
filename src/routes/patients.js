const express = require('express');
const { body, query, param } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const {
    createPatient,
    searchPatients,
    getPatientById,
    getPatientByNationalId,
    updatePatient,
    getPatientVisitHistory
} = require('../controllers/patientController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create patient (secretary and admin only)
router.post('/', [
    checkRole(['secretary', 'admin']),
    body('national_id')
        .notEmpty().withMessage('کد ملی الزامی است')
        .isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقم باشد')
        .matches(/^[0-9]+$/).withMessage('کد ملی باید فقط شامل اعداد باشد'),
    body('first_name')
        .notEmpty().withMessage('نام الزامی است')
        .isLength({ min: 2 }).withMessage('نام باید حداقل 2 کاراکتر باشد'),
    body('last_name')
        .notEmpty().withMessage('نام خانوادگی الزامی است')
        .isLength({ min: 2 }).withMessage('نام خانوادگی باید حداقل 2 کاراکتر باشد'),
    body('birth_date')
        .optional()
        .isISO8601().withMessage('فرمت تاریخ تولد نامعتبر است'),
    body('age')
        .optional()
        .isInt({ min: 0, max: 120 }).withMessage('سن باید بین 0 تا 120 باشد'),
    body('phone')
        .optional()
        .matches(/^09[0-9]{9}$/).withMessage('شماره موبایل نامعتبر است')
], createPatient);

// Search patients
router.get('/search', [
    query('searchTerm')
        .isLength({ min: 3 }).withMessage('عبارت جستجو باید حداقل 3 کاراکتر باشد')
], searchPatients);

// Get patient by ID
router.get('/:id', [
    param('id').isInt().withMessage('شناسه بیمار نامعتبر است')
], getPatientById);

// Get patient by national ID
router.get('/national/:nationalId', [
    param('nationalId')
        .isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقم باشد')
        .matches(/^[0-9]+$/).withMessage('کد ملی باید فقط شامل اعداد باشد')
], getPatientByNationalId);

// Update patient (secretary and admin only)
router.put('/:id', [
    checkRole(['secretary', 'admin']),
    param('id').isInt().withMessage('شناسه بیمار نامعتبر است'),
    body('first_name')
        .optional()
        .isLength({ min: 2 }).withMessage('نام باید حداقل 2 کاراکتر باشد'),
    body('last_name')
        .optional()
        .isLength({ min: 2 }).withMessage('نام خانوادگی باید حداقل 2 کاراکتر باشد'),
    body('birth_date')
        .optional()
        .isISO8601().withMessage('فرمت تاریخ تولد نامعتبر است'),
    body('age')
        .optional()
        .isInt({ min: 0, max: 120 }).withMessage('سن باید بین 0 تا 120 باشد'),
    body('phone')
        .optional()
        .matches(/^09[0-9]{9}$/).withMessage('شماره موبایل نامعتبر است')
], updatePatient);

// Get patient visit history
router.get('/:id/visits', [
    param('id').isInt().withMessage('شناسه بیمار نامعتبر است')
], getPatientVisitHistory);

module.exports = router; 