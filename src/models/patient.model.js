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

  static async findByFileNumber(fileNumber) {
    try {
      const [rows] = await executeCeritaQuery(
        'SELECT * FROM patients WHERE file_number = ?',
        [fileNumber]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding patient by file number:', error);
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

  static async search(searchTerm, limit = 50) {
    try {
      const searchPattern = `%${searchTerm}%`;
      const [rows] = await executeCeritaQuery(
        `SELECT * FROM patients 
         WHERE 
            file_number LIKE ? OR 
            national_id LIKE ? OR 
            first_name LIKE ? OR 
            last_name LIKE ? OR 
            phone LIKE ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error searching patients:', error);
      throw error;
    }
  }
  
  static async update(id, patientData) {
    try {
      const updateFields = [];
      const values = [];

      if (patientData.firstName || patientData.first_name) {
        updateFields.push('first_name = ?');
        values.push(patientData.firstName || patientData.first_name);
      }
      if (patientData.lastName || patientData.last_name) {
        updateFields.push('last_name = ?');
        values.push(patientData.lastName || patientData.last_name);
      }
      if (patientData.nationalId || patientData.national_id) {
        updateFields.push('national_id = ?');
        values.push(patientData.nationalId || patientData.national_id);
      }
      // Handle age specifically to allow null values
      if (patientData.age !== undefined) {
        updateFields.push('age = ?');
        values.push(patientData.age);
      }
      // Handle gender specifically to allow null values
      if (patientData.gender !== undefined) {
        updateFields.push('gender = ?');
        values.push(patientData.gender);
      }
      if (patientData.occupation || patientData.occupation === null) {
        updateFields.push('occupation = ?');
        values.push(patientData.occupation);
      }
      if (patientData.address || patientData.address === null) {
        updateFields.push('address = ?');
        values.push(patientData.address);
      }
      if (patientData.phone || patientData.phone === null) {
        updateFields.push('phone = ?');
        values.push(patientData.phone);
      }
      if (patientData.referralSource || patientData.referral_source || patientData.referralSource === null || patientData.referral_source === null) {
        updateFields.push('referral_source = ?');
        values.push(patientData.referralSource || patientData.referral_source);
      }

      if (updateFields.length === 0) return false;

      values.push(id);
      
      const [result] = await executeCeritaQuery(
        `UPDATE patients SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }
  
  static async getAll(filters = {}) {
    try {
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
      
      // اضافه کردن محدودیت تعداد نتایج
      if (filters.limit) {
        query += ` LIMIT ${parseInt(filters.limit)}`;
      }

      const [rows] = await executeCeritaQuery(query, values);
      return rows;
    } catch (error) {
      console.error('Error getting all patients:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      const [result] = await executeCeritaQuery(
        'DELETE FROM patients WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }
  
  static async getVisitHistory(patientId) {
    try {
      const [rows] = await executeCeritaQuery(
        `SELECT v.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
         FROM visits v
         LEFT JOIN users u ON v.doctor_id = u.id
         WHERE v.patient_id = ?
         ORDER BY v.visit_date DESC`,
        [patientId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting visit history:', error);
      throw error;
    }
  }

  static async getRecent(limit = 5, sortBy = 'created_at') {
    try {
      // تبدیل limit به عدد صحیح
      const limitNum = parseInt(limit);
      
      // استفاده از کوئری ساده بدون پارامتر LIMIT
      let query = '';
      
      if (sortBy === 'lastVisit') {
        query = `
          SELECT p.* 
          FROM patients p
          ORDER BY p.created_at DESC
          LIMIT 10
        `;
      } else {
        query = `SELECT * FROM patients ORDER BY created_at DESC LIMIT 10`;
      }
      
      const [rows] = await executeCeritaQuery(query, []);
      
      // محدود کردن نتایج در سمت برنامه
      return rows.slice(0, limitNum);
    } catch (error) {
      console.error('Error getting recent patients:', error);
      // در صورت خطا، یک آرایه خالی برمی‌گردانیم
      return [];
    }
  }
}

module.exports = Patient; 