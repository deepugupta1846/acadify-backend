const express = require('express');
const academicRoutes = require('../@module/academic/academic.routes');
const authRoutes = require('../@module/auth/auth.routes');
const adminRoutes = require('../@module/admin/admin.routes');
const courseRoutes = require('../@module/course/course.routes');
const classRoutes = require('../@module/class/class.routes');

const router = express.Router();

router.use('/academic', academicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/courses', courseRoutes);
router.use('/classes', classRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Acadify API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
