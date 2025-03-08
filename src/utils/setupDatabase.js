const { executeMasterQuery } = require("../config/database");
const fs = require("fs");
const path = require("path");

/**
 * Setup database tables
 */
async function setupDatabaseTables() {
  try {
    console.log("Setting up database tables...");

    // Read master_schema.sql
    const schemaPath = path.join(__dirname, "../config/master_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Create super_admins table directly
    await executeMasterQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);

    // Create clinics table directly
    await executeMasterQuery(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);

    console.log("Database tables setup completed successfully");
  } catch (error) {
    console.error("Error setting up database tables:", error);
    throw error; // رد کردن خطا برای مدیریت در سطح بالاتر
  }
}

module.exports = { setupDatabaseTables };
