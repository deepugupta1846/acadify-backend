const db = require('../../connection');
const academicService = require('../academic/academic.service');
const { USER_TYPES } = require('../auth/auth.constants');

const getDashboardStats = async () => {
  const [totalUsers, totalAcademies, pendingAcademies, activeAcademies] =
    await Promise.all([
      db.user.count(),
      db.academy.count(),
      db.academy.count({ where: { status: 'pending' } }),
      db.academy.count({ where: { status: 'active' } })
    ]);

  const usersByType = await Promise.all(
    Object.values(USER_TYPES).map(async (type) => ({
      type,
      count: await db.user.count({ where: { type } })
    }))
  );

  return {
    totalUsers,
    totalAcademies,
    pendingAcademies,
    activeAcademies,
    usersByType
  };
};

const listAcademies = async ({ status, limit = 20 }) => {
  const where = {};
  if (status) where.status = status;

  return db.academy.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit)
  });
};

const getAcademyById = (id) => academicService.getAcademyById(id);

const updateAcademy = (id, payload) => academicService.updateAcademy(id, payload);

const deleteAcademy = (id) => academicService.deleteAcademy(id);

module.exports = {
  getDashboardStats,
  listAcademies,
  getAcademyById,
  updateAcademy,
  deleteAcademy
};
