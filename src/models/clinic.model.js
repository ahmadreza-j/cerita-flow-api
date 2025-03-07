const { executeMasterQuery, createClinicDatabase } = require('../config/database');

class Clinic {
  /**
   * Create a new clinic with its own database
   * @param {Object} clinicData - Clinic data
   * @returns {Promise<number>} Clinic ID
   */
  static async create(clinicData) {
    // Generate a database name from the clinic name
    const dbName = this.generateDatabaseName(clinicData.name);
    
    // Insert clinic record in master database
    const [result] = await executeMasterQuery(
      `INSERT INTO clinics (
        name,
        db_name,
        address,
        phone,
        manager_name,
        establishment_year,
        logo_url,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        clinicData.name,
        dbName,
        clinicData.address || null,
        clinicData.phone || null,
        clinicData.managerName || null,
        clinicData.establishmentYear || null,
        clinicData.logoUrl || null
      ]
    );
    
    const clinicId = result.insertId;
    
    // Create a new database for the clinic
    await createClinicDatabase(clinicData.name, dbName);
    
    return { id: clinicId, dbName };
  }
  
  /**
   * Generate a database name from clinic name
   * @param {string} clinicName - Clinic name
   * @returns {string} Database name
   */
  static generateDatabaseName(clinicName) {
    // Convert to lowercase, replace spaces with underscores, remove non-alphanumeric characters
    const baseName = clinicName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    // Add prefix and timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    return `optometry_${baseName}_${timestamp}`;
  }
  
  /**
   * Get clinic by ID
   * @param {number} id - Clinic ID
   * @returns {Promise<Object>} Clinic data
   */
  static async getById(id) {
    const [rows] = await executeMasterQuery(
      'SELECT * FROM clinics WHERE id = ?',
      [id]
    );
    return rows[0];
  }
  
  /**
   * Get clinic by database name
   * @param {string} dbName - Database name
   * @returns {Promise<Object>} Clinic data
   */
  static async getByDbName(dbName) {
    const [rows] = await executeMasterQuery(
      'SELECT * FROM clinics WHERE db_name = ?',
      [dbName]
    );
    return rows[0];
  }
  
  /**
   * Get all clinics
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of clinics
   */
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM clinics WHERE 1=1';
    const values = [];
    
    if (filters.isActive !== undefined) {
      query += ' AND is_active = ?';
      values.push(filters.isActive);
    }
    
    if (filters.search) {
      query += ' AND (name LIKE ? OR address LIKE ? OR manager_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await executeMasterQuery(query, values);
    return rows;
  }
  
  /**
   * Update clinic information
   * @param {number} id - Clinic ID
   * @param {Object} clinicData - Updated clinic data
   * @returns {Promise<boolean>} Success status
   */
  static async update(id, clinicData) {
    const updateFields = [];
    const values = [];
    
    if (clinicData.name) {
      updateFields.push('name = ?');
      values.push(clinicData.name);
    }
    
    if (clinicData.address) {
      updateFields.push('address = ?');
      values.push(clinicData.address);
    }
    
    if (clinicData.phone) {
      updateFields.push('phone = ?');
      values.push(clinicData.phone);
    }
    
    if (clinicData.managerName) {
      updateFields.push('manager_name = ?');
      values.push(clinicData.managerName);
    }
    
    if (clinicData.establishmentYear) {
      updateFields.push('establishment_year = ?');
      values.push(clinicData.establishmentYear);
    }
    
    if (clinicData.logoUrl) {
      updateFields.push('logo_url = ?');
      values.push(clinicData.logoUrl);
    }
    
    if (clinicData.isActive !== undefined) {
      updateFields.push('is_active = ?');
      values.push(clinicData.isActive);
    }
    
    if (updateFields.length === 0) return false;
    
    values.push(id);
    
    const [result] = await executeMasterQuery(
      `UPDATE clinics SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }
  
  /**
   * Delete a clinic (mark as inactive)
   * @param {number} id - Clinic ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const [result] = await executeMasterQuery(
      'UPDATE clinics SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Clinic; 