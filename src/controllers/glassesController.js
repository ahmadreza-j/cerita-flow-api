const { validationResult } = require('express-validator');
const Glasses = require('../models/Glasses');
const moment = require('moment-jalaali');

const createGlasses = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // اضافه کردن شناسه عینک‌ساز به داده‌ها
        const glassesData = {
            ...req.body,
            optician_id: req.user.id
        };

        await Glasses.create(glassesData);
        const glasses = await Glasses.findByVisitId(req.body.visit_id);

        res.status(201).json({
            message: 'اطلاعات عینک با موفقیت ثبت شد',
            glasses
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ثبت اطلاعات عینک' });
    }
};

const getGlassesByVisitId = async (req, res) => {
    try {
        const glasses = await Glasses.findByVisitId(req.params.visitId);
        if (!glasses) {
            return res.status(404).json({ error: 'اطلاعات عینک یافت نشد' });
        }
        res.json(glasses);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات عینک' });
    }
};

const getDailyPrescriptions = async (req, res) => {
    try {
        const { date } = req.query;
        // اگر تاریخ ارسال نشده باشد، از تاریخ امروز استفاده می‌کنیم
        const searchDate = date || moment().format('YYYY-MM-DD');

        const prescriptions = await Glasses.getDailyPrescriptions(searchDate);
        
        // تبدیل تاریخ‌ها به شمسی
        const formattedPrescriptions = prescriptions.map(prescription => ({
            ...prescription,
            visit_date: moment(prescription.visit_date).format('jYYYY/jMM/jDD')
        }));

        res.json(formattedPrescriptions);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت لیست نسخه‌های عینک' });
    }
};

const getPatientGlassesHistory = async (req, res) => {
    try {
        const history = await Glasses.getPatientGlassesHistory(req.params.patientId);
        
        // تبدیل تاریخ‌ها به شمسی
        const formattedHistory = history.map(record => ({
            ...record,
            visit_date: moment(record.visit_date).format('jYYYY/jMM/jDD')
        }));

        res.json(formattedHistory);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت تاریخچه عینک‌های بیمار' });
    }
};

module.exports = {
    createGlasses,
    getGlassesByVisitId,
    getDailyPrescriptions,
    getPatientGlassesHistory
}; 