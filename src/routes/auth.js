const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { User, Roles } = require("../models/user.model");
const Admin = require("../models/admin.model");
const { auth } = require("../middleware/auth");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Login
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("نام کاربری الزامی است"),
    body("password").notEmpty().withMessage("رمز عبور الزامی است"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;
      
      // First check if it's an admin
      let admin = await Admin.getByUsername(username);
      
      if (admin) {
        const isValidPassword = await Admin.validatePassword(admin, password);
        if (!isValidPassword) {
          return res
            .status(401)
            .json({ error: "نام کاربری یا رمز عبور نادرست است" });
        }

        const token = jwt.sign(
          {
            userId: admin.id,
            role: "ADMIN",
          },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.json({
          message: 'ورود موفقیت‌آمیز',
          user: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            firstName: admin.first_name,
            lastName: admin.last_name,
            role: "ADMIN",
            phoneNumber: admin.phone_number
          },
          token
        });
      }
      
      // If not admin, check regular users
      const user = await User.getByUsername(username);

      if (!user) {
        return res
          .status(401)
          .json({ error: "نام کاربری یا رمز عبور نادرست است" });
      }

      const isValidPassword = await User.validatePassword(user, password);
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ error: "نام کاربری یا رمز عبور نادرست است" });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: 'ورود موفقیت‌آمیز',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          phoneNumber: user.phone_number
        },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "خطا در ورود به سیستم" });
    }
  }
);

// Register
router.post(
  "/register",
  auth,
  (req, res, next) => {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "فقط مدیران می‌توانند کاربر جدید ثبت کنند" });
    }
    next();
  },
  [
    body("username").notEmpty().withMessage("نام کاربری الزامی است"),
    body("email").isEmail().withMessage("ایمیل نامعتبر است"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("رمز عبور باید حداقل ۶ کاراکتر باشد"),
    body("role").isIn(Object.values(Roles)).withMessage("نقش نامعتبر است"),
    body("firstName")
      .optional()
      .notEmpty()
      .withMessage("نام نمی‌تواند خالی باشد"),
    body("lastName")
      .optional()
      .notEmpty()
      .withMessage("نام خانوادگی نمی‌تواند خالی باشد"),
    body("phoneNumber")
      .optional()
      .matches(/^[0-9]+$/)
      .withMessage("شماره تلفن نامعتبر است"),
    body("clinicId").optional().isInt().withMessage("شناسه مطب نامعتبر است"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const existingUser = await User.getByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ error: "این ایمیل قبلاً ثبت شده است" });
      }

      const existingUsername = await User.getByUsername(req.body.username);
      if (existingUsername) {
        return res
          .status(400)
          .json({ error: "این نام کاربری قبلاً ثبت شده است" });
      }

      const userId = await User.create(req.body);
      res.status(201).json({ message: "ثبت‌نام با موفقیت انجام شد", userId });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "خطا در ثبت‌نام" });
    }
  }
);

// Get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    let user;
    
    if (req.user.role === "ADMIN") {
      user = await Admin.getById(req.user.userId);
    } else {
      user = await User.getById(req.user.userId);
    }
    
    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: req.user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "خطا در دریافت اطلاعات کاربر" });
  }
});

// Update current user profile
router.put(
  "/me",
  auth,
  [
    body("email").optional().isEmail().withMessage("ایمیل نامعتبر است"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("رمز عبور باید حداقل ۶ کاراکتر باشد"),
    body("firstName")
      .optional()
      .notEmpty()
      .withMessage("نام نمی‌تواند خالی باشد"),
    body("lastName")
      .optional()
      .notEmpty()
      .withMessage("نام خانوادگی نمی‌تواند خالی باشد"),
    body("phoneNumber")
      .optional()
      .matches(/^[0-9]+$/)
      .withMessage("شماره تلفن نامعتبر است"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.body.email) {
        let existingUser;
        
        if (req.user.role === "ADMIN") {
          existingUser = await Admin.getByEmail(req.body.email);
        } else {
          existingUser = await User.getByEmail(req.body.email);
        }
        
        if (existingUser && existingUser.id !== req.user.userId) {
          return res.status(400).json({ error: "این ایمیل قبلاً ثبت شده است" });
        }
      }

      let success;
      
      if (req.user.role === "ADMIN") {
        success = await Admin.update(req.user.userId, req.body);
      } else {
        success = await User.update(req.user.userId, req.body);
      }
      
      if (!success) {
        return res.status(404).json({ error: "کاربر یافت نشد" });
      }

      res.json({ message: "اطلاعات کاربر با موفقیت بروزرسانی شد" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "خطا در بروزرسانی اطلاعات کاربر" });
    }
  }
);

// Protected routes (require authentication)
router.use(authenticate);

// Get user profile
router.get("/profile", authController.getProfile);

// Change password
router.post(
  "/change-password",
  auth,
  [
    body("currentPassword").notEmpty().withMessage("رمز عبور فعلی الزامی است"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("رمز عبور جدید باید حداقل ۶ کاراکتر باشد")
      .not()
      .equals(body("currentPassword"))
      .withMessage("رمز عبور جدید نباید با رمز عبور فعلی یکسان باشد"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      let user;
      let isValidPassword;
      
      if (req.user.role === "ADMIN") {
        user = await Admin.getById(req.user.userId);
        isValidPassword = await Admin.validatePassword(user, currentPassword);
      } else {
        user = await User.getById(req.user.userId);
        isValidPassword = await User.validatePassword(user, currentPassword);
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "رمز عبور فعلی نادرست است" });
      }
      
      let success;
      
      if (req.user.role === "ADMIN") {
        success = await Admin.update(req.user.userId, { password: newPassword });
      } else {
        success = await User.update(req.user.userId, { password: newPassword });
      }
      
      if (!success) {
        return res.status(500).json({ error: "خطا در تغییر رمز عبور" });
      }
      
      res.json({ message: "رمز عبور با موفقیت تغییر یافت" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "خطا در تغییر رمز عبور" });
    }
  }
);

module.exports = router;
