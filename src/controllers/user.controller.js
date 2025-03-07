const { User, Roles } = require('../models/user.model');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

/**
 * Create a new user
 */
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to create users with this role
    const requestingUserRole = req.user.role;
    const newUserRole = req.body.role;

    // Only ADMIN and CLINIC_MANAGER can create users
    if (
      !req.user.isSuperAdmin && 
      requestingUserRole !== Roles.ADMIN && 
      requestingUserRole !== Roles.CLINIC_MANAGER
    ) {
      return res.status(403).json({ message: 'شما مجوز ایجاد کاربر جدید را ندارید' });
    }

    // CLINIC_MANAGER can't create ADMIN users
    if (
      requestingUserRole === Roles.CLINIC_MANAGER && 
      newUserRole === Roles.ADMIN
    ) {
      return res.status(403).json({ message: 'شما مجوز ایجاد کاربر با نقش مدیر را ندارید' });
    }

    // Check if username or email already exists
    const existingUser = await User.getByUsername(req.body.username, req.clinicDbName);
    if (existingUser) {
      return res.status(400).json({ message: 'این نام کاربری قبلاً استفاده شده است' });
    }

    const existingEmail = await User.getByEmail(req.body.email, req.clinicDbName);
    if (existingEmail) {
      return res.status(400).json({ message: 'این ایمیل قبلاً استفاده شده است' });
    }

    // Create user
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password, // Will be hashed in the model
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      nationalId: req.body.nationalId,
      age: req.body.age,
      gender: req.body.gender,
      address: req.body.address,
      medicalLicenseNumber: req.body.medicalLicenseNumber,
      role: req.body.role,
      clinicId: req.clinic.id
    };

    const userId = await User.create(userData, req.clinicDbName);

    res.status(201).json({
      message: 'کاربر با موفقیت ایجاد شد',
      userId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'خطا در ایجاد کاربر' });
  }
};

/**
 * Get all users
 */
const getAllUsers = async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      clinicId: req.clinic.id,
      isActive: req.query.isActive === 'true' ? true : 
                req.query.isActive === 'false' ? false : undefined,
      search: req.query.search
    };

    const users = await User.getAll(filters, req.clinicDbName);

    // Remove sensitive information
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کاربران' });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.getById(req.params.id, req.clinicDbName);

    if (!user) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کاربر' });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    
    // Get current user data
    const currentUser = await User.getById(userId, req.clinicDbName);
    if (!currentUser) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    // Check permissions
    const requestingUserRole = req.user.role;
    const targetUserRole = currentUser.role;
    const newRole = req.body.role;

    // Users can update their own profile
    const isSelfUpdate = req.user.id.toString() === userId.toString();

    // Check if user has permission to update this user
    if (
      !req.user.isSuperAdmin && 
      !isSelfUpdate && 
      requestingUserRole !== Roles.ADMIN && 
      requestingUserRole !== Roles.CLINIC_MANAGER
    ) {
      return res.status(403).json({ message: 'شما مجوز ویرایش این کاربر را ندارید' });
    }

    // CLINIC_MANAGER can't update ADMIN users
    if (
      requestingUserRole === Roles.CLINIC_MANAGER && 
      targetUserRole === Roles.ADMIN
    ) {
      return res.status(403).json({ message: 'شما مجوز ویرایش کاربر با نقش مدیر را ندارید' });
    }

    // CLINIC_MANAGER can't change a user's role to ADMIN
    if (
      requestingUserRole === Roles.CLINIC_MANAGER && 
      newRole === Roles.ADMIN
    ) {
      return res.status(403).json({ message: 'شما مجوز تغییر نقش کاربر به مدیر را ندارید' });
    }

    // Regular users can only update their own profile and can't change their role
    if (isSelfUpdate && req.body.role && req.body.role !== currentUser.role) {
      return res.status(403).json({ message: 'شما مجوز تغییر نقش خود را ندارید' });
    }

    // Check if username is being changed and if it already exists
    if (req.body.username && req.body.username !== currentUser.username) {
      const existingUser = await User.getByUsername(req.body.username, req.clinicDbName);
      if (existingUser) {
        return res.status(400).json({ message: 'این نام کاربری قبلاً استفاده شده است' });
      }
    }

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== currentUser.email) {
      const existingEmail = await User.getByEmail(req.body.email, req.clinicDbName);
      if (existingEmail) {
        return res.status(400).json({ message: 'این ایمیل قبلاً استفاده شده است' });
      }
    }

    // Update user
    const userData = {
      username: req.body.username,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      nationalId: req.body.nationalId,
      age: req.body.age,
      gender: req.body.gender,
      address: req.body.address,
      medicalLicenseNumber: req.body.medicalLicenseNumber,
      role: req.body.role,
      isActive: req.body.isActive
    };

    // Only include password if it's provided
    if (req.body.password) {
      userData.password = req.body.password;
    }

    const success = await User.update(userId, userData, req.clinicDbName);

    if (!success) {
      return res.status(404).json({ message: 'کاربر یافت نشد یا تغییری اعمال نشد' });
    }

    res.json({ message: 'کاربر با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'خطا در به‌روزرسانی کاربر' });
  }
};

/**
 * Delete user (mark as inactive)
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get current user data
    const currentUser = await User.getById(userId, req.clinicDbName);
    if (!currentUser) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    // Check permissions
    const requestingUserRole = req.user.role;
    const targetUserRole = currentUser.role;

    // Check if user has permission to delete this user
    if (
      !req.user.isSuperAdmin && 
      requestingUserRole !== Roles.ADMIN && 
      requestingUserRole !== Roles.CLINIC_MANAGER
    ) {
      return res.status(403).json({ message: 'شما مجوز حذف کاربر را ندارید' });
    }

    // CLINIC_MANAGER can't delete ADMIN users
    if (
      requestingUserRole === Roles.CLINIC_MANAGER && 
      targetUserRole === Roles.ADMIN
    ) {
      return res.status(403).json({ message: 'شما مجوز حذف کاربر با نقش مدیر را ندارید' });
    }

    // Users can't delete themselves
    if (req.user.id.toString() === userId.toString()) {
      return res.status(403).json({ message: 'شما نمی‌توانید حساب کاربری خود را حذف کنید' });
    }

    const success = await User.delete(userId, req.clinicDbName);

    if (!success) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    res.json({ message: 'کاربر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'خطا در حذف کاربر' });
  }
};

/**
 * Get clinic staff
 */
const getClinicStaff = async (req, res) => {
  try {
    const users = await User.getClinicStaff(req.clinic.id, req.clinicDbName);

    // Remove sensitive information
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Get clinic staff error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کارکنان مطب' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getClinicStaff
}; 