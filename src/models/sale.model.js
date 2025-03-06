const db = require('../config/database');

class Sale {
    static async create(saleData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Create sale record
            const [saleResult] = await connection.execute(
                `INSERT INTO sales (
                    visit_id,
                    patient_id,
                    total_amount,
                    discount_amount,
                    final_amount,
                    payment_method,
                    sold_by,
                    sale_date,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    saleData.visitId,
                    saleData.patientId,
                    saleData.totalAmount,
                    saleData.discountAmount,
                    saleData.finalAmount,
                    saleData.paymentMethod,
                    saleData.soldBy
                ]
            );

            const saleId = saleResult.insertId;

            // Create sale items
            for (const item of saleData.items) {
                await connection.execute(
                    `INSERT INTO sale_items (
                        sale_id,
                        product_id,
                        quantity,
                        unit_price,
                        total_price
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        saleId,
                        item.productId,
                        item.quantity,
                        item.unitPrice,
                        item.quantity * item.unitPrice
                    ]
                );

                // Update product stock
                await connection.execute(
                    'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                    [item.quantity, item.productId]
                );
            }

            await connection.commit();
            return saleId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const [rows] = await db.execute(
            `SELECT s.*, 
                    u.full_name as seller_name,
                    p.first_name, p.last_name,
                    v.visit_date
             FROM sales s
             JOIN users u ON s.sold_by = u.id
             JOIN patients p ON s.patient_id = p.id
             LEFT JOIN visits v ON s.visit_id = v.id
             WHERE s.id = ?`,
            [id]
        );

        if (!rows[0]) return null;

        const sale = rows[0];

        const [items] = await db.execute(
            `SELECT si.*, p.name as product_name, p.code as product_code, p.type as product_type
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [id]
        );

        sale.items = items;
        return sale;
    }

    static async getSales(filters = {}) {
        let query = `
            SELECT s.*, 
                   u.full_name as seller_name,
                   p.first_name, p.last_name,
                   v.visit_date
            FROM sales s
            JOIN users u ON s.sold_by = u.id
            JOIN patients p ON s.patient_id = p.id
            LEFT JOIN visits v ON s.visit_id = v.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.startDate) {
            query += ' AND DATE(s.sale_date) >= ?';
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND DATE(s.sale_date) <= ?';
            values.push(filters.endDate);
        }
        if (filters.sellerId) {
            query += ' AND s.sold_by = ?';
            values.push(filters.sellerId);
        }
        if (filters.patientId) {
            query += ' AND s.patient_id = ?';
            values.push(filters.patientId);
        }
        if (filters.minAmount) {
            query += ' AND s.final_amount >= ?';
            values.push(filters.minAmount);
        }
        if (filters.maxAmount) {
            query += ' AND s.final_amount <= ?';
            values.push(filters.maxAmount);
        }

        query += ' ORDER BY s.sale_date DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            values.push(filters.limit);
        }

        const [rows] = await db.execute(query, values);
        return rows;
    }

    static async getSalesByProductType(startDate, endDate) {
        const [rows] = await db.execute(
            `SELECT p.type,
                    COUNT(DISTINCT s.id) as total_sales,
                    SUM(si.quantity) as total_quantity,
                    SUM(si.total_price) as total_amount
             FROM sales s
             JOIN sale_items si ON s.id = si.sale_id
             JOIN products p ON si.product_id = p.id
             WHERE s.sale_date BETWEEN ? AND ?
             GROUP BY p.type`,
            [startDate, endDate]
        );
        return rows;
    }

    static async getDailySales(days = 30) {
        const [rows] = await db.execute(
            `SELECT DATE(sale_date) as date,
                    COUNT(*) as total_sales,
                    SUM(final_amount) as total_amount
             FROM sales
             WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(sale_date)
             ORDER BY date DESC`,
            [days]
        );
        return rows;
    }

    static async getTopSellingProducts(startDate, endDate, limit = 10) {
        const [rows] = await db.execute(
            `SELECT p.id, p.name, p.code, p.type,
                    SUM(si.quantity) as total_quantity,
                    SUM(si.total_price) as total_amount,
                    COUNT(DISTINCT s.id) as sale_count
             FROM sales s
             JOIN sale_items si ON s.id = si.sale_id
             JOIN products p ON si.product_id = p.id
             WHERE s.sale_date BETWEEN ? AND ?
             GROUP BY p.id
             ORDER BY total_quantity DESC
             LIMIT ?`,
            [startDate, endDate, limit]
        );
        return rows;
    }
}

module.exports = Sale; 