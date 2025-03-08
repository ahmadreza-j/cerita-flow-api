const bcrypt = require("bcryptjs");
const { executeMasterQuery } = require("../config/database");
const readline = require("readline");
const { promisify } = require("util");

/**
 * اسکریپت ایجاد کاربر ادمین اصلی
 * این اسکریپت در اولین اجرای برنامه استفاده می‌شود
 */
async function setupSuperAdmin() {
  try {
    // بررسی وجود کاربر ادمین
    const [admins] = await executeMasterQuery(
      "SELECT COUNT(*) as count FROM super_admins"
    );

    if (admins[0].count > 0) {
      console.log("کاربر ادمین قبلاً ایجاد شده است.");
      return;
    }

    // اگر متغیرهای محیطی برای ایجاد ادمین وجود داشته باشند، از آنها استفاده می‌کنیم
    if (
      process.env.ADMIN_USERNAME &&
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD
    ) {
      await createSuperAdmin(
        process.env.ADMIN_USERNAME,
        process.env.ADMIN_EMAIL,
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_FIRST_NAME || "مدیر",
        process.env.ADMIN_LAST_NAME || "ارشد"
      );
      console.log("کاربر ادمین با استفاده از متغیرهای محیطی ایجاد شد.");
      return;
    }

    // در غیر این صورت، از کاربر اطلاعات را درخواست می‌کنیم
    console.log("ایجاد کاربر ادمین اصلی:");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = promisify(rl.question).bind(rl);

    const username = await question("نام کاربری: ");
    const email = await question("ایمیل: ");
    const password = await question("رمز عبور: ");
    const firstName = await question("نام: ");
    const lastName = await question("نام خانوادگی: ");

    rl.close();

    await createSuperAdmin(username, email, password, firstName, lastName);
    console.log("کاربر ادمین با موفقیت ایجاد شد.");
  } catch (error) {
    console.error("خطا در ایجاد کاربر ادمین:", error);
  }
}

/**
 * ایجاد کاربر ادمین در دیتابیس
 */
async function createSuperAdmin(
  username,
  email,
  password,
  firstName,
  lastName
) {
  // هش کردن رمز عبور
  const hashedPassword = await bcrypt.hash(password, 10);

  // ذخیره کاربر در دیتابیس
  await executeMasterQuery(
    `INSERT INTO super_admins (username, email, password, first_name, last_name, is_active)
     VALUES (?, ?, ?, ?, ?, true)`,
    [username, email, hashedPassword, firstName, lastName]
  );
}

module.exports = { setupSuperAdmin };
