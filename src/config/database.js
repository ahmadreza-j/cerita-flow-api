const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'optometry_clinic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  collation: 'utf8mb4_persian_ci'
});

// Test database connection
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Execute a query with parameters
const executeQuery = async (sql, params = []) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Execute a transaction
const executeTransaction = async (queries) => {
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
    console.error('Error executing transaction:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Initialize database tables
const initializeTables = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Read and execute schema.sql
    const fs = require('fs');
    const path = require('path');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .filter(statement => statement.trim())
      .map(statement => statement + ';');

    // Execute each statement
    for (const statement of statements) {
      await connection.execute(statement);
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  initializeTables
}; 