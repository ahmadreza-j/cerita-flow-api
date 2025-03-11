const { executeCeritaQuery } = require("../config/database");
const fs = require("fs");
const path = require("path");

/**
 * Setup database tables
 */
async function setupDatabaseTables() {
  try {
    console.log("Setting up database tables...");

    // Read cerita_schema.sql
    const schemaPath = path.join(__dirname, "../config/cerita_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split the schema into individual statements
    const statements = schema
      .split(";")
      .filter((statement) => statement.trim() !== "")
      .map((statement) => statement.trim() + ";");

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim() !== ";") {
        await executeCeritaQuery(statement);
      }
    }

    console.log("Database tables setup completed successfully");
  } catch (error) {
    console.error("Error setting up database tables:", error);
    throw error;
  }
}

module.exports = { setupDatabaseTables };
