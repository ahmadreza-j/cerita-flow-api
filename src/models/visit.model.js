const db = require('../config/database');

class Visit {
  static async create(visitData) {
    const [result] = await db.execute(
      `INSERT INTO visits (
        patient_id,
        visit_date,
        created_by,
        status,
        created_at
      ) VALUES (?, NOW(), ?, 'pending', NOW())`,
      [
        visitData.patientId,
        visitData.createdBy
      ]
    );
    return result.insertId;
  }

  static async updateExamination(visitId, examinationData) {
    await db.execute(
      `UPDATE visits SET
        visual_acuity_right = ?,
        visual_acuity_left = ?,
        prescription_needed = ?,
        right_eye_sphere = ?,
        right_eye_cylinder = ?,
        right_eye_axis = ?,
        left_eye_sphere = ?,
        left_eye_cylinder = ?,
        left_eye_axis = ?,
        doctor_notes = ?,
        examined_by = ?,
        examination_date = NOW(),
        status = 'examined'
      WHERE id = ?`,
      [
        examinationData.visualAcuityRight,
        examinationData.visualAcuityLeft,
        examinationData.prescriptionNeeded,
        examinationData.rightEyeSphere,
        examinationData.rightEyeCylinder,
        examinationData.rightEyeAxis,
        examinationData.leftEyeSphere,
        examinationData.leftEyeCylinder,
        examinationData.leftEyeAxis,
        examinationData.doctorNotes,
        examinationData.examinedBy,
        visitId
      ]
    );
  }

  static async getPatientVisits(patientId) {
    const [rows] = await db.execute(
      `SELECT v.*, 
        u1.full_name as creator_name,
        u2.full_name as examiner_name
       FROM visits v
       LEFT JOIN users u1 ON v.created_by = u1.id
       LEFT JOIN users u2 ON v.examined_by = u2.id
       WHERE v.patient_id = ?
       ORDER BY v.visit_date DESC`,
      [patientId]
    );
    return rows;
  }

  static async getPendingVisits() {
    const [rows] = await db.execute(
      `SELECT v.*, 
        p.first_name,
        p.last_name,
        p.national_id
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.status = 'pending'
       ORDER BY v.visit_date ASC`
    );
    return rows;
  }
}

module.exports = Visit; 