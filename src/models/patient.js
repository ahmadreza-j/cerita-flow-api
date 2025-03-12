const { executeCeritaQuery } = require('../config/database');
const { generatePersianDate } = require('../utils/dateUtils');

class Patient {
  static async create(patientData) {
    try {
      // Generate a unique file number if not provided
      const fileNumber = patientData.fileNumber || patientData.file_number || await this.generateUniqueFileNumber();
      const currentDate = generatePersianDate();
      
      const [result] = await executeCeritaQuery(
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
          referral_source,
          registration_date,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          fileNumber,
          patientData.nationalId || patientData.national_id,
          patientData.firstName || patientData.first_name,
          patientData.lastName || patientData.last_name,
          patientData.birthDate || patientData.birth_date || null,
          patientData.age || null,
          patientData.gender || null,
          patientData.occupation || null,
          patientData.address || null,
          patientData.phone || null,
          patientData.referralSource || patientData.referral_source || null,
          patientData.registrationDate || patientData.registration_date || currentDate
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error in Patient.create:', error);
      throw error;
    }
  }

  static async findByNationalId(nationalId) {
    try {
      const [rows] = await executeCeritaQuery(
        'SELECT * FROM patients WHERE national_id = ?',
        [nationalId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding patient by national ID:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await executeCeritaQuery(
        'SELECT * FROM patients WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding patient by ID:', error);
      throw error;
    }
  }

  static async generateUniqueFileNumber() {
    try {
      // Get current year in Persian calendar (e.g., 1403)
      const currentYear = generatePersianDate().substring(0, 4);
      
      // Get the count of patients registered this year
      const [rows] = await executeCeritaQuery(
        `SELECT COUNT(*) as count FROM patients 
         WHERE registration_date LIKE ?`,
        [`${currentYear}%`]
      );
      
      const count = rows[0].count + 1;
      // Format: YYYY-XXXXX (e.g., 1403-00001)
      return `${currentYear}-${count.toString().padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating file number:', error);
      throw error;
    }
  }
}

module.exports = Patient; 