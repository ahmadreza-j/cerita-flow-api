const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Sale = require('../models/sale.model');
const { Product } = require('../models/product.model');

// Middleware to check if user is optician
const isOptician = (req, res, next) => {
    if (req.user.role !== 'optician') {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
};

router.use(auth);

// Create new sale
router.post('/', isOptician, [
    body('visitId').optional().isInt(),
    body('patientId').isInt().withMessage('شناسه بیمار الزامی است'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('مبلغ کل نامعتبر است'),
    body('discountAmount').isFloat({ min: 0 }).withMessage('مبلغ تخفیف نامعتبر است'),
    body('finalAmount').isFloat({ min: 0 }).withMessage('مبلغ نهایی نامعتبر است'),
    body('paymentMethod').isIn(['cash', 'card', 'pos']).withMessage('روش پرداخت نامعتبر است'),
    body('items').isArray({ min: 1 }).withMessage('حداقل یک محصول باید انتخاب شود'),
    body('items.*.productId').isInt().withMessage('شناسه محصول نامعتبر است'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('تعداد باید بزرگتر از صفر باشد'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('قیمت واحد نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check product stock
        for (const item of req.body.items) {
            const product = await Product.getById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `محصول با شناسه ${item.productId} یافت نشد` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ error: `موجودی محصول ${product.name} کافی نیست` });
            }
        }

        const saleId = await Sale.create({
            ...req.body,
            soldBy: req.user.id
        });

        res.status(201).json({ message: 'فروش با موفقیت ثبت شد', saleId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در ثبت فروش' });
    }
});

// Get sale details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sale.getById(id);
        
        if (!sale) {
            return res.status(404).json({ error: 'فروش یافت نشد' });
        }

        res.json(sale);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات فروش' });
    }
});

// Get sales with filters
router.get('/', [
    query('startDate').optional().isDate().withMessage('تاریخ شروع نامعتبر است'),
    query('endDate').optional().isDate().withMessage('تاریخ پایان نامعتبر است'),
    query('sellerId').optional().isInt().withMessage('شناسه فروشنده نامعتبر است'),
    query('patientId').optional().isInt().withMessage('شناسه بیمار نامعتبر است'),
    query('minAmount').optional().isFloat({ min: 0 }).withMessage('حداقل مبلغ نامعتبر است'),
    query('maxAmount').optional().isFloat({ min: 0 }).withMessage('حداکثر مبلغ نامعتبر است'),
    query('limit').optional().isInt({ min: 1 }).withMessage('محدودیت تعداد نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const sales = await Sale.getSales(req.query);
        res.json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت لیست فروش‌ها' });
    }
});

// Get sales by product type
router.get('/by-product-type', [
    query('startDate').isDate().withMessage('تاریخ شروع الزامی است'),
    query('endDate').isDate().withMessage('تاریخ پایان الزامی است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { startDate, endDate } = req.query;
        const stats = await Sale.getSalesByProductType(startDate, endDate);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت آمار فروش' });
    }
});

// Get daily sales
router.get('/daily-stats', [
    query('days').optional().isInt({ min: 1 }).withMessage('تعداد روز نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const days = parseInt(req.query.days) || 30;
        const stats = await Sale.getDailySales(days);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت آمار روزانه' });
    }
});

// Get top selling products
router.get('/top-products', [
    query('startDate').isDate().withMessage('تاریخ شروع الزامی است'),
    query('endDate').isDate().withMessage('تاریخ پایان الزامی است'),
    query('limit').optional().isInt({ min: 1 }).withMessage('محدودیت تعداد نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { startDate, endDate, limit } = req.query;
        const products = await Sale.getTopSellingProducts(startDate, endDate, parseInt(limit) || 10);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت محصولات پرفروش' });
    }
});

module.exports = router; 