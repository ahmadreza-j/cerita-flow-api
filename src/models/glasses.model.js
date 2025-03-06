const db = require('../config/database');

class Glasses {
  static async create(glassesData) {
    const [result] = await db.execute(
      `INSERT INTO glasses (
        visit_id,
        frame_code,
        lens_type,
        lens_features,
        frame_price,
        lens_price,
        total_price,
        sold_by,
        sale_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        glassesData.visitId,
        glassesData.frameCode,
        glassesData.lensType,
        glassesData.lensFeatures,
        glassesData.framePrice,
        glassesData.lensPrice,
        glassesData.framePrice + glassesData.lensPrice,
        glassesData.soldBy
      ]
    );
    return result.insertId;
  }

  static async getPatientGlasses(patientId) {
    const [rows] = await db.execute(
      `SELECT g.*, 
        v.visit_date,
        u.full_name as optician_name
       FROM glasses g
       JOIN visits v ON g.visit_id = v.id
       JOIN users u ON g.sold_by = u.id
       WHERE v.patient_id = ?
       ORDER BY g.sale_date DESC`,
      [patientId]
    );
    return rows;
  }

  static async getDailyPrescriptions() {
    const [rows] = await db.execute(
      `SELECT g.*, 
        v.visit_date,
        p.first_name,
        p.last_name,
        p.national_id,
        u.full_name as doctor_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN users u ON v.examined_by = u.id
       LEFT JOIN glasses g ON v.id = g.visit_id
       WHERE v.status = 'examined' 
       AND v.prescription_needed = true
       AND DATE(v.examination_date) = CURDATE()
       AND g.id IS NULL
       ORDER BY v.examination_date ASC`
    );
    return rows;
  }
}

module.exports = Glasses; 