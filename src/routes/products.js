const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { Product, ProductTypes } = require('../models/product.model');

// Middleware to check if user is optician
const isOptician = (req, res, next) => {
    if (req.user.role !== 'optician') {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
};

router.use(auth);

// Get all products with filters
router.get('/', [
    query('type').optional().isIn(Object.values(ProductTypes)),
    query('brand').optional().isString(),
    query('search').optional().isString(),
    query('lowStock').optional().isBoolean()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const filters = {
            type: req.query.type,
            brand: req.query.brand,
            search: req.query.search,
            lowStock: req.query.lowStock === 'true'
        };

        const products = await Product.getAll(filters);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت لیست محصولات' });
    }
});

// Get low stock products
router.get('/low-stock', async (req, res) => {
    try {
        const products = await Product.getLowStockProducts();
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در دریافت لیست محصولات کم موجود' });
    }
});

// Create new product
router.post('/', isOptician, [
    body('code').notEmpty().withMessage('کد محصول الزامی است'),
    body('name').notEmpty().withMessage('نام محصول الزامی است'),
    body('type').isIn(Object.values(ProductTypes)).withMessage('نوع محصول نامعتبر است'),
    body('brand').notEmpty().withMessage('برند محصول الزامی است'),
    body('purchasePrice').isFloat({ min: 0 }).withMessage('قیمت خرید نامعتبر است'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('قیمت فروش نامعتبر است'),
    body('quantity').isInt({ min: 0 }).withMessage('تعداد نامعتبر است'),
    body('minQuantity').isInt({ min: 0 }).withMessage('حداقل موجودی نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const existingProduct = await Product.getByCode(req.body.code);
        if (existingProduct) {
            return res.status(400).json({ error: 'این کد محصول قبلاً ثبت شده است' });
        }

        const productId = await Product.create({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({ message: 'محصول با موفقیت ایجاد شد', productId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در ایجاد محصول' });
    }
});

// Update product
router.put('/:id', isOptician, [
    body('name').optional().notEmpty().withMessage('نام محصول نمی‌تواند خالی باشد'),
    body('brand').optional().notEmpty().withMessage('برند محصول نمی‌تواند خالی باشد'),
    body('purchasePrice').optional().isFloat({ min: 0 }).withMessage('قیمت خرید نامعتبر است'),
    body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('قیمت فروش نامعتبر است'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('تعداد نامعتبر است'),
    body('minQuantity').optional().isInt({ min: 0 }).withMessage('حداقل موجودی نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const success = await Product.update(id, req.body);
        
        if (!success) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        res.json({ message: 'محصول با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در بروزرسانی محصول' });
    }
});

// Update product stock
router.patch('/:id/stock', isOptician, [
    body('quantity').isInt({ min: 1 }).withMessage('تعداد باید بزرگتر از صفر باشد'),
    body('type').isIn(['add', 'subtract']).withMessage('نوع عملیات نامعتبر است')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { quantity, type } = req.body;

        const success = await Product.updateStock(id, quantity, type);
        
        if (!success) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        res.json({ message: 'موجودی محصول با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در بروزرسانی موجودی محصول' });
    }
});

// Delete product
router.delete('/:id', isOptician, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Product.delete(id);
        
        if (!success) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        res.json({ message: 'محصول با موفقیت حذف شد' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا در حذف محصول' });
    }
});

module.exports = router; 