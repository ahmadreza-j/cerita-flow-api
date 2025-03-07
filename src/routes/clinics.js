const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const clinicController = require('../controllers/clinic.controller');

// Get all active clinics (public route for clinic selection)
router.get('/', async (req, res) => {
  try {
    // Only return active clinics with minimal information
    const clinics = await clinicController.getPublicClinics();
    res.json({ clinics });
  } catch (error) {
    console.error('Get public clinics error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات مطب‌ها' });
  }
});

module.exports = router; 