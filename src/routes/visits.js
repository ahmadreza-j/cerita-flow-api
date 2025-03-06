const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const Visit = require('../models/visit.model');
const moment = require('moment-jalaali');

// Get all visits for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
    try {
        const visits = await Visit.findByPatientId(req.params.patientId);
        
        const formattedVisits = visits.map(visit => ({
            ...visit,
            visitDate: moment(visit.visit_date).format('jYYYY/jMM/jDD'),
            visitTime: moment(visit.visit_time, 'HH:mm:ss').format('HH:mm')
        }));

        res.json({ visits: formattedVisits });
    } catch (error) {
        console.error('Get visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت ویزیت‌ها' });
    }
});

// Create new visit
router.post('/', [
    auth,
    checkRole(['DOCTOR', 'SECRETARY'])
], [
    body('patientId').isInt().withMessage('شناسه بیمار نامعتبر است'),
    body('visitDate').isDate().withMessage('تاریخ ویزیت نامعتبر است'),
    body('visitTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('زمان ویزیت نامعتبر است'),
    body('chiefComplaint').optional().trim().notEmpty().withMessage('شکایت اصلی نمی‌تواند خالی باشد'),
    body('diagnosis').optional().trim().notEmpty().withMessage('تشخیص نمی‌تواند خالی باشد'),
    body('recommendations').optional().trim().notEmpty().withMessage('توصیه‌ها نمی‌تواند خالی باشد')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const visitData = {
            ...req.body,
            doctorId: req.user.role === 'DOCTOR' ? req.user.id : req.body.doctorId,
            clinicId: req.user.clinicId,
            status: 'pending'
        };

        const visitId = await Visit.create(visitData);
        const visit = await Visit.findById(visitId);

        res.status(201).json({
            message: 'ویزیت با موفقیت ثبت شد',
            visit: {
                ...visit,
                visitDate: moment(visit.visit_date).format('jYYYY/jMM/jDD'),
                visitTime: moment(visit.visit_time, 'HH:mm:ss').format('HH:mm')
            }
        });
    } catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({ error: 'خطا در ثبت ویزیت' });
    }
});

// Update visit
router.put('/:id', [
    auth,
    checkRole(['DOCTOR'])
], [
    body('visitDate').optional().isDate().withMessage('تاریخ ویزیت نامعتبر است'),
    body('visitTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('زمان ویزیت نامعتبر است'),
    body('chiefComplaint').optional().trim().notEmpty().withMessage('شکایت اصلی نمی‌تواند خالی باشد'),
    body('diagnosis').optional().trim().notEmpty().withMessage('تشخیص نمی‌تواند خالی باشد'),
    body('recommendations').optional().trim().notEmpty().withMessage('توصیه‌ها نمی‌تواند خالی باشد'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('وضعیت نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        // فقط دکتر مربوطه می‌تواند ویزیت را ویرایش کند
        if (visit.doctor_id !== req.user.id) {
            return res.status(403).json({ error: 'شما اجازه ویرایش این ویزیت را ندارید' });
        }

        const success = await Visit.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        const updatedVisit = await Visit.findById(req.params.id);
        res.json({
            message: 'ویزیت با موفقیت بروزرسانی شد',
            visit: {
                ...updatedVisit,
                visitDate: moment(updatedVisit.visit_date).format('jYYYY/jMM/jDD'),
                visitTime: moment(updatedVisit.visit_time, 'HH:mm:ss').format('HH:mm')
            }
        });
    } catch (error) {
        console.error('Update visit error:', error);
        res.status(500).json({ error: 'خطا در بروزرسانی ویزیت' });
    }
});

// Delete visit
router.delete('/:id', [
    auth,
    checkRole(['DOCTOR', 'SECRETARY'])
], async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        // فقط دکتر مربوطه یا منشی مطب می‌تواند ویزیت را حذف کند
        if (req.user.role === 'DOCTOR' && visit.doctor_id !== req.user.id) {
            return res.status(403).json({ error: 'شما اجازه حذف این ویزیت را ندارید' });
        }

        if (req.user.role === 'SECRETARY' && visit.clinic_id !== req.user.clinicId) {
            return res.status(403).json({ error: 'شما اجازه حذف این ویزیت را ندارید' });
        }

        const success = await Visit.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        res.json({ message: 'ویزیت با موفقیت حذف شد' });
    } catch (error) {
        console.error('Delete visit error:', error);
        res.status(500).json({ error: 'خطا در حذف ویزیت' });
    }
});

// Get doctor's visits for today
router.get('/doctor/today', [
    auth,
    checkRole(['DOCTOR'])
], async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const visits = await Visit.findByDoctorAndDate(req.user.id, today);

        const formattedVisits = visits.map(visit => ({
            ...visit,
            visitDate: moment(visit.visit_date).format('jYYYY/jMM/jDD'),
            visitTime: moment(visit.visit_time, 'HH:mm:ss').format('HH:mm')
        }));

        res.json({ visits: formattedVisits });
    } catch (error) {
        console.error('Get today visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت ویزیت‌های امروز' });
    }
});

// Get clinic's visits for a date range
router.get('/clinic', [
    auth,
    checkRole(['CLINIC_MANAGER', 'SECRETARY'])
], async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const visits = await Visit.findByClinicAndDateRange(
            req.user.clinicId,
            startDate || moment().format('YYYY-MM-DD'),
            endDate || moment().format('YYYY-MM-DD')
        );

        const formattedVisits = visits.map(visit => ({
            ...visit,
            visitDate: moment(visit.visit_date).format('jYYYY/jMM/jDD'),
            visitTime: moment(visit.visit_time, 'HH:mm:ss').format('HH:mm')
        }));

        res.json({ visits: formattedVisits });
    } catch (error) {
        console.error('Get clinic visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت ویزیت‌های مطب' });
    }
});

module.exports = router; 