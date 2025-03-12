const { executeCeritaQuery } = require("../config/database");

/**
 * Apply schema changes to the database
 */
async function applySchemaChanges() {
  try {
    console.log("Applying schema changes...");

    // Check if the email column exists in the patients table
    const [columns] = await executeCeritaQuery(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'patients' 
       AND COLUMN_NAME = 'email'`
    );

    // If the email column exists, remove it
    if (columns.length > 0) {
      console.log("Removing email column from patients table...");
      await executeCeritaQuery("ALTER TABLE patients DROP COLUMN email");
      console.log("Email column removed successfully");
    } else {
      console.log("Email column does not exist in patients table");
    }

    console.log("Schema changes applied successfully");
  } catch (error) {
    console.error("Error applying schema changes:", error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  applySchemaChanges()
    .then(() => {
      console.log("Schema changes completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

module.exports = { applySchemaChanges }; 