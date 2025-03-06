const { validationResult } = require('express-validator');
const Visit = require('../models/Visit');
const moment = require('moment-jalaali');

const createVisit = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const visitId = await Visit.create(req.body);
        const visit = await Visit.findById(visitId);

        res.status(201).json({
            message: 'ویزیت با موفقیت ثبت شد',
            visit: {
                ...visit,
                visit_date: moment(visit.visit_date).format('jYYYY/jMM/jDD')
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ثبت ویزیت' });
    }
};

const getDailyVisits = async (req, res) => {
    try {
        const { date } = req.query;
        // اگر تاریخ ارسال نشده باشد، از تاریخ امروز استفاده می‌کنیم
        const searchDate = date || moment().format('YYYY-MM-DD');

        const visits = await Visit.getDailyVisits(searchDate);
        
        // تبدیل تاریخ‌ها به شمسی
        const formattedVisits = visits.map(visit => ({
            ...visit,
            visit_date: moment(visit.visit_date).format('jYYYY/jMM/jDD')
        }));

        res.json(formattedVisits);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت لیست ویزیت‌ها' });
    }
};

const getVisitById = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        // تبدیل تاریخ به شمسی
        visit.visit_date = moment(visit.visit_date).format('jYYYY/jMM/jDD');
        
        res.json(visit);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات ویزیت' });
    }
};

const updateVisitStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { status } = req.body;
        const success = await Visit.updateStatus(req.params.id, status);
        
        if (!success) {
            return res.status(404).json({ error: 'ویزیت یافت نشد' });
        }

        res.json({ message: 'وضعیت ویزیت با موفقیت به‌روزرسانی شد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت ویزیت' });
    }
};

const addExamination = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const examinationId = await Visit.addExamination({
            visit_id: req.params.id,
            ...req.body
        });

        const examination = await Visit.getExamination(req.params.id);
        
        res.status(201).json({
            message: 'معاینه با موفقیت ثبت شد',
            examination
        });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ثبت معاینه' });
    }
};

const getExamination = async (req, res) => {
    try {
        const examination = await Visit.getExamination(req.params.id);
        if (!examination) {
            return res.status(404).json({ error: 'معاینه یافت نشد' });
        }
        res.json(examination);
    } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات معاینه' });
    }
};

module.exports = {
    createVisit,
    getDailyVisits,
    getVisitById,
    updateVisitStatus,
    addExamination,
    getExamination
}; 