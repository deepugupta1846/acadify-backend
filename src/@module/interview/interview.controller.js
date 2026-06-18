const interviewService = require('./interview.service');

const getOptions = (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: interviewService.getOptions(),
    });
  } catch (error) {
    next(error);
  }
};

const startInterview = async (req, res, next) => {
  try {
    const { role, difficulty } = req.body;
    const data = await interviewService.startInterview({ role, difficulty });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { messages, content } = req.body;
    const data = await interviewService.sendMessage({ messages, content });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const endInterview = async (req, res, next) => {
  try {
    const { role, difficulty, messages } = req.body;
    const data = await interviewService.endInterview({ role, difficulty, messages });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOptions,
  startInterview,
  sendMessage,
  endInterview,
};
