require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { executeMasterQuery, initializeMasterDb } = require("./config/database");
const { setupSuperAdmin } = require("./utils/setupAdmin");
const { setupDatabaseTables } = require("./utils/setupDatabase");

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize master database
const initializeMasterDatabase = async () => {
  try {
    // First, ensure the master database exists
    await initializeMasterDb();
    
    // Setup database tables
    await setupDatabaseTables();
    
    // Setup super admin user if needed
    try {
      await setupSuperAdmin();
    } catch (error) {
      console.error("Error setting up super admin:", error);
    }
    
    console.log("Master database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing master database:", error);
    // Don't exit the process, try to continue with the application
    console.log("Attempting to continue despite database initialization error...");
  }
};

// Initialize master database on startup
initializeMasterDatabase().catch((err) => {
  console.error("Failed to initialize master database:", err);
  process.exit(1);
});

// Routes
app.use("/api/super-admin", require("./routes/superAdmin"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/users"));
app.use("/api/patients", require("./routes/patients"));
app.use("/api/visits", require("./routes/visits"));
app.use("/api/glasses", require("./routes/glasses"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/clinics", require("./routes/clinics"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "مسیر مورد نظر یافت نشد" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "دسترسی غیرمجاز" });
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "خطای سرور رخ داده است",
  });
});

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
});
