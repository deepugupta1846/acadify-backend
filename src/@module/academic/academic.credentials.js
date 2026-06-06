const bcrypt = require('bcryptjs');
const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');

const DEFAULT_ACADEMIC_PASSWORD =
  process.env.ACADEMIC_DEFAULT_PASSWORD || '123456789';

const provisionAcademicUser = async (academy) => {
  const User = db.user;

  const userData = {
    email: academy.email,
    name: academy.name,
    phone: academy.phone,
    type: USER_TYPES.ACADEMIC,
    academyId: academy.id,
    isActive: true
  };

  const hashedPassword = await bcrypt.hash(DEFAULT_ACADEMIC_PASSWORD, 10);

  const existingByAcademy = await User.scope('withPassword').findOne({
    where: {
      academyId: academy.id,
      type: USER_TYPES.ACADEMIC
    }
  });

  if (existingByAcademy) {
    await existingByAcademy.update({
      ...userData,
      password: hashedPassword
    });

    return {
      created: false,
      updated: true,
      email: academy.email,
      password: DEFAULT_ACADEMIC_PASSWORD,
      name: academy.name,
      phone: academy.phone
    };
  }

  const existingByEmail = await User.scope('withPassword').findOne({
    where: { email: academy.email }
  });

  if (existingByEmail) {
    await existingByEmail.update({
      ...userData,
      password: hashedPassword
    });

    return {
      created: false,
      updated: true,
      email: academy.email,
      password: DEFAULT_ACADEMIC_PASSWORD,
      name: academy.name,
      phone: academy.phone
    };
  }

  await User.create({
    ...userData,
    password: hashedPassword
  });

  return {
    created: true,
    updated: false,
    email: academy.email,
    password: DEFAULT_ACADEMIC_PASSWORD,
    name: academy.name,
    phone: academy.phone
  };
};

module.exports = {
  DEFAULT_ACADEMIC_PASSWORD,
  provisionAcademicUser
};
