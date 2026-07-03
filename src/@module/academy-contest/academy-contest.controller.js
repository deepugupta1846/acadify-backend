const academyContestService = require('./academy-contest.service');

const listCodingProblems = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: academyContestService.listCodingProblems()
    });
  } catch (error) {
    return next(error);
  }
};

const listAcademicContests = async (req, res, next) => {
  try {
    const data = await academyContestService.listAcademicContests(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getAcademicContest = async (req, res, next) => {
  try {
    const data = await academyContestService.getAcademicContest(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createContest = async (req, res, next) => {
  try {
    const result = await academyContestService.createContest(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Contest created and students notified',
      data: result.contest,
      notification: result.notification
    });
  } catch (error) {
    return next(error);
  }
};

const updateContest = async (req, res, next) => {
  try {
    const data = await academyContestService.updateContest(
      req.params.id,
      req.user,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Contest updated successfully',
      data
    });
  } catch (error) {
    return next(error);
  }
};

const deleteContest = async (req, res, next) => {
  try {
    await academyContestService.deleteContest(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Contest deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const listStudentContests = async (req, res, next) => {
  try {
    const data = await academyContestService.listStudentContests(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getStudentContest = async (req, res, next) => {
  try {
    const data = await academyContestService.getStudentContest(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const startAttempt = async (req, res, next) => {
  try {
    const data = await academyContestService.startAttempt(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getAttempt = async (req, res, next) => {
  try {
    const data = await academyContestService.getAttemptDetail(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const saveAnswer = async (req, res, next) => {
  try {
    const data = await academyContestService.saveAnswer(
      req.params.id,
      req.params.questionId,
      req.user,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const runCodingAnswer = async (req, res, next) => {
  try {
    const data = await academyContestService.runCodingAnswer(
      req.params.id,
      req.params.questionId,
      req.user,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const submitCodingAnswer = async (req, res, next) => {
  try {
    const data = await academyContestService.submitCodingAnswer(
      req.params.id,
      req.params.questionId,
      req.user,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const submitAttempt = async (req, res, next) => {
  try {
    const data = await academyContestService.submitAttempt(
      req.params.id,
      req.user
    );
    return res.status(200).json({
      success: true,
      message: 'Contest submitted successfully',
      data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCodingProblems,
  listAcademicContests,
  getAcademicContest,
  createContest,
  updateContest,
  deleteContest,
  listStudentContests,
  getStudentContest,
  startAttempt,
  getAttempt,
  saveAnswer,
  runCodingAnswer,
  submitCodingAnswer,
  submitAttempt
};
