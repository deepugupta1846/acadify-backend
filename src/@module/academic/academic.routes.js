const express = require('express');
const academicController = require('./academic.controller');

const router = express.Router();

router.get('/academies', academicController.listPublicAcademies);
router.post('/register', academicController.registerAcademy);

module.exports = router;
