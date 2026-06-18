const express = require('express');
const interviewController = require('./interview.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.get('/options', interviewController.getOptions);

router.post(
  '/start',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  interviewController.startInterview
);

router.post(
  '/chat',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  interviewController.sendMessage
);

router.post(
  '/end',
  authenticate,
  authorize(USER_TYPES.STUDENT),
  interviewController.endInterview
);

module.exports = router;
