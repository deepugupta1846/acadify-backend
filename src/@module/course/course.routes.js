const express = require('express');
const courseController = require('./course.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.use(authenticate, authorize(USER_TYPES.ACADEMIC));

router.get('/', courseController.listCourses);
router.post('/', courseController.createCourse);
router.get('/:id', courseController.getCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
