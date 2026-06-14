const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('./auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/register/student', authController.registerStudent);
router.post('/login', authController.login);
router.post('/forgot-password/send-otp', authController.sendPasswordResetOtp);
router.post('/forgot-password/reset', authController.resetPasswordWithOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.profile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
