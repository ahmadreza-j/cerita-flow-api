const mysql = require("mysql2/promise");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Create a connection pool without specifying a database
const rootPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// Main connection pool for the master database
const masterPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "optoplus_master",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Store clinic-specific connection pools
const clinicPools = new Map();

/**
 * Initialize the master database
 * @returns {Promise<boolean>} Success status
 */
async function initializeMasterDb() {
  try {
    const dbName = process.env.DB_NAME || "optoplus_master";

    // Create the master database if it doesn't exist
    await rootPool.query(
      `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`
    );

    // Use the database
    await rootPool.query(`USE ${dbName}`);

    console.log(`Master database '${dbName}' initialized successfully`);
    return true;
  } catch (error) {
    console.error("Error initializing master database:", error);
    throw error;
  }
}

/**
 * Get a connection to the master database
 * @returns {Promise<mysql.Connection>} Database connection
 */
async function getMasterConnection() {
  return await masterPool.getConnection();
}

/**
 * Get a connection to a specific clinic's database
 * @param {string} clinicDbName - The database name for the clinic
 * @returns {Promise<mysql.Connection>} Database connection
 */
async function getClinicConnection(clinicDbName) {
  if (!clinicDbName) {
    throw new Error("Clinic database name is required");
  }

  // If we already have a pool for this clinic, use it
  if (clinicPools.has(clinicDbName)) {
    return await clinicPools.get(clinicDbName).getConnection();
  }

  // Otherwise, create a new pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: clinicDbName,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  clinicPools.set(clinicDbName, pool);
  return await pool.getConnection();
}

/**
 * Create a new database for a clinic
 * @param {string} clinicName - The name of the clinic
 * @param {string} clinicDbName - The database name to create
 * @returns {Promise<boolean>} Success status
 */
async function createClinicDatabase(clinicName, clinicDbName) {
  const connection = await getMasterConnection();
  try {
    // Create the database with backticks around the database name for proper escaping
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${clinicDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`
    );

    // Use the new database with backticks for safety
    await connection.query(`USE \`${clinicDbName}\``);

    // Get the schema script
    let schemaScript;

    // Check if we have a processed schema in the global variable
    if (global.processedClinicSchema) {
      schemaScript = global.processedClinicSchema;
    } else {
      // Fallback to reading from file
      const originalSchemaPath = path.join(__dirname, "/clinic_schema.sql");
      schemaScript = fs.readFileSync(originalSchemaPath, "utf8");
    }

    const statements = schemaScript
      .split(";")
      .filter((statement) => statement.trim() !== "")
      .map((statement) => statement.trim() + ";");

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim() !== ";") {
        await connection.query(statement);
      }
    }

    // Switch back to master database
    await connection.query(`USE ${process.env.DB_NAME || "optoplus_master"}`);

    // Insert clinic information
    await connection.query(
      `INSERT INTO clinics (name, db_name, created_at) VALUES (?, ?, NOW())`,
      [clinicName, clinicDbName]
    );

    return true;
  } catch (error) {
    console.error("Error creating clinic database:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Execute a query on the master database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeMasterQuery(sql, params = []) {
  try {
    return await masterPool.execute(sql, params);
  } catch (error) {
    // If the error is about unknown database and the query is not a CREATE DATABASE query
    if (
      error.code === "ER_BAD_DB_ERROR" &&
      !sql.toUpperCase().includes("CREATE DATABASE")
    ) {
      // Try to create the database first
      const dbName = process.env.DB_NAME || "optoplus_master";
      await rootPool.execute(
        `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`
      );

      // Create a new connection pool with the correct database
      const tempPool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Try the query again
      return await tempPool.execute(sql, params);
    }
    throw error;
  }
}

/**
 * Execute a query on a specific clinic's database
 * @param {string} clinicDbName - The database name for the clinic
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeClinicQuery(clinicDbName, sql, params = []) {
  if (!clinicDbName) {
    throw new Error("Clinic database name is required");
  }

  // If we don't have a pool for this clinic yet, create one
  if (!clinicPools.has(clinicDbName)) {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: clinicDbName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
    clinicPools.set(clinicDbName, pool);
  }

  return await clinicPools.get(clinicDbName).execute(sql, params);
}

/**
 * List all clinic databases
 * @returns {Promise<Array>} List of clinic databases
 */
async function listClinicDatabases() {
  const masterDbName = process.env.DB_NAME || "optoplus_master";
  const prefix = masterDbName.split("_")[0]; // Extract prefix (e.g., 'optoplus' from 'optoplus_master')

  const [rows] = await executeMasterQuery(
    `SELECT table_schema FROM information_schema.tables 
     WHERE table_schema LIKE '${prefix}_%' 
     AND table_schema != ?
     GROUP BY table_schema`,
    [masterDbName]
  );
  return rows.map((row) => row.table_schema);
}

module.exports = {
  getMasterConnection,
  getClinicConnection,
  createClinicDatabase,
  executeMasterQuery,
  executeClinicQuery,
  listClinicDatabases,
  initializeMasterDb,
};
