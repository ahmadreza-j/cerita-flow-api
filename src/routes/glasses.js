const express = require('express');
const { body, query, param } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const {
    createGlasses,
    getGlassesByVisitId,
    getDailyPrescriptions,
    getPatientGlassesHistory
} = require('../controllers/glassesController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create glasses record (optician only)
router.post('/', [
    checkRole(['optician']),
    body('visit_id').isInt().withMessage('شناسه ویزیت نامعتبر است'),
    body('frame_code')
        .optional()
        .isString().withMessage('کد فریم نامعتبر است'),
    body('frame_model')
        .optional()
        .isString().withMessage('مدل فریم نامعتبر است'),
    body('frame_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('قیمت فریم نامعتبر است'),
    body('lens_type')
        .optional()
        .isString().withMessage('نوع لنز نامعتبر است'),
    body('lens_features')
        .optional()
        .isString().withMessage('ویژگی‌های لنز نامعتبر است'),
    body('lens_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('قیمت لنز نامعتبر است'),
    body('total_price')
        .isFloat({ min: 0 }).withMessage('قیمت کل نامعتبر است')
], createGlasses);

// Get glasses by visit ID
router.get('/visit/:visitId', [
    param('visitId').isInt().withMessage('شناسه ویزیت نامعتبر است')
], getGlassesByVisitId);

// Get daily prescriptions (optician only)
router.get('/daily-prescriptions', [
    checkRole(['optician']),
    query('date')
        .optional()
        .isISO8601().withMessage('فرمت تاریخ نامعتبر است')
], getDailyPrescriptions);

// Get patient's glasses history
router.get('/patient/:patientId/history', [
    param('patientId').isInt().withMessage('شناسه بیمار نامعتبر است')
], getPatientGlassesHistory);

module.exports = router; 