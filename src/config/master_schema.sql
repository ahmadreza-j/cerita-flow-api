-- Create master database if not exists
CREATE DATABASE IF NOT EXISTS optometry_master CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
USE optometry_master;

-- Super admin users table
CREATE TABLE IF NOT EXISTS super_admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(11),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Clinics master table
CREATE TABLE IF NOT EXISTS clinics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    db_name VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(11),
    manager_name VARCHAR(100),
    establishment_year VARCHAR(4),
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_db_name (db_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Insert default super admin (password: superadmin123)
INSERT IGNORE INTO super_admins (username, email, password, first_name, last_name, is_active)
VALUES (
    'superadmin',
    'superadmin@example.com',
    '$2a$10$6jM7G6HNH/QH6lh.z6eQ8O9V4dX.rOCPFWlBXGZy.3nFpBhBKyfuy',
    'مدیر',
    'ارشد',
    true
); 