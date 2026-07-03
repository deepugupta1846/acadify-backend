const express = require('express');
const academyContestController = require('./academy-contest.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.get(
  '/coding-problems',
  authenticate,
  authorize(USER_TYPES.ACADEMIC),
  academyContestController.listCodingProblems
);

router.get(
  '/student',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.listStudentContests
);

router.get(
  '/student/:id',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.getStudentContest
);

router.post(
  '/student/:id/start',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.startAttempt
);

router.get(
  '/student/:id/attempt',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.getAttempt
);

router.put(
  '/student/:id/attempt/answers/:questionId',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.saveAnswer
);

router.post(
  '/student/:id/questions/:questionId/run',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.runCodingAnswer
);

router.post(
  '/student/:id/questions/:questionId/submit-code',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.submitCodingAnswer
);

router.post(
  '/student/:id/submit',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  academyContestController.submitAttempt
);

router.use(authenticate, authorize(USER_TYPES.ACADEMIC));

router.get('/', academyContestController.listAcademicContests);
router.post('/', academyContestController.createContest);
router.get('/:id', academyContestController.getAcademicContest);
router.put('/:id', academyContestController.updateContest);
router.delete('/:id', academyContestController.deleteContest);

module.exports = router;
