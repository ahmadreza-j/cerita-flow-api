const db = require('../config/database');
const { generatePersianDate } = require('../utils/dateUtils');

class Patient {
  static async create(patientData) {
    const [result] = await db.execute(
      `INSERT INTO patients (
        file_number,
        national_id,
        first_name,
        last_name,
        birth_date,
        age,
        gender,
        occupation,
        address,
        phone,
        email,
        referral_source,
        registration_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        patientData.fileNumber,
        patientData.nationalId,
        patientData.firstName,
        patientData.lastName,
        patientData.birthDate,
        patientData.age,
        patientData.gender,
        patientData.occupation,
        patientData.address,
        patientData.phone,
        patientData.email,
        patientData.referralSource,
        patientData.registrationDate
      ]
    );
    return result.insertId;
  }

  static async generateUniqueFileNumber() {
    // Get current year in Persian calendar (e.g., 1403)
    const currentYear = generatePersianDate().substring(0, 4);
    
    // Get the count of patients registered this year
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM patients 
       WHERE registration_date LIKE ?`,
      [`${currentYear}%`]
    );
    
    const count = rows[0].count + 1;
    // Format: YYYY-XXXXX (e.g., 1403-00001)
    return `${currentYear}-${count.toString().padStart(5, '0')}`;
  }

  static async findByNationalId(nationalId) {
    const [rows] = await db.execute(
      'SELECT * FROM patients WHERE national_id = ?',
      [nationalId]
    );
    return rows[0];
  }

  static async findByFileNumber(fileNumber) {
    const [rows] = await db.execute(
      'SELECT * FROM patients WHERE file_number = ?',
      [fileNumber]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM patients WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async search(searchTerm) {
    const [rows] = await db.execute(
      `SELECT * FROM patients 
       WHERE 
          file_number LIKE ? OR 
          national_id LIKE ? OR 
          first_name LIKE ? OR 
          last_name LIKE ? OR 
          phone LIKE ?
       ORDER BY created_at DESC
       LIMIT 50`,
      Array(5).fill(`%${searchTerm}%`)
    );
    return rows;
  }
  
  static async update(id, patientData) {
    const updateFields = [];
    const values = [];

    if (patientData.firstName) {
      updateFields.push('first_name = ?');
      values.push(patientData.firstName);
    }
    if (patientData.lastName) {
      updateFields.push('last_name = ?');
      values.push(patientData.lastName);
    }
    if (patientData.nationalId) {
      updateFields.push('national_id = ?');
      values.push(patientData.nationalId);
    }
    if (patientData.age) {
      updateFields.push('age = ?');
      values.push(patientData.age);
    }
    if (patientData.gender) {
      updateFields.push('gender = ?');
      values.push(patientData.gender);
    }
    if (patientData.occupation) {
      updateFields.push('occupation = ?');
      values.push(patientData.occupation);
    }
    if (patientData.address) {
      updateFields.push('address = ?');
      values.push(patientData.address);
    }
    if (patientData.phone) {
      updateFields.push('phone = ?');
      values.push(patientData.phone);
    }
    if (patientData.email) {
      updateFields.push('email = ?');
      values.push(patientData.email);
    }
    if (patientData.referralSource) {
      updateFields.push('referral_source = ?');
      values.push(patientData.referralSource);
    }

    if (updateFields.length === 0) return false;

    values.push(id);
    
    const [result] = await db.execute(
      `UPDATE patients SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }
  
  static async getAll(filters = {}) {
    let query = `
      SELECT * FROM patients 
      WHERE 1=1
    `;
    const values = [];

    if (filters.search) {
      query += ` AND (
        file_number LIKE ? OR 
        national_id LIKE ? OR 
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        phone LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, values);
    return rows;
  }
  
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM patients WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Patient; 