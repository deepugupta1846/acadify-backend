const interviewService = require('./interview.service');
const emailService = require('../email/email.service');

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
    const { role, difficulty, experienceLevel } = req.body;
    const data = await interviewService.startInterview({
      role,
      difficulty,
      experienceLevel,
    });

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
    const { role, difficulty, experienceLevel, messages } = req.body;
    const data = await interviewService.endInterview({
      role,
      difficulty,
      experienceLevel,
      messages,
    });

    let emailSent = false;

    if (emailService.isEmailConfigured()) {
      try {
        await emailService.sendInterviewFeedbackEmail(req.user, data);
        emailSent = true;
      } catch (emailError) {
        console.error('Interview feedback email failed:', emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...data,
        emailSent,
      },
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
