const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { executeCeritaQuery } = require('../config/database');

// Middleware to check authentication
router.use(auth);

// Get dashboard statistics
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    // Get total patients count
    const patientsQuery = 'SELECT COUNT(*) as totalPatients FROM patients';
    const [patientsResult] = await executeCeritaQuery(patientsQuery);
    const totalPatients = patientsResult[0].totalPatients;

    // Get total visits count
    const visitsQuery = 'SELECT COUNT(*) as totalVisits FROM visits';
    const [visitsResult] = await executeCeritaQuery(visitsQuery);
    const totalVisits = visitsResult[0].totalVisits;

    // Get total products count
    const productsQuery = 'SELECT COUNT(*) as totalProducts FROM products';
    const [productsResult] = await executeCeritaQuery(productsQuery);
    const totalProducts = productsResult[0].totalProducts;

    // Get total sales count
    const salesQuery = 'SELECT COUNT(*) as totalSales FROM sales';
    const [salesResult] = await executeCeritaQuery(salesQuery);
    const totalSales = salesResult[0].totalSales;

    // Get today's visits count
    const today = new Date().toISOString().split('T')[0];
    const todayVisitsQuery = `SELECT COUNT(*) as todayVisits FROM visits WHERE DATE(visit_date) = ?`;
    const [todayVisitsResult] = await executeCeritaQuery(todayVisitsQuery, [today]);
    const todayVisits = todayVisitsResult[0].todayVisits;

    // Get today's sales count
    const todaySalesQuery = `SELECT COUNT(*) as todaySales FROM sales WHERE DATE(sale_date) = ?`;
    const [todaySalesResult] = await executeCeritaQuery(todaySalesQuery, [today]);
    const todaySales = todaySalesResult[0].todaySales;

    res.json({
      totalPatients,
      totalVisits,
      totalProducts,
      totalSales,
      todayVisits,
      todaySales
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار داشبورد' });
  }
});

// Get clinic statistics for specific date range
router.get('/clinic', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'تاریخ شروع و پایان الزامی است' });
    }
    
    // Get visits count for date range
    const visitsQuery = `
      SELECT COUNT(*) as totalVisits, 
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedVisits,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingVisits
      FROM visits 
      WHERE DATE(visit_date) BETWEEN ? AND ?
    `;
    const [visitsResult] = await executeCeritaQuery(visitsQuery, [startDate, endDate]);
    
    // Get sales data for date range
    const salesQuery = `
      SELECT COUNT(*) as totalSales, 
             SUM(final_amount) as totalAmount
      FROM sales 
      WHERE DATE(sale_date) BETWEEN ? AND ?
    `;
    const [salesResult] = await executeCeritaQuery(salesQuery, [startDate, endDate]);
    
    // Get new patients count for date range
    const patientsQuery = `
      SELECT COUNT(*) as newPatients
      FROM patients 
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;
    const [patientsResult] = await executeCeritaQuery(patientsQuery, [startDate, endDate]);
    
    res.json({
      visits: {
        total: visitsResult[0].totalVisits || 0,
        completed: visitsResult[0].completedVisits || 0,
        pending: visitsResult[0].pendingVisits || 0
      },
      sales: {
        total: salesResult[0].totalSales || 0,
        amount: salesResult[0].totalAmount || 0
      },
      newPatients: patientsResult[0].newPatients || 0,
      dateRange: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Get clinic stats error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار کلینیک' });
  }
});

module.exports = router; 