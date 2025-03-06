const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'خطای اعتبارسنجی',
            details: err.errors
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'توکن نامعتبر است'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'توکن منقضی شده است'
        });
    }

    // Handle database errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'این رکورد قبلاً ثبت شده است'
        });
    }

    // Handle file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'حجم فایل بیش از حد مجاز است'
        });
    }

    // Handle custom errors
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            error: err.message
        });
    }

    // Default error
    res.status(500).json({
        error: 'خطای سرور',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler; 