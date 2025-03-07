const { executeMasterQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class SuperAdmin {
  /**
   * Create a new super admin
   * @param {Object} adminData - Super admin data
   * @returns {Promise<number>} Super admin ID
   */
  static async create(adminData) {
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    const [result] = await executeMasterQuery(
      `INSERT INTO super_admins (
        username,
        email,
        password,
        first_name,
        last_name,
        phone_number,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        adminData.username,
        adminData.email,
        hashedPassword,
        adminData.firstName,
        adminData.lastName,
        adminData.phoneNumber || null
      ]
    );
    
    return result.insertId;
  }
  
  /**
   * Get super admin by ID
   * @param {number} id - Super admin ID
   * @returns {Promise<Object>} Super admin data
   */
  static async getById(id) {
    const [rows] = await executeMasterQuery(
      `SELECT id, username, email, first_name, last_name, 
              phone_number, is_active, created_at, updated_at
       FROM super_admins 
       WHERE id = ?`,
      [id]
    );
    return rows[0];
  }
  
  /**
   * Get super admin by email
   * @param {string} email - Super admin email
   * @returns {Promise<Object>} Super admin data
   */
  static async getByEmail(email) {
    const [rows] = await executeMasterQuery(
      'SELECT * FROM super_admins WHERE email = ?',
      [email]
    );
    return rows[0];
  }
  
  /**
   * Get super admin by username
   * @param {string} username - Super admin username
   * @returns {Promise<Object>} Super admin data
   */
  static async getByUsername(username) {
    const [rows] = await executeMasterQuery(
      'SELECT * FROM super_admins WHERE username = ?',
      [username]
    );
    return rows[0];
  }
  
  /**
   * Get all super admins
   * @returns {Promise<Array>} List of super admins
   */
  static async getAll() {
    const [rows] = await executeMasterQuery(
      `SELECT id, username, email, first_name, last_name, 
              phone_number, is_active, created_at, updated_at
       FROM super_admins
       ORDER BY created_at DESC`
    );
    return rows;
  }
  
  /**
   * Update super admin information
   * @param {number} id - Super admin ID
   * @param {Object} adminData - Updated super admin data
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, adminData) {
    const updateFields = [];
    const values = [];
    
    if (adminData.firstName) {
      updateFields.push('first_name = ?');
      values.push(adminData.firstName);
    }
    
    if (adminData.lastName) {
      updateFields.push('last_name = ?');
      values.push(adminData.lastName);
    }
    
    if (adminData.email) {
      updateFields.push('email = ?');
      values.push(adminData.email);
    }
    
    if (adminData.phoneNumber) {
      updateFields.push('phone_number = ?');
      values.push(adminData.phoneNumber);
    }
    
    if (adminData.isActive !== undefined) {
      updateFields.push('is_active = ?');
      values.push(adminData.isActive);
    }
    
    if (adminData.password) {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      updateFields.push('password = ?');
      values.push(hashedPassword);
    }
    
    if (updateFields.length === 0) return false;
    
    values.push(id);
    
    const [result] = await executeMasterQuery(
      `UPDATE super_admins SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }
  
  /**
   * Delete a super admin (mark as inactive)
   * @param {number} id - Super admin ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const [result] = await executeMasterQuery(
      'UPDATE super_admins SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
  
  /**
   * Validate super admin password
   * @param {Object} admin - Super admin object
   * @param {string} password - Password to validate
   * @returns {Promise<boolean>} Validation result
   */
  static async validatePassword(admin, password) {
    return bcrypt.compare(password, admin.password);
  }
}

module.exports = SuperAdmin; 