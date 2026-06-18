const db = require('../../connection');

const Course = db.course;
const Classroom = db.classroom;

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildUniqueSlug = async (title, academyId, excludeId = null) => {
  const base = slugify(title) || 'course';
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await Course.findOne({
      where: { slug, academyId }
    });

    if (!existing || (excludeId && existing.id === Number(excludeId))) {
      break;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const ensureAcademyAccess = (user) => {
  if (!user.academyId) {
    const error = new Error(
      'Your account is not linked to an academy. Contact admin.'
    );
    error.status = 403;
    throw error;
  }

  return user.academyId;
};

const listCourses = async (user) => {
  const academyId = ensureAcademyAccess(user);

  return Course.findAll({
    where: { academyId },
    order: [['createdAt', 'DESC']]
  });
};

const getCourseById = async (id, user) => {
  const academyId = ensureAcademyAccess(user);
  const course = await Course.findOne({
    where: { id, academyId },
    include: [
      {
        model: Classroom,
        as: 'classes',
        attributes: [
          'id',
          'name',
          'classCode',
          'status',
          'classTime',
          'durationMinutes',
          'isLive',
          'createdAt'
        ]
      }
    ]
  });

  if (!course) {
    const error = new Error('Course not found');
    error.status = 404;
    throw error;
  }

  const plain = course.toJSON();
  if (plain.classes?.length) {
    plain.classes.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  return plain;
};

const createCourse = async (user, payload) => {
  const academyId = ensureAcademyAccess(user);
  const slug = await buildUniqueSlug(payload.title, academyId);

  return Course.create({
    academyId,
    createdBy: user.id,
    title: payload.title,
    slug,
    description: payload.description || null,
    status: payload.status || 'draft',
    level: payload.level || 'beginner',
    durationHours: payload.durationHours || null
  });
};

const updateCourse = async (id, user, payload) => {
  const course = await getCourseById(id, user);

  const updates = {
    title: payload.title ?? course.title,
    description:
      payload.description !== undefined
        ? payload.description
        : course.description,
    status: payload.status ?? course.status,
    level: payload.level ?? course.level,
    durationHours:
      payload.durationHours !== undefined
        ? payload.durationHours
        : course.durationHours
  };

  if (payload.title && payload.title !== course.title) {
    updates.slug = await buildUniqueSlug(payload.title, course.academyId, id);
  }

  await course.update(updates);
  return course;
};

const deleteCourse = async (id, user) => {
  const course = await getCourseById(id, user);
  await course.destroy();
  return true;
};

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
