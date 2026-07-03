const contestService = require('./contest.service');

const getOptions = (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: contestService.getOptions(),
    });
  } catch (error) {
    next(error);
  }
};

const listContests = (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: contestService.listContests(),
    });
  } catch (error) {
    next(error);
  }
};

const listProblems = (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: contestService.listProblems(),
    });
  } catch (error) {
    next(error);
  }
};

const getContest = (req, res, next) => {
  try {
    const data = contestService.getContestById(req.params.contestId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getProblem = (req, res, next) => {
  try {
    const data = contestService.getContestProblem(
      req.params.contestId,
      req.params.problemSlug
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const joinContest = (req, res, next) => {
  try {
    const data = contestService.joinContest(req.params.contestId, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const scheduleContest = (req, res, next) => {
  try {
    const data = contestService.scheduleContest(req.body, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const runCode = async (req, res, next) => {
  try {
    const { language, sourceCode } = req.body;
    const data = await contestService.runCode({
      contestId: req.params.contestId,
      problemSlug: req.params.problemSlug,
      language,
      sourceCode,
      user: req.user,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const submitCode = async (req, res, next) => {
  try {
    const { language, sourceCode } = req.body;
    const data = await contestService.submitCode({
      contestId: req.params.contestId,
      problemSlug: req.params.problemSlug,
      language,
      sourceCode,
      user: req.user,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = (req, res, next) => {
  try {
    const data = contestService.getLeaderboard(req.params.contestId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOptions,
  listContests,
  listProblems,
  getContest,
  getProblem,
  joinContest,
  scheduleContest,
  runCode,
  submitCode,
  getLeaderboard,
};
