const db = require('../config/database');

class Patient {
  static async create(patientData) {
    const [result] = await db.execute(
      `INSERT INTO patients (
        national_id,
        first_name,
        last_name,
        age,
        occupation,
        address,
        referral_source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        patientData.nationalId,
        patientData.firstName,
        patientData.lastName,
        patientData.age,
        patientData.occupation,
        patientData.address,
        patientData.referralSource
      ]
    );
    return result.insertId;
  }

  static async findByNationalId(nationalId) {
    const [rows] = await db.execute(
      'SELECT * FROM patients WHERE national_id = ?',
      [nationalId]
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

  static async search(query) {
    const [rows] = await db.execute(
      `SELECT * FROM patients 
       WHERE national_id LIKE ? 
       OR first_name LIKE ? 
       OR last_name LIKE ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows;
  }
}

module.exports = Patient; 