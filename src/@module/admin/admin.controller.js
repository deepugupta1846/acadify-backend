const adminService = require('./admin.service');

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    return next(error);
  }
};

const getAcademies = async (req, res, next) => {
  try {
    const academies = await adminService.listAcademies({
      status: req.query.status,
      limit: req.query.limit
    });

    return res.status(200).json({
      success: true,
      data: academies
    });
  } catch (error) {
    return next(error);
  }
};

const getAcademyById = async (req, res, next) => {
  try {
    const academy = await adminService.getAcademyById(req.params.id);

    return res.status(200).json({
      success: true,
      data: academy
    });
  } catch (error) {
    return next(error);
  }
};

const updateAcademy = async (req, res, next) => {
  try {
    const result = await adminService.updateAcademy(req.params.id, {
      name: req.body.name?.trim(),
      email: req.body.email?.trim()?.toLowerCase(),
      phone: req.body.phone?.trim(),
      address: req.body.address?.trim(),
      city: req.body.city?.trim(),
      state: req.body.state?.trim(),
      country: req.body.country?.trim(),
      postalCode: req.body.postalCode?.trim(),
      description: req.body.description?.trim(),
      website: req.body.website?.trim(),
      status: req.body.status
    });

    const message = result.academicCredentials
      ? 'Academy activated. Default academic login credentials created.'
      : 'Academy updated successfully';

    return res.status(200).json({
      success: true,
      message,
      data: result.academy,
      academicCredentials: result.academicCredentials || null
    });
  } catch (error) {
    return next(error);
  }
};

const deleteAcademy = async (req, res, next) => {
  try {
    await adminService.deleteAcademy(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Academy deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStats,
  getAcademies,
  getAcademyById,
  updateAcademy,
  deleteAcademy
};
