const { User, Roles } = require('../models/user.model');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { executeMasterQuery } = require('../config/database');

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
    const existingUser = await User.getByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: 'این نام کاربری قبلاً استفاده شده است' });
    }

    const existingEmail = await User.getByEmail(req.body.email);
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
      phoneNumber: req.body.phoneNumber || null,
      nationalId: req.body.nationalId || null,
      age: req.body.age || null,
      gender: req.body.gender || null,
      address: req.body.address || null,
      medicalLicenseNumber: req.body.medicalLicenseNumber || null,
      role: req.body.role
    };

    const userId = await User.create(userData);
    
    // Fetch the newly created user to return it in the response
    const newUser = await User.getById(userId);
    
    res.status(201).json({
      message: 'کاربر با موفقیت ایجاد شد',
      id: userId,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phoneNumber: newUser.phone_number,
      role: newUser.role,
      createdAt: newUser.created_at
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
      isActive: req.query.isActive === 'true' ? true : 
                req.query.isActive === 'false' ? false : undefined,
      search: req.query.search
    };

    const users = await User.getAll(filters);

    // Remove sensitive information
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return res.json({ users: sanitizedUsers });
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
    let clinicDbName = req.clinicDbName;
    
    // If super admin is querying a user
    if (req.user.isSuperAdmin) {
      // If clinicId is specified, use that clinic
      if (req.query.clinicId) {
        const clinicId = req.query.clinicId;
        
        // Get clinic database name for the specified clinicId
        const result = await executeMasterQuery(
          'SELECT id, name, db_name FROM clinics WHERE id = ?',
          [clinicId]
        );
        
        if (result.length === 0) {
          return res.status(404).json({ message: 'کلینیک مورد نظر یافت نشد' });
        }
        
        clinicDbName = result[0].db_name;
      } else {
        // If no clinicId is specified, try to find the user in all clinics
        const clinics = await executeMasterQuery(
          'SELECT id, name, db_name FROM clinics WHERE is_active = 1',
          []
        );
        
        if (clinics.length === 0) {
          return res.status(404).json({ message: 'هیچ کلینیکی یافت نشد' });
        }
        
        // Try to find the user in any clinic
        for (const clinic of clinics) {
          try {
            const user = await User.getById(req.params.id, clinic.db_name);
            
            if (user) {
              // User found in this clinic
              const { password, ...userWithoutPassword } = user;
              
              return res.json({ 
                user: {
                  ...userWithoutPassword,
                  clinicName: clinic.name,
                  clinicId: clinic.id
                } 
              });
            }
          } catch (error) {
            // Continue with next clinic
            console.error(`Error finding user in clinic ${clinic.id}:`, error);
          }
        }
        
        // If we get here, user was not found in any clinic
        return res.status(404).json({ message: 'کاربر یافت نشد' });
      }
    }
    
    // Regular flow - get user from specified clinic
    const user = await User.getById(req.params.id, clinicDbName);

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
    let clinicDbName = req.clinicDbName;
    
    // If super admin is updating a user from a specific clinic
    if (req.user.isSuperAdmin) {
      const clinicId = req.body.clinicId || req.query.clinicId;
      
      if (!clinicId) {
        return res.status(400).json({ message: 'شناسه کلینیک برای بروزرسانی کاربر الزامی است' });
      }
      
      // Get clinic database name for the specified clinicId
      const result = await executeMasterQuery(
        'SELECT id, name, db_name FROM clinics WHERE id = ?',
        [clinicId]
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'کلینیک مورد نظر یافت نشد' });
      }
      
      clinicDbName = result[0].db_name;
    }
    
    // Get current user data
    const currentUser = await User.getById(userId, clinicDbName);
    if (!currentUser) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    // Skip permission checks for super admin
    if (!req.user.isSuperAdmin) {
      // Check permissions
      const requestingUserRole = req.user.role;
      const targetUserRole = currentUser.role;
      const newRole = req.body.role;

      // Users can update their own profile
      const isSelfUpdate = req.user.id.toString() === userId.toString();

      // Check if user has permission to update this user
      if (
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
    }

    // Check if username is being changed and if it already exists
    if (req.body.username && req.body.username !== currentUser.username) {
      const existingUser = await User.getByUsername(req.body.username, clinicDbName);
      if (existingUser && existingUser.id !== parseInt(userId)) {
        return res.status(400).json({ message: 'این نام کاربری قبلاً استفاده شده است' });
      }
    }

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== currentUser.email) {
      const existingEmail = await User.getByEmail(req.body.email, clinicDbName);
      if (existingEmail && existingEmail.id !== parseInt(userId)) {
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

    const success = await User.update(userId, userData, clinicDbName);

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
    let clinicDbName = req.clinicDbName;
    
    // If super admin is deleting a user from a specific clinic
    if (req.user.isSuperAdmin) {
      const clinicId = req.query.clinicId;
      
      if (!clinicId) {
        return res.status(400).json({ message: 'شناسه کلینیک برای حذف کاربر الزامی است' });
      }
      
      // Get clinic database name for the specified clinicId
      const result = await executeMasterQuery(
        'SELECT id, name, db_name FROM clinics WHERE id = ?',
        [clinicId]
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'کلینیک مورد نظر یافت نشد' });
      }
      
      clinicDbName = result[0].db_name;
    }
    
    // Get current user data
    const currentUser = await User.getById(userId, clinicDbName);
    if (!currentUser) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }

    // Skip permission checks for super admin
    if (!req.user.isSuperAdmin) {
      // Check permissions
      const requestingUserRole = req.user.role;
      const targetUserRole = currentUser.role;

      // Check if user has permission to delete this user
      if (
        requestingUserRole !== Roles.ADMIN && 
        requestingUserRole !== Roles.CLINIC_MANAGER
      ) {
        return res.status(403).json({ message: 'شما مجوز حذف این کاربر را ندارید' });
      }

      // CLINIC_MANAGER can't delete ADMIN users
      if (
        requestingUserRole === Roles.CLINIC_MANAGER && 
        targetUserRole === Roles.ADMIN
      ) {
        return res.status(403).json({ message: 'شما مجوز حذف کاربر با نقش مدیر را ندارید' });
      }
    }

    // Prevent self-deletion
    if (req.user.id.toString() === userId.toString()) {
      return res.status(403).json({ message: 'شما نمی‌توانید حساب خود را حذف کنید' });
    }

    // Delete user (mark as inactive)
    const success = await User.markAsInactive(userId, clinicDbName);

    if (!success) {
      return res.status(404).json({ message: 'کاربر یافت نشد یا تغییری اعمال نشد' });
    }

    res.json({ message: 'کاربر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'خطا در حذف کاربر' });
  }
};

/**
 * Get clinic staff (excluding managers/admins)
 */
const getClinicStaff = async (req, res) => {
  try {
    // Get clinic ID from authenticated user's clinic
    const clinicId = req.clinic.id;
    
    // Get staff members (everyone except ADMIN and CLINIC_MANAGER)
    const filters = {
      excludeRoles: [Roles.ADMIN, Roles.CLINIC_MANAGER],
      clinicId,
      isActive: true
    };
    
    const staff = await User.getAllWithFilters(filters, req.clinicDbName);
    
    // Remove sensitive information
    const sanitizedStaff = staff.map(member => {
      const { password, ...staffWithoutPassword } = member;
      return staffWithoutPassword;
    });
    
    res.json({ staff: sanitizedStaff });
  } catch (error) {
    console.error('Get clinic staff error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کارکنان کلینیک' });
  }
};

/**
 * Get clinic managers filtered by clinic
 */
const getClinicManagers = async (req, res) => {
  try {
    let clinicId = req.clinic ? req.clinic.id : null;
    let clinicDbName = req.clinicDbName;
    
    // For super admin, can filter by clinicId
    if (req.user.isSuperAdmin && req.query.clinicId) {
      clinicId = req.query.clinicId;
      
      // Get clinic database name for the specified clinicId
      const result = await executeMasterQuery(
        'SELECT id, name, db_name FROM clinics WHERE id = ?',
        [clinicId]
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'کلینیک مورد نظر یافت نشد' });
      }
      
      clinicDbName = result[0].db_name;
    }
    
    // Get clinic managers only
    const filters = {
      role: Roles.CLINIC_MANAGER,
      clinicId,
      isActive: req.query.isActive === 'true' ? true : 
                req.query.isActive === 'false' ? false : undefined,
      search: req.query.search
    };
    
    const managers = await User.getAll(filters, clinicDbName);
    
    // Remove sensitive information
    const sanitizedManagers = managers.map(manager => {
      const { password, ...managerWithoutPassword } = manager;
      return managerWithoutPassword;
    });
    
    res.json({ managers: sanitizedManagers });
  } catch (error) {
    console.error('Get clinic managers error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات مدیران کلینیک' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getClinicStaff,
  getClinicManagers
}; 