const { executeCeritaQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

const Roles = {
    ADMIN: 'ADMIN',
    CLINIC_MANAGER: 'CLINIC_MANAGER',
    SECRETARY: 'SECRETARY',
    DOCTOR: 'DOCTOR',
    OPTICIAN: 'OPTICIAN'
};

class User {
    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [result] = await executeCeritaQuery(
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
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
                userData.medicalLicenseNumber
            ]
        );
        return result.insertId;
    }

    static async update(userId, userData) {
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
        
        const [result] = await executeCeritaQuery(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async getById(id) {
        const [rows] = await executeCeritaQuery(
            `SELECT id, username, email, role, first_name, last_name, 
                    phone_number, national_id, age, gender, address,
                    medical_license_number, is_active,
                    created_at, updated_at
             FROM users 
             WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getByEmail(email) {
        const [rows] = await executeCeritaQuery(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async getByUsername(username) {
        const [rows] = await executeCeritaQuery(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async getAll(filters = {}) {
        let query = `
            SELECT id, username, email, role, first_name, last_name, 
                   phone_number, national_id, age, gender, address,
                   medical_license_number, is_active,
                   created_at, updated_at
            FROM users 
            WHERE 1=1
        `;
        const values = [];

        if (filters.role) {
            query += ' AND role = ?';
            values.push(filters.role);
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

        const [rows] = await executeCeritaQuery(query, values);
        return rows;
    }

    static async delete(id) {
        const [result] = await executeCeritaQuery(
            'UPDATE users SET is_active = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }

    static async getAllWithFilters(filters = {}) {
        let query = 'SELECT * FROM users WHERE 1=1';
        const values = [];

        // Filter by role(s)
        if (filters.role) {
            query += ' AND role = ?';
            values.push(filters.role);
        }

        // Exclude specific roles
        if (filters.excludeRoles && Array.isArray(filters.excludeRoles) && filters.excludeRoles.length > 0) {
            const placeholders = filters.excludeRoles.map(() => '?').join(', ');
            query += ` AND role NOT IN (${placeholders})`;
            values.push(...filters.excludeRoles);
        }

        // Filter by active status
        if (filters.isActive !== undefined) {
            query += ' AND is_active = ?';
            values.push(filters.isActive);
        }

        // Search by name, email, or username
        if (filters.search) {
            query += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Order by created_at
        query += ' ORDER BY created_at DESC';

        const [rows] = await executeCeritaQuery(query, values);
        return rows;
    }
}

module.exports = {
    User,
    Roles
}; 