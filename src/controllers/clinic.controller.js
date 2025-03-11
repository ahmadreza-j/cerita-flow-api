const Clinic = require('../models/clinic.model');
const { validationResult } = require('express-validator');

/**
 * Create a new clinic
 */
const createClinic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('Creating new clinic with data:', req.body);
    
    const clinicData = {
      name: req.body.name,
      englishName: req.body.englishName,
      address: req.body.address,
      phone: req.body.phone,
      managerName: req.body.managerName,
      establishmentYear: req.body.establishmentYear,
      logoUrl: req.body.logoUrl
    };

    const result = await Clinic.create(clinicData);
    console.log('Clinic created successfully:', result);

    res.status(201).json({
      message: 'کلینیک با موفقیت ایجاد شد',
      clinic: {
        id: result.id,
        name: clinicData.name,
        englishName: clinicData.englishName,
        dbName: result.dbName
      }
    });
  } catch (error) {
    console.error('Create clinic error:', error);
    
    // Handle specific error types
    if (error.code === 'ER_DUPLICATE_ENGLISH_NAME' || error.code === 'ER_DUPLICATE_DATABASE') {
      // Send appropriate error message for duplicate english name or database
      return res.status(409).json({ message: error.message });
    }
    
    // Handle MySQL duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'نام کلینیک یا نام دیتابیس تکراری است. لطفاً نام دیگری انتخاب کنید'
      });
    }
    
    // For all other errors
    const errorMessage = error.message || 'خطا در ایجاد کلینیک';
    res.status(500).json({ 
      message: 'خطا در ایجاد کلینیک', 
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

/**
 * Get all clinics
 */
const getAllClinics = async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : 
                req.query.isActive === 'false' ? false : undefined,
      search: req.query.search
    };

    const clinics = await Clinic.getAll(filters);

    res.json({ clinics });
  } catch (error) {
    console.error('Get all clinics error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کلینیک‌ها' });
  }
};

/**
 * Get clinic by ID
 */
const getClinicById = async (req, res) => {
  try {
    const clinic = await Clinic.getById(req.params.id);

    if (!clinic) {
      return res.status(404).json({ message: 'کلینیک یافت نشد' });
    }

    res.json({ clinic });
  } catch (error) {
    console.error('Get clinic by ID error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کلینیک' });
  }
};

/**
 * Update clinic
 */
const updateClinic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const clinicData = {
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      managerName: req.body.managerName,
      establishmentYear: req.body.establishmentYear,
      logoUrl: req.body.logoUrl,
      isActive: req.body.isActive
    };

    const success = await Clinic.update(req.params.id, clinicData);

    if (!success) {
      return res.status(404).json({ message: 'کلینیک یافت نشد یا تغییری اعمال نشد' });
    }

    res.json({ message: 'کلینیک با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({ message: 'خطا در به‌روزرسانی کلینیک' });
  }
};

/**
 * Delete clinic (mark as inactive)
 */
const deleteClinic = async (req, res) => {
  try {
    const success = await Clinic.delete(req.params.id);

    if (!success) {
      return res.status(404).json({ message: 'کلینیک یافت نشد' });
    }

    res.json({ message: 'کلینیک با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({ message: 'خطا در حذف کلینیک' });
  }
};

/**
 * Get public clinics for clinic selection
 */
const getPublicClinics = async () => {
  // Only return active clinics with minimal information
  const clinics = await Clinic.getAll({ isActive: true });
  
  return clinics.map(clinic => ({
    id: clinic.id,
    name: clinic.name,
    address: clinic.address
  }));
};

module.exports = {
  createClinic,
  getAllClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
  getPublicClinics
}; 