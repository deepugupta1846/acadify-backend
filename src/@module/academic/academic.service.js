const db = require('../../connection');
const { provisionAcademicUser } = require('./academic.credentials');
const {
  sendAcademyRegistrationPendingEmail,
  sendAdminNewAcademyRegistrationEmail,
  sendAcademyStatusEmail,
  sendAcademyCredentialsEmail
} = require('../email/email.service');

const Academy = db.academy;

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildUniqueSlug = async (name, excludeId = null) => {
  const base = slugify(name) || 'academy';
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await Academy.findOne({ where: { slug } });
    if (!existing || (excludeId && existing.id === Number(excludeId))) {
      break;
    }
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const registerAcademy = async (payload) => {
  const existingEmail = await Academy.findOne({
    where: { email: payload.email }
  });

  if (existingEmail) {
    const error = new Error('An academy with this email already exists');
    error.status = 409;
    throw error;
  }

  const slug = await buildUniqueSlug(payload.name);

  const academy = await Academy.create({
    name: payload.name,
    slug,
    email: payload.email,
    phone: payload.phone,
    address: payload.address || null,
    city: payload.city || null,
    state: payload.state || null,
    country: payload.country || null,
    postalCode: payload.postalCode || null,
    description: payload.description || null,
    website: payload.website || null,
    status: 'pending'
  });

  let emailSent = false;
  let emailError = null;
  let adminEmailSent = false;
  let adminEmailError = null;

  try {
    await sendAcademyRegistrationPendingEmail(academy);
    emailSent = true;
  } catch (error) {
    emailError = error.message || 'Failed to send registration email';
  }

  try {
    const adminResult = await sendAdminNewAcademyRegistrationEmail(academy);
    if (adminResult !== null) {
      adminEmailSent = true;
    }
  } catch (error) {
    adminEmailError = error.message || 'Failed to send admin notification email';
  }

  return { academy, emailSent, emailError, adminEmailSent, adminEmailError };
};

const getAcademyById = async (id) => {
  const academy = await Academy.findByPk(id);

  if (!academy) {
    const error = new Error('Academy not found');
    error.status = 404;
    throw error;
  }

  return academy;
};

const updateAcademy = async (id, payload) => {
  const academy = await getAcademyById(id);
  const previousStatus = academy.status;

  if (payload.email && payload.email !== academy.email) {
    const existingEmail = await Academy.findOne({
      where: { email: payload.email }
    });

    if (existingEmail) {
      const error = new Error('An academy with this email already exists');
      error.status = 409;
      throw error;
    }
  }

  const updates = {
    name: payload.name ?? academy.name,
    email: payload.email ?? academy.email,
    phone: payload.phone ?? academy.phone,
    address: payload.address !== undefined ? payload.address : academy.address,
    city: payload.city !== undefined ? payload.city : academy.city,
    state: payload.state !== undefined ? payload.state : academy.state,
    country: payload.country !== undefined ? payload.country : academy.country,
    postalCode:
      payload.postalCode !== undefined ? payload.postalCode : academy.postalCode,
    description:
      payload.description !== undefined ? payload.description : academy.description,
    website: payload.website !== undefined ? payload.website : academy.website,
    status: payload.status ?? academy.status
  };

  if (payload.name && payload.name !== academy.name) {
    updates.slug = await buildUniqueSlug(payload.name, id);
  }

  await academy.update(updates);
  await academy.reload();

  let academicCredentials = null;
  let emailSent = false;
  let emailError = null;

  if (academy.status === 'active' && previousStatus !== 'active') {
    academicCredentials = await provisionAcademicUser(academy);
  }

  if (academy.status !== previousStatus) {
    try {
      await sendAcademyStatusEmail(academy, previousStatus, academy.status);
      emailSent = true;
    } catch (error) {
      emailError = error.message || 'Failed to send status email';
    }
  }

  return { academy, academicCredentials, emailSent, emailError };
};

const sendAcademyCredentials = async (id) => {
  const academy = await getAcademyById(id);

  if (academy.status !== 'active') {
    const error = new Error(
      'Academy must be active before sending login credentials'
    );
    error.status = 400;
    throw error;
  }

  const credentials = await provisionAcademicUser(academy);
  await sendAcademyCredentialsEmail(academy, credentials);

  return { academy, credentials };
};

const deleteAcademy = async (id) => {
  const academy = await getAcademyById(id);
  await academy.destroy();
  return true;
};

const listPublicAcademies = async () => {
  const academies = await Academy.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'city', 'state', 'country'],
    order: [['name', 'ASC']]
  });

  return academies.map((item) => item.toJSON());
};

module.exports = {
  registerAcademy,
  getAcademyById,
  updateAcademy,
  sendAcademyCredentials,
  deleteAcademy,
  listPublicAcademies
};
