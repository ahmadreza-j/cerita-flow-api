-- Create database if not exists
CREATE DATABASE IF NOT EXISTS optometry_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
USE optometry_clinic;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(11),
    role ENUM('ADMIN', 'CLINIC_MANAGER', 'SECRETARY', 'DOCTOR', 'OPTICIAN') NOT NULL,
    clinic_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_clinic (clinic_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Clinics table
CREATE TABLE IF NOT EXISTS clinics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(11),
    manager_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Add foreign key to users table for clinic_id
ALTER TABLE users
ADD FOREIGN KEY (clinic_id) REFERENCES clinics(id);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    national_id VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE,
    age INT,
    gender ENUM('male', 'female', 'other'),
    occupation VARCHAR(100),
    address VARCHAR(255),
    phone VARCHAR(11),
    email VARCHAR(100),
    referral_source VARCHAR(100),
    clinic_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
    INDEX idx_national_id (national_id),
    INDEX idx_name (first_name, last_name),
    INDEX idx_clinic (clinic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    clinic_id INT NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    chief_complaint TEXT,
    diagnosis TEXT,
    recommendations TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_clinic (clinic_id),
    INDEX idx_date (visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Eye examinations table
CREATE TABLE IF NOT EXISTS eye_examinations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    visit_id INT NOT NULL,
    right_sphere DECIMAL(4,2),
    right_cylinder DECIMAL(4,2),
    right_axis INT,
    right_va DECIMAL(3,2),
    right_add DECIMAL(4,2),
    left_sphere DECIMAL(4,2),
    left_cylinder DECIMAL(4,2),
    left_axis INT,
    left_va DECIMAL(3,2),
    left_add DECIMAL(4,2),
    pd DECIMAL(4,2),
    near_pd DECIMAL(4,2),
    needs_glasses BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    INDEX idx_visit (visit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category ENUM('frame', 'lens', 'contact_lens', 'solution', 'accessory') NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_quantity INT DEFAULT 5,
    clinic_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_clinic (clinic_id),
    INDEX idx_active_product (is_active, clinic_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    visit_id INT,
    optician_id INT NOT NULL,
    clinic_id INT NOT NULL,
    sale_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'insurance') NOT NULL,
    insurance_provider VARCHAR(100),
    insurance_number VARCHAR(50),
    status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (optician_id) REFERENCES users(id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
    INDEX idx_patient (patient_id),
    INDEX idx_optician (optician_id),
    INDEX idx_clinic (clinic_id),
    INDEX idx_date (sale_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$6jM7G6HNH/QH6lh.z6eQ8O9V4dX.rOCPFWlBXGZy.3nFpBhBKyfuy',
    'مدیر',
    'سیستم',
    'ADMIN',
    true
); 