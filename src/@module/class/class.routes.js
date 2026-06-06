const express = require('express');
const classController = require('./class.controller');
const { upload } = require('./upload.middleware');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.post(
  '/join',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  classController.joinClass
);

router.get(
  '/enrolled',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  classController.listEnrolledClasses
);

router.get(
  '/attendance/my',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  classController.getMyAttendance
);

router.get(
  '/:id/enrolled',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  classController.getEnrolledClass
);

router.get(
  '/:id/live-token',
  authenticate,
  authorize(USER_TYPES.ACADEMIC, USER_TYPES.STUDENT),
  classController.getLiveToken
);

router.get(
  '/:id/recordings',
  authenticate,
  authorize(USER_TYPES.ACADEMIC, USER_TYPES.STUDENT),
  classController.listRecordings
);

router.get(
  '/:id/sessions',
  authenticate,
  authorize(USER_TYPES.ACADEMIC, USER_TYPES.STUDENT),
  classController.listSessions
);

router.get(
  '/:id/sessions/:sessionId',
  authenticate,
  authorize(USER_TYPES.ACADEMIC, USER_TYPES.STUDENT),
  classController.getSessionDetail
);

router.get(
  '/:id/sessions/:sessionId/materials/:materialId/download',
  authenticate,
  authorize(USER_TYPES.ACADEMIC, USER_TYPES.STUDENT),
  classController.downloadSessionMaterial
);

router.use(authenticate, authorize(USER_TYPES.ACADEMIC));

router.get('/', classController.listClasses);
router.post('/', classController.createClass);
router.get('/:id', classController.getClass);
router.put('/:id', classController.updateClass);
router.post('/:id/start-live', classController.startLiveClass);
router.post('/:id/end-live', classController.endLiveClass);
router.post('/:id/start-recording', classController.startRecording);
router.post('/:id/stop-recording', classController.stopRecording);
router.delete('/:id', classController.deleteClass);
router.get('/:id/attendance', classController.getClassAttendance);

router.post(
  '/:id/sessions/:sessionId/materials',
  upload.single('file'),
  classController.createSessionMaterial
);
router.delete(
  '/:id/sessions/:sessionId/materials/:materialId',
  classController.deleteSessionMaterial
);
router.post(
  '/:id/sessions/:sessionId/assignments',
  classController.createSessionAssignment
);
router.delete(
  '/:id/sessions/:sessionId/assignments/:assignmentId',
  classController.deleteSessionAssignment
);

module.exports = router;
