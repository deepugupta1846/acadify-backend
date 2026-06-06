require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/connection');

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@acadify.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Platform Admin';

  try {
    await db.sequelize.authenticate();
    await db.user.sync();
    await db.authToken.sync();

    const existing = await db.user.scope('withPassword').findOne({ where: { email } });

    if (existing) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      email,
      password: hashedPassword,
      type: 'admin',
      name,
      isActive: true
    });

    console.log('Admin user created successfully');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
