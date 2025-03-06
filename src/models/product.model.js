const db = require('../config/database');

const ProductTypes = {
    FRAME: 'frame',
    LENS: 'lens',
    CONTACT_LENS: 'contact_lens',
    ACCESSORY: 'accessory'
};

class Product {
    static async create(productData) {
        const [result] = await db.execute(
            `INSERT INTO products (
                code,
                name,
                type,
                brand,
                description,
                purchase_price,
                selling_price,
                quantity,
                min_quantity,
                created_by,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                productData.code,
                productData.name,
                productData.type,
                productData.brand,
                productData.description,
                productData.purchasePrice,
                productData.sellingPrice,
                productData.quantity,
                productData.minQuantity,
                productData.createdBy
            ]
        );
        return result.insertId;
    }

    static async update(productId, productData) {
        const updateFields = [];
        const values = [];

        if (productData.name) {
            updateFields.push('name = ?');
            values.push(productData.name);
        }
        if (productData.brand) {
            updateFields.push('brand = ?');
            values.push(productData.brand);
        }
        if (productData.description) {
            updateFields.push('description = ?');
            values.push(productData.description);
        }
        if (productData.purchasePrice) {
            updateFields.push('purchase_price = ?');
            values.push(productData.purchasePrice);
        }
        if (productData.sellingPrice) {
            updateFields.push('selling_price = ?');
            values.push(productData.sellingPrice);
        }
        if (typeof productData.quantity === 'number') {
            updateFields.push('quantity = ?');
            values.push(productData.quantity);
        }
        if (productData.minQuantity) {
            updateFields.push('min_quantity = ?');
            values.push(productData.minQuantity);
        }

        if (updateFields.length === 0) return false;

        values.push(productId);
        
        const [result] = await db.execute(
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async updateStock(productId, quantity, type = 'add') {
        const operator = type === 'add' ? '+' : '-';
        const [result] = await db.execute(
            `UPDATE products SET quantity = quantity ${operator} ? WHERE id = ?`,
            [quantity, productId]
        );
        return result.affectedRows > 0;
    }

    static async getById(id) {
        const [rows] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async getByCode(code) {
        const [rows] = await db.execute(
            'SELECT * FROM products WHERE code = ?',
            [code]
        );
        return rows[0];
    }

    static async getAll(filters = {}) {
        let query = 'SELECT * FROM products WHERE 1=1';
        const values = [];

        if (filters.type) {
            query += ' AND type = ?';
            values.push(filters.type);
        }
        if (filters.brand) {
            query += ' AND brand LIKE ?';
            values.push(`%${filters.brand}%`);
        }
        if (filters.search) {
            query += ' AND (name LIKE ? OR code LIKE ? OR brand LIKE ?)';
            values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.lowStock) {
            query += ' AND quantity <= min_quantity';
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.execute(query, values);
        return rows;
    }

    static async getLowStockProducts() {
        const [rows] = await db.execute(
            'SELECT * FROM products WHERE quantity <= min_quantity'
        );
        return rows;
    }

    static async delete(id) {
        const [result] = await db.execute(
            'DELETE FROM products WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = {
    Product,
    ProductTypes
}; 