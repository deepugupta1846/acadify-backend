const express = require('express');
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { USER_TYPES } = require('../auth/auth.constants');

const router = express.Router();

router.use(authenticate, authorize(USER_TYPES.ADMIN));

router.get('/stats', adminController.getStats);
router.get('/academies', adminController.getAcademies);
router.get('/academies/:id', adminController.getAcademyById);
router.put('/academies/:id', adminController.updateAcademy);
router.post(
  '/academies/:id/send-credentials',
  adminController.sendAcademyCredentials
);
router.delete('/academies/:id', adminController.deleteAcademy);

module.exports = router;
