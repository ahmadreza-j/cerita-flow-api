const { validationResult } = require('express-validator');
// Import the Patient model directly from the new file
const Patient = require('../models/patient.model');
const moment = require('moment-jalaali');
const { executeCeritaQuery, getCeritaConnection } = require('../config/database');
const { ceritaPool } = require('../config/database');
// Import the Visit model for creating appointments
const Visit = require('../models/visit.model');

const createPatient = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        console.log('Checking if patient exists with national ID:', req.body.national_id);
        // Check if patient already exists
        let existingPatient = await Patient.findByNationalId(req.body.national_id);
        console.log('Result of findByNationalId:', existingPatient ? 'Patient found' : 'Patient not found');
        
        let patientId;
        let patient;
        let visitId;
        let visit;
        let isNewPatient;
        
        // Get the user ID from the request if available, or use a default user ID (1)
        // since the created_by column doesn't allow NULL values
        const userId = req.user && req.user.id ? req.user.id : 1; // Default to user ID 1 if not available
        
        if (existingPatient) {
            // EXISTING PATIENT FLOW
            console.log('Patient already exists with ID:', existingPatient.id);
            // Patient already exists, use existing patient ID
            patientId = existingPatient.id;
            patient = existingPatient;
            isNewPatient = false;
            
            // Create a new appointment for the existing patient
            const visitData = {
                patientId: patientId,
                chiefComplaint: req.body.chief_complaint || null,
                createdBy: userId
            };
            
            visitId = await Visit.create(visitData);
            visit = await Visit.findById(visitId);
            
            console.log('Created visit for existing patient:', visitId);
            
            return res.status(200).json({
                message: 'بیمار با این کد ملی قبلاً ثبت شده است. نوبت جدید با موفقیت ایجاد شد',
                patient,
                visit: {
                    ...visit,
                    visit_date: moment(visit.visit_date).format('jYYYY/jMM/jDD')
                },
                isNewPatient
            });
        } else {
            // NEW PATIENT FLOW
            console.log('Creating new patient with national ID:', req.body.national_id);
            // Create new patient
            console.log('Creating patient with data:', JSON.stringify(req.body));
            patientId = await Patient.create(req.body);
            console.log('New patient created with ID:', patientId);
            patient = await Patient.findById(patientId);
            isNewPatient = true;
            
            // Create a new appointment for the new patient
            const visitData = {
                patientId: patientId,
                chiefComplaint: req.body.chief_complaint || null,
                createdBy: userId
            };
            
            visitId = await Visit.create(visitData);
            visit = await Visit.findById(visitId);
            
            console.log('Created visit for new patient:', visitId);
            
            // Construct the response object
            const responseObj = {
                message: 'پرونده بیمار با موفقیت ایجاد شد و نوبت جدید ثبت گردید',
                patient,
                visit: {
                    ...visit,
                    visit_date: moment(visit.visit_date).format('jYYYY/jMM/jDD')
                },
                isNewPatient: true  // Explicitly set to true for new patients
            };
            
            console.log('Sending response for new patient with isNewPatient:', responseObj.isNewPatient);
            
            return res.status(201).json(responseObj);
        }
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'خطا در ایجاد پرونده بیمار' });
    }
};

const searchPatients = async (req, res) => {
    try {
        const { searchTerm, query, limit, sort } = req.query;
        
        // If no search term but limit and sort are provided, redirect to recent patients
        if ((!searchTerm && !query) && (limit || sort)) {
            return getRecentPatients(req, res);
        }
        
        // Get the actual search term from either searchTerm or query parameter
        const actualSearchTerm = searchTerm || query;
        
        if (!actualSearchTerm || actualSearchTerm.length < 3) {
            return res.status(400).json({ error: 'عبارت جستجو باید حداقل 3 کاراکتر باشد' });
        }

        const limitValue = limit ? parseInt(limit) : 50;
        const patients = await Patient.search(actualSearchTerm, limitValue);
        res.json({ patients });
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

const getRecentPatients = async (req, res) => {
    try {
        // استفاده از یک روش ساده‌تر برای دریافت بیماران اخیر
        const limit = parseInt(req.query.limit) || 5;
        const patients = await Patient.getAll({ limit });
        
        res.json({ patients });
    } catch (error) {
        console.error('Error getting recent patients:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات بیماران اخیر' });
    }
};

module.exports = {
    createPatient,
    searchPatients,
    getPatientById,
    getPatientByNationalId,
    updatePatient,
    getPatientVisitHistory,
    getRecentPatients
}; 