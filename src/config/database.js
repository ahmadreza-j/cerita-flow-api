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

// Main connection pool for the ceritaFlow database
const ceritaPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ceritaFlow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Initialize the cerita database
 * @returns {Promise<boolean>} Success status
 */
async function initializeCeritaDb() {
  try {
    const dbName = process.env.DB_NAME || "ceritaFlow";

    // Create the database if it doesn't exist
    await rootPool.query(
      `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`
    );

    // Use the database
    await rootPool.query(`USE ${dbName}`);

    console.log(`Cerita database '${dbName}' initialized successfully`);
    return true;
  } catch (error) {
    console.error("Error initializing cerita database:", error);
    throw error;
  }
}

/**
 * Get a connection to the cerita database
 * @returns {Promise<mysql.Connection>} Database connection
 */
async function getCeritaConnection() {
  return await ceritaPool.getConnection();
}

/**
 * Execute a query on the cerita database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeCeritaQuery(sql, params = []) {
  try {
    return await ceritaPool.execute(sql, params);
  } catch (error) {
    // If the error is about unknown database and the query is not a CREATE DATABASE query
    if (
      error.code === "ER_BAD_DB_ERROR" &&
      !sql.toUpperCase().includes("CREATE DATABASE")
    ) {
      // Try to create the database first
      const dbName = process.env.DB_NAME || "ceritaFlow";
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

// For backward compatibility, keep these function names but redirect to the new functions
const getMasterConnection = getCeritaConnection;
const executeMasterQuery = executeCeritaQuery;
const initializeMasterDb = initializeCeritaDb;

module.exports = {
  getCeritaConnection,
  executeCeritaQuery,
  initializeCeritaDb,
  // For backward compatibility
  getMasterConnection,
  executeMasterQuery,
  initializeMasterDb,
};
