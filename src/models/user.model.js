const { executeClinicQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

const Roles = {
    ADMIN: 'ADMIN',
    CLINIC_MANAGER: 'CLINIC_MANAGER',
    SECRETARY: 'SECRETARY',
    DOCTOR: 'DOCTOR',
    OPTICIAN: 'OPTICIAN'
};

class User {
    static async create(userData, clinicDbName) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [result] = await executeClinicQuery(
            clinicDbName,
            `INSERT INTO users (
                username,
                email,
                password,
                role,
                first_name,
                last_name,
                phone_number,
                national_id,
                age,
                gender,
                address,
                medical_license_number,
                clinic_id,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                userData.username,
                userData.email,
                hashedPassword,
                userData.role,
                userData.firstName,
                userData.lastName,
                userData.phoneNumber,
                userData.nationalId,
                userData.age,
                userData.gender,
                userData.address,
                userData.medicalLicenseNumber,
                userData.clinicId
            ]
        );
        return result.insertId;
    }

    static async update(userId, userData, clinicDbName) {
        const updateFields = [];
        const values = [];

        if (userData.firstName) {
            updateFields.push('first_name = ?');
            values.push(userData.firstName);
        }
        if (userData.lastName) {
            updateFields.push('last_name = ?');
            values.push(userData.lastName);
        }
        if (userData.email) {
            updateFields.push('email = ?');
            values.push(userData.email);
        }
        if (userData.phoneNumber) {
            updateFields.push('phone_number = ?');
            values.push(userData.phoneNumber);
        }
        if (userData.nationalId) {
            updateFields.push('national_id = ?');
            values.push(userData.nationalId);
        }
        if (userData.age) {
            updateFields.push('age = ?');
            values.push(userData.age);
        }
        if (userData.gender) {
            updateFields.push('gender = ?');
            values.push(userData.gender);
        }
        if (userData.address) {
            updateFields.push('address = ?');
            values.push(userData.address);
        }
        if (userData.medicalLicenseNumber) {
            updateFields.push('medical_license_number = ?');
            values.push(userData.medicalLicenseNumber);
        }
        if (userData.role) {
            updateFields.push('role = ?');
            values.push(userData.role);
        }
        if (userData.clinicId) {
            updateFields.push('clinic_id = ?');
            values.push(userData.clinicId);
        }
        if (userData.isActive !== undefined) {
            updateFields.push('is_active = ?');
            values.push(userData.isActive);
        }
        if (userData.password) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            updateFields.push('password = ?');
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) return false;

        values.push(userId);
        
        const [result] = await executeClinicQuery(
            clinicDbName,
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async getById(id, clinicDbName) {
        const [rows] = await executeClinicQuery(
            clinicDbName,
            `SELECT id, username, email, role, first_name, last_name, 
                    phone_number, national_id, age, gender, address,
                    medical_license_number, clinic_id, is_active,
                    created_at, updated_at
             FROM users 
             WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getByEmail(email, clinicDbName) {
        const [rows] = await executeClinicQuery(
            clinicDbName,
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async getByUsername(username, clinicDbName) {
        const [rows] = await executeClinicQuery(
            clinicDbName,
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async getAll(filters = {}, clinicDbName) {
        let query = `
            SELECT id, username, email, role, first_name, last_name, 
                   phone_number, national_id, age, gender, address,
                   medical_license_number, clinic_id, is_active,
                   created_at, updated_at
            FROM users 
            WHERE 1=1
        `;
        const values = [];

        if (filters.role) {
            query += ' AND role = ?';
            values.push(filters.role);
        }
        if (filters.clinicId) {
            query += ' AND clinic_id = ?';
            values.push(filters.clinicId);
        }
        if (filters.isActive !== undefined) {
            query += ' AND is_active = ?';
            values.push(filters.isActive);
        }
        if (filters.search) {
            query += ` AND (
                username LIKE ? OR 
                email LIKE ? OR 
                first_name LIKE ? OR 
                last_name LIKE ? OR 
                phone_number LIKE ? OR
                national_id LIKE ?
            )`;
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await executeClinicQuery(clinicDbName, query, values);
        return rows;
    }

    static async getClinicStaff(clinicId, clinicDbName) {
        const [rows] = await executeClinicQuery(
            clinicDbName,
            `SELECT id, username, email, role, first_name, last_name, 
                    phone_number, national_id, age, gender, address,
                    medical_license_number, is_active,
                    created_at, updated_at
             FROM users 
             WHERE clinic_id = ? AND role != ?
             ORDER BY role, created_at DESC`,
            [clinicId, Roles.ADMIN]
        );
        return rows;
    }

    static async delete(id, clinicDbName) {
        const [result] = await executeClinicQuery(
            clinicDbName,
            'UPDATE users SET is_active = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
}

module.exports = {
    User,
    Roles
}; 