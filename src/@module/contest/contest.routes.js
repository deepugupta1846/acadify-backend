const express = require('express');
const contestController = require('./contest.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();
const studentOnly = [authenticate, authorize(USER_TYPES.STUDENT)];

router.get('/options', contestController.getOptions);
router.get('/list', contestController.listContests);
router.get('/problems', contestController.listProblems);

router.get('/:contestId', contestController.getContest);
router.get('/:contestId/leaderboard', contestController.getLeaderboard);

router.post('/schedule', ...studentOnly, contestController.scheduleContest);
router.post('/:contestId/join', ...studentOnly, contestController.joinContest);

router.get(
  '/:contestId/problem/:problemSlug',
  contestController.getProblem
);

router.post(
  '/:contestId/problem/:problemSlug/run',
  ...studentOnly,
  contestController.runCode
);

router.post(
  '/:contestId/problem/:problemSlug/submit',
  ...studentOnly,
  contestController.submitCode
);

module.exports = router;
