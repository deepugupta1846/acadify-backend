const express = require('express');
const courseController = require('./course.controller');
const courseContentController = require('./course-content.controller');
const { upload } = require('../class/upload.middleware');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.use(authenticate, authorize(USER_TYPES.ACADEMIC));

router.get('/', courseController.listCourses);
router.post('/', courseController.createCourse);

router.get('/:id/content', courseContentController.listContent);
router.post(
  '/:id/content',
  upload.single('file'),
  courseContentController.createContent
);
router.get('/:id/content/:contentId', courseContentController.getContent);
router.put(
  '/:id/content/:contentId',
  upload.single('file'),
  courseContentController.updateContent
);
router.delete(
  '/:id/content/:contentId',
  courseContentController.deleteContent
);
router.get(
  '/:id/content/:contentId/download',
  courseContentController.downloadContent
);

router.get('/:id', courseController.getCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
