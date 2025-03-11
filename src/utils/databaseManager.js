const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Main connection pool for the master database
const masterPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.MASTER_DB_NAME || "optoplus_master",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

// Store connection pools for each clinic
const clinicPools = new Map();

/**
 * Initialize the master database
 */
async function initializeMasterDatabase() {
  let connection;
  try {
    connection = await masterPool.getConnection();

    // Create master database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${
      process.env.MASTER_DB_NAME || "optoplus_master"
    } 
                           CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);

    // Use master database
    await connection.query(
      `USE ${process.env.MASTER_DB_NAME || "optoplus_master"}`
    );

    // Create clinics table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clinics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        db_name VARCHAR(100) UNIQUE NOT NULL,
        address TEXT,
        phone VARCHAR(11),
        manager_name VARCHAR(100),
        establishment_year VARCHAR(4),
        logo_url VARCHAR(255),
        manager_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_db_name (db_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);

    // Create admin users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
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

    console.log("Master database initialized successfully");
  } catch (error) {
    console.error("Error initializing master database:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Create a new clinic database
 * @param {string} clinicName - The display name of the clinic
 * @param {string} dbName - The database name (English, no spaces)
 * @param {Object} clinicData - Additional clinic data
 * @returns {Promise<number>} - The clinic ID
 */
async function createClinicDatabase(clinicName, dbName, clinicData) {
  let masterConnection;
  try {
    // Validate database name (only alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw new Error(
        "نام دیتابیس فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد"
      );
    }

    masterConnection = await masterPool.getConnection();

    // Check if database name already exists
    const [existingDb] = await masterConnection.query(
      "SELECT id FROM clinics WHERE db_name = ?",
      [dbName]
    );

    if (existingDb.length > 0) {
      throw new Error("این نام دیتابیس قبلاً استفاده شده است");
    }

    // Create the new database
    await masterConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} 
                                CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);

    // Insert clinic record in master database
    const [result] = await masterConnection.query(
      `INSERT INTO clinics (name, db_name, address, phone, manager_name, establishment_year, logo_url, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinicName,
        dbName,
        clinicData.address || null,
        clinicData.phone || null,
        clinicData.managerName || null,
        clinicData.establishmentYear || null,
        clinicData.logoUrl || null,
        clinicData.managerId || null,
      ]
    );

    const clinicId = result.insertId;

    // Initialize the clinic database schema
    await initializeClinicSchema(dbName);

    // Create a connection pool for this clinic
    createClinicConnectionPool(dbName);

    return clinicId;
  } catch (error) {
    console.error("Error creating clinic database:", error);
    throw error;
  } finally {
    if (masterConnection) masterConnection.release();
  }
}

/**
 * Initialize the schema for a clinic database
 * @param {string} dbName - The database name
 */
async function initializeClinicSchema(dbName) {
  let connection;
  try {
    // Create a temporary connection to the new database
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: dbName,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      charset: "utf8mb4",
    });

    connection = await tempPool.getConnection();

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, "../config/clinic_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split schema into individual statements
    const statements = schema
      .split(";")
      .filter((statement) => statement.trim())
      .map((statement) => statement + ";");

    // Execute each statement
    for (const statement of statements) {
      await connection.execute(statement);
    }

    // Close the temporary pool
    await tempPool.end();

    console.log(`Clinic database ${dbName} schema initialized successfully`);
  } catch (error) {
    console.error(
      `Error initializing clinic database ${dbName} schema:`,
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Create a connection pool for a clinic
 * @param {string} dbName - The database name
 * @returns {Pool} - The connection pool
 */
function createClinicConnectionPool(dbName) {
  if (clinicPools.has(dbName)) {
    return clinicPools.get(dbName);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });

  clinicPools.set(dbName, pool);
  return pool;
}

/**
 * Get a connection pool for a clinic
 * @param {string} dbName - The database name
 * @returns {Pool} - The connection pool
 */
function getClinicPool(dbName) {
  if (!clinicPools.has(dbName)) {
    createClinicConnectionPool(dbName);
  }

  return clinicPools.get(dbName);
}

/**
 * Get all clinics
 * @returns {Promise<Array>} - List of clinics
 */
async function getAllClinics() {
  let connection;
  try {
    connection = await masterPool.getConnection();

    const [rows] = await connection.query(
      "SELECT * FROM clinics WHERE is_active = TRUE ORDER BY name"
    );

    return rows;
  } catch (error) {
    console.error("Error getting clinics:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Get a clinic by ID
 * @param {number} id - The clinic ID
 * @returns {Promise<Object>} - The clinic data
 */
async function getClinicById(id) {
  let connection;
  try {
    connection = await masterPool.getConnection();

    const [rows] = await connection.query(
      "SELECT * FROM clinics WHERE id = ?",
      [id]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error getting clinic:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Get a clinic by database name
 * @param {string} dbName - The database name
 * @returns {Promise<Object>} - The clinic data
 */
async function getClinicByDbName(dbName) {
  let connection;
  try {
    connection = await masterPool.getConnection();

    const [rows] = await connection.query(
      "SELECT * FROM clinics WHERE db_name = ?",
      [dbName]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error getting clinic by db name:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Execute a query on a clinic database
 * @param {string} dbName - The database name
 * @param {string} sql - The SQL query
 * @param {Array} params - The query parameters
 * @returns {Promise<Array>} - The query results
 */
async function executeClinicQuery(dbName, sql, params = []) {
  const pool = getClinicPool(dbName);
  let connection;

  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error(`Error executing query on clinic ${dbName}:`, error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Execute a transaction on a clinic database
 * @param {string} dbName - The database name
 * @param {Array} queries - Array of {sql, params} objects
 * @returns {Promise<Array>} - The transaction results
 */
async function executeClinicTransaction(dbName, queries) {
  const pool = getClinicPool(dbName);
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const results = [];
    for (const query of queries) {
      const [result] = await connection.execute(query.sql, query.params || []);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error executing transaction on clinic ${dbName}:`, error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  masterPool,
  initializeMasterDatabase,
  createClinicDatabase,
  getClinicPool,
  getAllClinics,
  getClinicById,
  getClinicByDbName,
  executeClinicQuery,
  executeClinicTransaction,
};
