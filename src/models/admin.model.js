const { executeCeritaQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
    static async getById(id) {
        const [rows] = await executeCeritaQuery(
            `SELECT id, username, email, first_name, last_name, 
                    phone_number, national_id, age, gender, address,
                    is_active, created_at, updated_at
             FROM admins 
             WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getByEmail(email) {
        const [rows] = await executeCeritaQuery(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async getByUsername(username) {
        const [rows] = await executeCeritaQuery(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async update(adminId, adminData) {
        const updateFields = [];
        const values = [];

        if (adminData.firstName) {
            updateFields.push('first_name = ?');
            values.push(adminData.firstName);
        }
        if (adminData.lastName) {
            updateFields.push('last_name = ?');
            values.push(adminData.lastName);
        }
        if (adminData.email) {
            updateFields.push('email = ?');
            values.push(adminData.email);
        }
        if (adminData.phoneNumber) {
            updateFields.push('phone_number = ?');
            values.push(adminData.phoneNumber);
        }
        if (adminData.nationalId) {
            updateFields.push('national_id = ?');
            values.push(adminData.nationalId);
        }
        if (adminData.age) {
            updateFields.push('age = ?');
            values.push(adminData.age);
        }
        if (adminData.gender) {
            updateFields.push('gender = ?');
            values.push(adminData.gender);
        }
        if (adminData.address) {
            updateFields.push('address = ?');
            values.push(adminData.address);
        }
        if (adminData.isActive !== undefined) {
            updateFields.push('is_active = ?');
            values.push(adminData.isActive);
        }
        if (adminData.password) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            updateFields.push('password = ?');
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) return false;

        values.push(adminId);
        
        const [result] = await executeCeritaQuery(
            `UPDATE admins SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async validatePassword(admin, password) {
        return bcrypt.compare(password, admin.password);
    }
}

module.exports = Admin; 