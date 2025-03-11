const jwt = require('jsonwebtoken');
const { User, Roles } = require('../models/user.model');
const SuperAdmin = require('../models/superAdmin.model');
const Clinic = require('../models/clinic.model');
const { validationResult } = require('express-validator');

/**
 * Super admin login
 */
const superAdminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find super admin by username
    const superAdmin = await SuperAdmin.getByUsername(username);
    if (!superAdmin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if super admin is active
    if (!superAdmin.is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Validate password
    const isPasswordValid = await SuperAdmin.validatePassword(superAdmin, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: superAdmin.id,
        isSuperAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        firstName: superAdmin.first_name,
        lastName: superAdmin.last_name,
        isSuperAdmin: true
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * User login for a specific clinic
 */
const userLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, clinicId } = req.body;

    // Find clinic by ID
    const clinic = await Clinic.getById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    // Check if clinic is active
    if (!clinic.is_active) {
      return res.status(401).json({ message: 'Clinic is inactive' });
    }

    // Find user by username in the clinic's database
    const user = await User.getByUsername(username, clinic.db_name);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Validate password
    const isPasswordValid = await User.validatePassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Return user info and token
    res.json({
      message: 'ورود موفقیت‌آمیز',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phoneNumber: user.phone_number
      },
      token
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    // User info is already in req.user from auth middleware
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    if (req.user.isSuperAdmin) {
      // Super admin password change
      const superAdmin = await SuperAdmin.getById(req.user.id);
      
      // Validate current password
      const isPasswordValid = await SuperAdmin.validatePassword(superAdmin, currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      await SuperAdmin.update(req.user.id, { password: newPassword });
    } else {
      // Regular user password change
      const user = await User.getById(req.user.id, req.clinicDbName);
      
      // Validate current password
      const isPasswordValid = await User.validatePassword(user, currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      await User.update(req.user.id, { password: newPassword }, req.clinicDbName);
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  superAdminLogin,
  userLogin,
  getProfile,
  changePassword
}; 