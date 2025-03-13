const { executeCeritaQuery } = require('../config/database');
const { generatePersianDate, generatePersianTime } = require('../utils/dateUtils');

class Visit {
  static async create(visitData) {
    const persianDate = generatePersianDate();
    const persianTime = generatePersianTime();
    
    const [result] = await executeCeritaQuery(
      `INSERT INTO visits (
        patient_id,
        visit_date,
        visit_time,
        chief_complaint,
        status,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        visitData.patientId,
        persianDate,
        persianTime,
        visitData.chiefComplaint || null,
        visitData.createdBy
      ]
    );
    return result.insertId;
  }

  static async updateExamination(visitId, examinationData) {
    const examinationDate = generatePersianDate();
    
    await executeCeritaQuery(
      `UPDATE visits SET
        doctor_id = ?,
        status = 'completed'
      WHERE id = ?`,
      [
        examinationData.examinedBy,
        visitId
      ]
    );
    
    const [result] = await executeCeritaQuery(
      `INSERT INTO eye_examinations (
        visit_id,
        right_sphere,
        right_cylinder,
        right_axis,
        right_va,
        right_add,
        left_sphere,
        left_cylinder,
        left_axis,
        left_va,
        left_add,
        pd,
        near_pd,
        needs_glasses,
        needs_referral,
        needs_special_care,
        notes,
        examined_by,
        examination_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        visitId,
        examinationData.rightSphere || null,
        examinationData.rightCylinder || null,
        examinationData.rightAxis || null,
        examinationData.rightVa || null,
        examinationData.rightAdd || null,
        examinationData.leftSphere || null,
        examinationData.leftCylinder || null,
        examinationData.leftAxis || null,
        examinationData.leftVa || null,
        examinationData.leftAdd || null,
        examinationData.pd || null,
        examinationData.nearPd || null,
        examinationData.needsGlasses || false,
        examinationData.needsReferral || false,
        examinationData.needsSpecialCare || false,
        examinationData.notes || null,
        examinationData.examinedBy,
        examinationDate
      ]
    );
    
    return result.insertId;
  }

  static async getPatientVisits(patientId) {
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
        u1.first_name as creator_first_name, u1.last_name as creator_last_name,
        u2.first_name as doctor_first_name, u2.last_name as doctor_last_name
       FROM visits v
       LEFT JOIN users u1 ON v.created_by = u1.id
       LEFT JOIN users u2 ON v.doctor_id = u2.id
       WHERE v.patient_id = ?
       ORDER BY v.created_at DESC`,
      [patientId]
    );
    return rows;
  }

  static async getVisitWithExamination(visitId) {
    const [visitRows] = await executeCeritaQuery(
      `SELECT v.*, 
        p.first_name as patient_first_name, p.last_name as patient_last_name, p.file_number,
        u1.first_name as creator_first_name, u1.last_name as creator_last_name,
        u2.first_name as doctor_first_name, u2.last_name as doctor_last_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN users u1 ON v.created_by = u1.id
       LEFT JOIN users u2 ON v.doctor_id = u2.id
       WHERE v.id = ?`,
      [visitId]
    );
    
    if (!visitRows.length) return null;
    
    const visit = visitRows[0];
    
    const [examRows] = await executeCeritaQuery(
      `SELECT e.*, 
        u.first_name as examiner_first_name, u.last_name as examiner_last_name
       FROM eye_examinations e
       LEFT JOIN users u ON e.examined_by = u.id
       WHERE e.visit_id = ?
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [visitId]
    );
    
    if (examRows.length) {
      visit.examination = examRows[0];
    }
    
    return visit;
  }

  static async getPendingVisits(date = null) {
    let query = `
      SELECT v.*, 
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.file_number,
        p.national_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.status = 'pending'
    `;
    
    const params = [];
    
    if (date) {
      query += ' AND v.visit_date = ?';
      params.push(date);
    }
    
    query += ' ORDER BY v.visit_date ASC, v.visit_time ASC';
    
    const [rows] = await executeCeritaQuery(query, params);
    return rows;
  }
  
  static async getTodayVisits() {
    const today = generatePersianDate();
    return this.getPendingVisits(today);
  }
  
  static async getVisitsNeedingGlasses(limit = 50) {
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.file_number,
        p.national_id,
        e.needs_glasses,
        e.right_sphere, e.right_cylinder, e.right_axis,
        e.left_sphere, e.left_cylinder, e.left_axis,
        e.pd, e.near_pd
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN eye_examinations e ON v.id = e.visit_id
       WHERE e.needs_glasses = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM sales s WHERE s.visit_id = v.id
       )
       ORDER BY v.visit_date DESC, v.visit_time DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
  
  static async getVisitStats(period = 'today') {
    let dateCondition = '';
    const today = generatePersianDate();
    
    if (period === 'today') {
      dateCondition = `v.visit_date = '${today}'`;
    } else if (period === 'week') {
      // This is a simplification - in a real app, you'd need to calculate the start of the week in Persian calendar
      dateCondition = `v.visit_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    } else if (period === 'month') {
      // This is a simplification - in a real app, you'd need to calculate the start of the month in Persian calendar
      dateCondition = `v.visit_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    }
    
    const [rows] = await executeCeritaQuery(
      `SELECT 
        COUNT(*) as total_visits,
        SUM(CASE WHEN v.status = 'pending' THEN 1 ELSE 0 END) as pending_visits,
        SUM(CASE WHEN v.status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        SUM(CASE WHEN e.needs_glasses = TRUE THEN 1 ELSE 0 END) as needs_glasses,
        SUM(CASE WHEN e.needs_referral = TRUE THEN 1 ELSE 0 END) as needs_referral
       FROM visits v
       LEFT JOIN eye_examinations e ON v.id = e.visit_id
       WHERE ${dateCondition}`,
      []
    );
    
    return rows[0];
  }

  static async findByClinicAndDateRange(startDate, endDate) {
    console.log('Finding visits by date range:', { startDate, endDate });
    
    // تاریخ‌های ورودی به فرمت شمسی هستند (YYYY/MM/DD)
    // در دیتابیس هم تاریخ‌ها به فرمت شمسی ذخیره می‌شوند
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.file_number,
        p.national_id,
        u.first_name as doctor_first_name,
        u.last_name as doctor_last_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN users u ON v.doctor_id = u.id
       WHERE v.visit_date = ?
       ORDER BY v.visit_date ASC, v.visit_time ASC`,
      [startDate]
    );
    
    console.log(`Found ${rows.length} visits for date: ${startDate}`);
    return rows;
  }

  static async findById(id) {
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
        p.first_name as patient_first_name, p.last_name as patient_last_name, p.file_number,
        u1.first_name as creator_first_name, u1.last_name as creator_last_name,
        u2.first_name as doctor_first_name, u2.last_name as doctor_last_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN users u1 ON v.created_by = u1.id
       LEFT JOIN users u2 ON v.doctor_id = u2.id
       WHERE v.id = ?`,
      [id]
    );
    
    if (!rows.length) return null;
    return rows[0];
  }

  static async findByDoctorAndDate(doctorId, date) {
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.file_number,
        p.national_id
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.doctor_id = ?
       AND v.visit_date = ?
       ORDER BY v.visit_time ASC`,
      [doctorId, date]
    );
    return rows;
  }

  static async update(id, visitData) {
    const updateFields = [];
    const params = [];
    
    if (visitData.visitDate) {
      updateFields.push('visit_date = ?');
      params.push(visitData.visitDate);
    }
    
    if (visitData.visitTime) {
      updateFields.push('visit_time = ?');
      params.push(visitData.visitTime);
    }
    
    if (visitData.chiefComplaint !== undefined) {
      updateFields.push('chief_complaint = ?');
      params.push(visitData.chiefComplaint);
    }
    
    if (visitData.diagnosis !== undefined) {
      updateFields.push('diagnosis = ?');
      params.push(visitData.diagnosis);
    }
    
    if (visitData.recommendations !== undefined) {
      updateFields.push('recommendations = ?');
      params.push(visitData.recommendations);
    }
    
    if (visitData.status) {
      updateFields.push('status = ?');
      params.push(visitData.status);
    }
    
    if (!updateFields.length) return true;
    
    params.push(id);
    
    const [result] = await executeCeritaQuery(
      `UPDATE visits SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await executeCeritaQuery(
      `DELETE FROM visits WHERE id = ?`,
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT v.*, 
             p.first_name AS patient_first_name, 
             p.last_name AS patient_last_name,
             p.file_number AS patient_file_number,
             d.first_name AS doctor_first_name, 
             d.last_name AS doctor_last_name
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN users d ON v.doctor_id = d.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.patientId) {
      query += ' AND v.patient_id = ?';
      values.push(filters.patientId);
    }

    if (filters.doctorId) {
      query += ' AND v.doctor_id = ?';
      values.push(filters.doctorId);
    }

    if (filters.status) {
      query += ' AND v.status = ?';
      values.push(filters.status);
    }

    if (filters.fromDate) {
      query += ' AND v.visit_date >= ?';
      values.push(filters.fromDate);
    }

    if (filters.toDate) {
      query += ' AND v.visit_date <= ?';
      values.push(filters.toDate);
    }

    if (filters.search) {
      query += ` AND (
        p.first_name LIKE ? OR 
        p.last_name LIKE ? OR 
        p.file_number LIKE ? OR
        p.national_id LIKE ? OR
        p.phone LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY v.visit_date DESC, v.visit_time DESC';

    const [rows] = await executeCeritaQuery(query, values);
    return rows;
  }

  static async getVisitsByDateRange(startDate, endDate, doctorId = null) {
    let query = `
      SELECT v.*, 
             p.first_name AS patient_first_name, 
             p.last_name AS patient_last_name,
             p.file_number AS patient_file_number,
             d.first_name AS doctor_first_name, 
             d.last_name AS doctor_last_name
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN users d ON v.doctor_id = d.id
      WHERE v.visit_date BETWEEN ? AND ?
    `;
    const values = [startDate, endDate];

    if (doctorId) {
      query += ' AND v.doctor_id = ?';
      values.push(doctorId);
    }

    query += ' ORDER BY v.visit_date, v.visit_time';

    const [rows] = await executeCeritaQuery(query, values);
    return rows;
  }

  static async getVisitsByDoctorAndDate(doctorId, date) {
    const [rows] = await executeCeritaQuery(
      `SELECT v.*, 
              p.first_name AS patient_first_name, 
              p.last_name AS patient_last_name,
              p.file_number AS patient_file_number
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.doctor_id = ? AND v.visit_date = ?
       ORDER BY v.visit_time`,
      [doctorId, date]
    );
    return rows;
  }
}

module.exports = Visit; 