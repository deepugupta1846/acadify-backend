const courseService = require('./course.service');

const VALID_STATUS = ['draft', 'published', 'archived'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

const validateCourseBody = (body, isUpdate = false) => {
  if (!isUpdate && !body.title?.trim()) {
    const error = new Error('Course title is required');
    error.status = 400;
    throw error;
  }

  if (body.status && !VALID_STATUS.includes(body.status)) {
    const error = new Error(`Invalid status. Allowed: ${VALID_STATUS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (body.level && !VALID_LEVELS.includes(body.level)) {
    const error = new Error(`Invalid level. Allowed: ${VALID_LEVELS.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

const listCourses = async (req, res, next) => {
  try {
    const courses = await courseService.listCourses(req.user);

    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    return next(error);
  }
};

const getCourse = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    return next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    validateCourseBody(req.body);

    const course = await courseService.createCourse(req.user, {
      title: req.body.title.trim(),
      description: req.body.description?.trim(),
      status: req.body.status,
      level: req.body.level,
      durationHours: req.body.durationHours
        ? Number(req.body.durationHours)
        : null
    });

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    return next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    validateCourseBody(req.body, true);

    const course = await courseService.updateCourse(req.params.id, req.user, {
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      status: req.body.status,
      level: req.body.level,
      durationHours:
        req.body.durationHours !== undefined
          ? Number(req.body.durationHours)
          : undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
};
