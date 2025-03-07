const db = require('../config/database');
const { generatePersianDate } = require('../utils/dateUtils');

class Patient {
  static async create(patientData) {
    // Generate a unique file number
    const fileNumber = await this.generateUniqueFileNumber();
    
    // Get current Persian date
    const registrationDate = generatePersianDate();
    
    const [result] = await db.execute(
      `INSERT INTO patients (
        file_number,
        national_id,
        first_name,
        last_name,
        age,
        gender,
        occupation,
        address,
        phone,
        email,
        referral_source,
        clinic_id,
        registration_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        fileNumber,
        patientData.nationalId,
        patientData.firstName,
        patientData.lastName,
        patientData.age,
        patientData.gender,
        patientData.occupation,
        patientData.address,
        patientData.phone,
        patientData.email,
        patientData.referralSource,
        patientData.clinicId,
        registrationDate
      ]
    );
    return { id: result.insertId, fileNumber };
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

  static async search(query, clinicId) {
    const [rows] = await db.execute(
      `SELECT * FROM patients 
       WHERE (national_id LIKE ? 
       OR first_name LIKE ? 
       OR last_name LIKE ?
       OR file_number LIKE ?)
       AND clinic_id = ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, clinicId]
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
  
  static async getAll(clinicId, limit = 100) {
    const [rows] = await db.execute(
      `SELECT * FROM patients 
       WHERE clinic_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [clinicId, limit]
    );
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