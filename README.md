# Cerita Flow API

Backend API for Cerita Flow application, built with Node.js and Express.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create .env file (copy from .env.example):
```bash
cp .env.example .env
```

3. Edit the .env file and set your secure values:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_secure_password
DB_NAME=optometry_master
JWT_SECRET=your_random_secure_secret_key
```

4. Run development server:
```bash
npm run dev
```

5. On first run, you'll be prompted to create a super admin user, or you can set these environment variables to create one automatically:
```env
ADMIN_USERNAME=superadmin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
ADMIN_FIRST_NAME=مدیر
ADMIN_LAST_NAME=ارشد
```

## Security Notes

- Never commit your `.env` file to version control
- Generate a strong random string for JWT_SECRET
- Change default admin credentials immediately after setup
- Use strong passwords for database and admin accounts

## Features

- User authentication and authorization
- Role-based access control
- Multi-clinic management with separate databases
- Patient management
- Visit scheduling
- Product management
- Sales tracking

## API Documentation

[API documentation link will be added here]
