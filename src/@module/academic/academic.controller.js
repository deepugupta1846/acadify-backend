const academicService = require('./academic.service');

const requiredFields = ['name', 'email', 'phone'];

const validateRegistrationBody = (body) => {
  const missing = requiredFields.filter((field) => !body[field]?.trim?.());

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(body.email)) {
    const error = new Error('A valid email address is required');
    error.status = 400;
    throw error;
  }
};

const registerAcademy = async (req, res, next) => {
  try {
    validateRegistrationBody(req.body);

    const result = await academicService.registerAcademy({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone.trim(),
      address: req.body.address?.trim(),
      city: req.body.city?.trim(),
      state: req.body.state?.trim(),
      country: req.body.country?.trim(),
      postalCode: req.body.postalCode?.trim(),
      description: req.body.description?.trim(),
      website: req.body.website?.trim()
    });

    const { academy, emailSent, emailError, adminEmailSent, adminEmailError } =
      result;

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Academy registration submitted. A confirmation email has been sent.'
        : 'Academy registration submitted successfully',
      data: {
        id: academy.id,
        name: academy.name,
        slug: academy.slug,
        email: academy.email,
        status: academy.status,
        createdAt: academy.createdAt
      },
      emailSent,
      emailError,
      adminEmailSent,
      adminEmailError
    });
  } catch (error) {
    return next(error);
  }
};

const listPublicAcademies = async (req, res, next) => {
  try {
    const academies = await academicService.listPublicAcademies();
    return res.status(200).json({ success: true, data: academies });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerAcademy,
  listPublicAcademies
};
