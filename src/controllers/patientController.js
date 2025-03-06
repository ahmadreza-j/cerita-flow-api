const { validationResult } = require('express-validator');
const { Patient } = require('../models/patient.model');
const moment = require('moment-jalaali');

const createPatient = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if patient already exists
        const existingPatient = await Patient.findByNationalId(req.body.national_id);
        if (existingPatient) {
            return res.status(400).json({ error: 'بیمار با این کد ملی قبلاً ثبت شده است' });
        }

        const patientId = await Patient.create(req.body);
        const patient = await Patient.findById(patientId);

        res.status(201).json({
            message: 'پرونده بیمار با موفقیت ایجاد شد',
            patient
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ایجاد پرونده بیمار' });
    }
};

const searchPatients = async (req, res) => {
    try {
        const { searchTerm } = req.query;
        if (!searchTerm || searchTerm.length < 3) {
            return res.status(400).json({ error: 'عبارت جستجو باید حداقل 3 کاراکتر باشد' });
        }

        const patients = await Patient.search(searchTerm);
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: 'خطا در جستجوی بیماران' });
    }
};

const getPatientById = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: 'بیمار یافت نشد' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات بیمار' });
    }
};

const getPatientByNationalId = async (req, res) => {
    try {
        const patient = await Patient.findByNationalId(req.params.nationalId);
        if (!patient) {
            return res.status(404).json({ error: 'بیمار یافت نشد' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات بیمار' });
    }
};

const updatePatient = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const success = await Patient.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'بیمار یافت نشد' });
        }

        const updatedPatient = await Patient.findById(req.params.id);
        res.json({
            message: 'اطلاعات بیمار با موفقیت به‌روزرسانی شد',
            patient: updatedPatient
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در به‌روزرسانی اطلاعات بیمار' });
    }
};

const getPatientVisitHistory = async (req, res) => {
    try {
        const visits = await Patient.getVisitHistory(req.params.id);
        
        // Format dates to Jalali
        const formattedVisits = visits.map(visit => ({
            ...visit,
            visit_date: moment(visit.visit_date).format('jYYYY/jMM/jDD'),
            created_at: moment(visit.created_at).format('jYYYY/jMM/jDD HH:mm:ss')
        }));

        res.json(formattedVisits);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت تاریخچه مراجعات' });
    }
};

module.exports = {
    createPatient,
    searchPatients,
    getPatientById,
    getPatientByNationalId,
    updatePatient,
    getPatientVisitHistory
}; 