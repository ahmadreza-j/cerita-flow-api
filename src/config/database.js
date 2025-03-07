const mysql = require('mysql2/promise');
require('dotenv').config();

// Main connection pool for the master database
const masterPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'optometry_master',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Store clinic-specific connection pools
const clinicPools = new Map();

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
    throw new Error('Clinic database name is required');
  }

  // If we already have a pool for this clinic, use it
  if (clinicPools.has(clinicDbName)) {
    return await clinicPools.get(clinicDbName).getConnection();
  }

  // Otherwise, create a new pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: clinicDbName,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
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
    // Create the database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${clinicDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);
    
    // Use the new database
    await connection.query(`USE ${clinicDbName}`);
    
    // Execute the schema creation script
    const schemaScript = require('fs').readFileSync(__dirname + '/schema.sql', 'utf8');
    const statements = schemaScript
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');
    
    // Skip the first statement which is the CREATE DATABASE statement
    for (let i = 1; i < statements.length; i++) {
      await connection.query(statements[i]);
    }
    
    // Insert clinic information
    await connection.query(
      `INSERT INTO clinics (name, created_at) VALUES (?, NOW())`,
      [clinicName]
    );
    
    return true;
  } catch (error) {
    console.error('Error creating clinic database:', error);
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
  return await masterPool.execute(sql, params);
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
    throw new Error('Clinic database name is required');
  }
  
  // If we don't have a pool for this clinic yet, create one
  if (!clinicPools.has(clinicDbName)) {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: clinicDbName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
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
  const [rows] = await executeMasterQuery(
    `SELECT table_schema FROM information_schema.tables 
     WHERE table_schema LIKE 'optometry_%' 
     AND table_schema != 'optometry_master'
     GROUP BY table_schema`
  );
  return rows.map(row => row.table_schema);
}

module.exports = {
  getMasterConnection,
  getClinicConnection,
  createClinicDatabase,
  executeMasterQuery,
  executeClinicQuery,
  listClinicDatabases
}; 