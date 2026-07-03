const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');
const { PROBLEMS } = require('../contest/contest.constants');
const judgeService = require('../contest/judge.service');
const {
  sendAcademyContestScheduledEmailsToStudents,
  sendAcademyContestLiveEmailsToStudents
} = require('../email/email.service');

const AcademyContest = db.academyContest;
const AcademyContestQuestion = db.academyContestQuestion;
const AcademyContestAttempt = db.academyContestAttempt;
const AcademyContestAnswer = db.academyContestAnswer;
const User = db.user;

const VALID_TYPES = ['objective', 'theoretical', 'coding'];

const ensureAcademyAccess = (user) => {
  if (!user.academyId) {
    const error = new Error(
      'Your account is not linked to an academy. Contact admin.'
    );
    error.status = 403;
    throw error;
  }

  return user.academyId;
};

const getContestStatus = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startAt).getTime();
  const end = new Date(contest.endAt).getTime();

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'ended';
};

const getProblemBySlug = (slug) => {
  const problem = PROBLEMS.find((item) => item.slug === slug);
  if (!problem) {
    const error = new Error('Coding problem not found');
    error.status = 404;
    throw error;
  }
  return problem;
};

const validateQuestion = (question, index) => {
  const label = `Question ${index + 1}`;
  const type = question.type;

  if (!VALID_TYPES.includes(type)) {
    const error = new Error(`${label}: invalid question type`);
    error.status = 400;
    throw error;
  }

  if (!question.title?.trim()) {
    const error = new Error(`${label}: title is required`);
    error.status = 400;
    throw error;
  }

  if (type === 'objective') {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length < 2) {
      const error = new Error(`${label}: add at least two options`);
      error.status = 400;
      throw error;
    }

    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      const error = new Error(`${label}: mark exactly one correct option`);
      error.status = 400;
      throw error;
    }
  }

  if (type === 'coding') {
    const slug = question.codingProblemSlug?.trim();
    if (!slug || !PROBLEMS.some((item) => item.slug === slug)) {
      const error = new Error(`${label}: select a valid coding problem`);
      error.status = 400;
      throw error;
    }
  }
};

const formatQuestionForAcademic = (question) => {
  const plain = question.toJSON ? question.toJSON() : question;
  return {
    id: plain.id,
    type: plain.type,
    title: plain.title,
    prompt: plain.prompt,
    points: plain.points,
    sortOrder: plain.sortOrder,
    options: plain.options,
    codingProblemSlug: plain.codingProblemSlug
  };
};

const formatQuestionForStudent = (question) => {
  const plain = formatQuestionForAcademic(question);
  if (plain.type === 'objective' && Array.isArray(plain.options)) {
    plain.options = plain.options.map(({ id, text }) => ({ id, text }));
  }
  if (plain.type === 'coding' && plain.codingProblemSlug) {
    const problem = getProblemBySlug(plain.codingProblemSlug);
    plain.codingProblem = {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      examples: problem.examples,
      constraints: problem.constraints,
      starterCode: problem.starterCode
    };
  }
  return plain;
};

const enrichContest = (contest, questions = []) => {
  const plain = contest.toJSON ? contest.toJSON() : contest;
  const status = getContestStatus(plain);
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return {
    id: plain.id,
    title: plain.title,
    description: plain.description,
    startAt: plain.startAt,
    endAt: plain.endAt,
    durationMinutes: plain.durationMinutes,
    status,
    questionCount: questions.length,
    totalPoints,
    notifiedAt: plain.notifiedAt,
    liveNotifiedAt: plain.liveNotifiedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const getAcademyStudents = async (academyId) =>
  User.findAll({
    where: {
      academyId,
      type: USER_TYPES.STUDENT,
      isActive: true
    },
    attributes: ['id', 'email', 'name']
  });

const getContestForAcademy = async (contestId, user) => {
  const academyId = ensureAcademyAccess(user);
  const contest = await AcademyContest.findOne({
    where: { id: contestId, academyId }
  });

  if (!contest) {
    const error = new Error('Contest not found');
    error.status = 404;
    throw error;
  }

  return contest;
};

const getContestForStudent = async (contestId, user) => {
  if (!user.academyId) {
    const error = new Error('Your account is not linked to an academy');
    error.status = 403;
    throw error;
  }

  const contest = await AcademyContest.findOne({
    where: { id: contestId, academyId: user.academyId }
  });

  if (!contest) {
    const error = new Error('Contest not found');
    error.status = 404;
    throw error;
  }

  return contest;
};

const getContestQuestions = async (contestId) =>
  AcademyContestQuestion.findAll({
    where: { contestId },
    order: [
      ['sortOrder', 'ASC'],
      ['id', 'ASC']
    ]
  });

const listCodingProblems = () =>
  PROBLEMS.map((problem) => ({
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    points: problem.points,
    tags: problem.tags
  }));

const listAcademicContests = async (user) => {
  const academyId = ensureAcademyAccess(user);
  const contests = await AcademyContest.findAll({
    where: { academyId },
    order: [['startAt', 'DESC']]
  });

  const results = await Promise.all(
    contests.map(async (contest) => {
      const questions = await getContestQuestions(contest.id);
      return enrichContest(contest, questions);
    })
  );

  return results;
};

const getAcademicContest = async (contestId, user) => {
  const contest = await getContestForAcademy(contestId, user);
  const questions = await getContestQuestions(contest.id);
  const attempts = await AcademyContestAttempt.findAll({
    where: { contestId: contest.id },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['submittedAt', 'DESC']]
  });

  return {
    ...enrichContest(contest, questions),
    questions: questions.map(formatQuestionForAcademic),
    attempts: attempts.map((attempt) => {
      const plain = attempt.toJSON();
      return {
        id: plain.id,
        student: plain.student,
        status: plain.status,
        score: plain.score,
        startedAt: plain.startedAt,
        submittedAt: plain.submittedAt
      };
    })
  };
};

const createContest = async (user, payload) => {
  const academyId = ensureAcademyAccess(user);

  if (!payload.title?.trim()) {
    const error = new Error('Contest title is required');
    error.status = 400;
    throw error;
  }

  const durationMinutes = Number(payload.durationMinutes);
  if (!durationMinutes || durationMinutes < 1) {
    const error = new Error('Duration must be at least 1 minute');
    error.status = 400;
    throw error;
  }

  const startAt = new Date(payload.startAt);
  if (Number.isNaN(startAt.getTime())) {
    const error = new Error('Valid start date and time is required');
    error.status = 400;
    throw error;
  }

  if (startAt.getTime() <= Date.now()) {
    const error = new Error('Start time must be in the future');
    error.status = 400;
    throw error;
  }

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (!questions.length) {
    const error = new Error('Add at least one question');
    error.status = 400;
    throw error;
  }

  questions.forEach((question, index) => validateQuestion(question, index));

  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

  const contest = await AcademyContest.create({
    academyId,
    createdBy: user.id,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    startAt,
    durationMinutes,
    endAt
  });

  await Promise.all(
    questions.map((question, index) =>
      AcademyContestQuestion.create({
        contestId: contest.id,
        type: question.type,
        title: question.title.trim(),
        prompt: question.prompt?.trim() || null,
        points: Number(question.points) > 0 ? Number(question.points) : 10,
        sortOrder: index,
        options:
          question.type === 'objective'
            ? question.options.map((option, optionIndex) => ({
                id: option.id || `opt-${optionIndex + 1}`,
                text: String(option.text || '').trim(),
                isCorrect: Boolean(option.isCorrect)
              }))
            : null,
        codingProblemSlug:
          question.type === 'coding'
            ? question.codingProblemSlug.trim()
            : null
      })
    )
  );

  const savedQuestions = await getContestQuestions(contest.id);
  const students = await getAcademyStudents(academyId);
  const notification = await sendAcademyContestScheduledEmailsToStudents(
    contest,
    students
  );

  await contest.update({ notifiedAt: new Date() });

  return {
    contest: enrichContest(contest, savedQuestions),
    notification
  };
};

const updateContest = async (contestId, user, payload) => {
  const contest = await getContestForAcademy(contestId, user);
  if (getContestStatus(contest) !== 'upcoming') {
    const error = new Error('Only upcoming contests can be edited');
    error.status = 400;
    throw error;
  }

  const updates = {};
  if (payload.title !== undefined) {
    if (!payload.title?.trim()) {
      const error = new Error('Contest title is required');
      error.status = 400;
      throw error;
    }
    updates.title = payload.title.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description?.trim() || null;
  }

  let startAt = contest.startAt;
  let durationMinutes = contest.durationMinutes;

  if (payload.startAt !== undefined) {
    startAt = new Date(payload.startAt);
    if (Number.isNaN(startAt.getTime())) {
      const error = new Error('Valid start date and time is required');
      error.status = 400;
      throw error;
    }
    if (startAt.getTime() <= Date.now()) {
      const error = new Error('Start time must be in the future');
      error.status = 400;
      throw error;
    }
    updates.startAt = startAt;
  }

  if (payload.durationMinutes !== undefined) {
    durationMinutes = Number(payload.durationMinutes);
    if (!durationMinutes || durationMinutes < 1) {
      const error = new Error('Duration must be at least 1 minute');
      error.status = 400;
      throw error;
    }
    updates.durationMinutes = durationMinutes;
  }

  if (updates.startAt || updates.durationMinutes) {
    updates.endAt = new Date(
      new Date(startAt).getTime() + durationMinutes * 60 * 1000
    );
  }

  await contest.update(updates);

  if (Array.isArray(payload.questions)) {
    if (!payload.questions.length) {
      const error = new Error('Add at least one question');
      error.status = 400;
      throw error;
    }

    payload.questions.forEach((question, index) =>
      validateQuestion(question, index)
    );

    await AcademyContestQuestion.destroy({ where: { contestId: contest.id } });
    await Promise.all(
      payload.questions.map((question, index) =>
        AcademyContestQuestion.create({
          contestId: contest.id,
          type: question.type,
          title: question.title.trim(),
          prompt: question.prompt?.trim() || null,
          points: Number(question.points) > 0 ? Number(question.points) : 10,
          sortOrder: index,
          options:
            question.type === 'objective'
              ? question.options.map((option, optionIndex) => ({
                  id: option.id || `opt-${optionIndex + 1}`,
                  text: String(option.text || '').trim(),
                  isCorrect: Boolean(option.isCorrect)
                }))
              : null,
          codingProblemSlug:
            question.type === 'coding'
              ? question.codingProblemSlug.trim()
              : null
        })
      )
    );
  }

  const questions = await getContestQuestions(contest.id);
  return enrichContest(contest, questions);
};

const deleteContest = async (contestId, user) => {
  const contest = await getContestForAcademy(contestId, user);
  if (getContestStatus(contest) !== 'upcoming') {
    const error = new Error('Only upcoming contests can be deleted');
    error.status = 400;
    throw error;
  }

  await contest.destroy();
  return { id: contestId };
};

const listStudentContests = async (user) => {
  if (!user.academyId) {
    return { live: [], upcoming: [], past: [] };
  }

  const contests = await AcademyContest.findAll({
    where: { academyId: user.academyId },
    order: [['startAt', 'DESC']]
  });

  const enriched = await Promise.all(
    contests.map(async (contest) => {
      const questions = await getContestQuestions(contest.id);
      const attempt = await AcademyContestAttempt.findOne({
        where: { contestId: contest.id, studentId: user.id }
      });

      return {
        ...enrichContest(contest, questions),
        attemptStatus: attempt?.status || null,
        attemptScore: attempt?.score ?? null
      };
    })
  );

  return {
    live: enriched.filter((item) => item.status === 'live'),
    upcoming: enriched.filter((item) => item.status === 'upcoming'),
    past: enriched.filter((item) => item.status === 'ended'),
    all: enriched
  };
};

const getStudentContest = async (contestId, user) => {
  const contest = await getContestForStudent(contestId, user);
  const questions = await getContestQuestions(contest.id);
  const attempt = await AcademyContestAttempt.findOne({
    where: { contestId: contest.id, studentId: user.id }
  });

  return {
    ...enrichContest(contest, questions),
    questions: questions.map(formatQuestionForStudent),
    attempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status,
          score: attempt.score,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt
        }
      : null
  };
};

const ensureContestLive = (contest) => {
  const status = getContestStatus(contest);
  if (status === 'upcoming') {
    const error = new Error('Contest has not started yet');
    error.status = 400;
    throw error;
  }
  if (status === 'ended') {
    const error = new Error('Contest has ended');
    error.status = 400;
    throw error;
  }
};

const getOrCreateAttempt = async (contest, user) => {
  let attempt = await AcademyContestAttempt.findOne({
    where: { contestId: contest.id, studentId: user.id }
  });

  if (!attempt) {
    attempt = await AcademyContestAttempt.create({
      contestId: contest.id,
      studentId: user.id,
      startedAt: new Date(),
      status: 'in_progress'
    });
  }

  return attempt;
};

const startAttempt = async (contestId, user) => {
  const contest = await getContestForStudent(contestId, user);
  ensureContestLive(contest);
  const attempt = await getOrCreateAttempt(contest, user);

  if (attempt.status !== 'in_progress') {
    const error = new Error('Contest attempt already submitted');
    error.status = 400;
    throw error;
  }

  return {
    contest: enrichContest(contest, await getContestQuestions(contest.id)),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score
    }
  };
};

const getAttemptDetail = async (contestId, user) => {
  const contest = await getContestForStudent(contestId, user);
  const questions = await getContestQuestions(contest.id);
  const attempt = await AcademyContestAttempt.findOne({
    where: { contestId: contest.id, studentId: user.id }
  });

  if (!attempt) {
    const error = new Error('Contest attempt not found');
    error.status = 404;
    throw error;
  }

  const answers = await AcademyContestAnswer.findAll({
    where: { attemptId: attempt.id }
  });
  const answerMap = answers.reduce((acc, answer) => {
    acc[answer.questionId] = {
      selectedOptionId: answer.selectedOptionId,
      answerText: answer.answerText,
      sourceCode: answer.sourceCode,
      language: answer.language,
      verdict: answer.verdict,
      score: answer.score,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt
    };
    return acc;
  }, {});

  return {
    contest: enrichContest(contest, questions),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score
    },
    questions: questions.map(formatQuestionForStudent),
    answers: answerMap
  };
};

const gradeObjectiveAnswer = (question, selectedOptionId) => {
  const options = question.options || [];
  const selected = options.find((option) => option.id === selectedOptionId);
  const isCorrect = Boolean(selected?.isCorrect);
  return {
    score: isCorrect ? question.points : 0,
    isCorrect
  };
};

const gradeTheoreticalAnswer = (question, answerText) => {
  const trimmed = answerText?.trim() || '';
  const isCorrect = trimmed.length >= 10;
  return {
    score: isCorrect ? question.points : 0,
    isCorrect
  };
};

const saveAnswer = async (contestId, questionId, user, payload) => {
  const contest = await getContestForStudent(contestId, user);
  ensureContestLive(contest);

  const attempt = await getOrCreateAttempt(contest, user);
  if (attempt.status !== 'in_progress') {
    const error = new Error('Contest attempt already submitted');
    error.status = 400;
    throw error;
  }

  const question = await AcademyContestQuestion.findOne({
    where: { id: questionId, contestId: contest.id }
  });

  if (!question) {
    const error = new Error('Question not found');
    error.status = 404;
    throw error;
  }

  let answerPayload = {
    attemptId: attempt.id,
    questionId: question.id,
    answeredAt: new Date(),
    score: 0,
    isCorrect: null,
    selectedOptionId: null,
    answerText: null,
    sourceCode: null,
    language: null,
    verdict: null
  };

  if (question.type === 'objective') {
    const selectedOptionId = payload.selectedOptionId?.trim();
    if (!selectedOptionId) {
      const error = new Error('Select an option');
      error.status = 400;
      throw error;
    }
    const graded = gradeObjectiveAnswer(question, selectedOptionId);
    answerPayload = {
      ...answerPayload,
      selectedOptionId,
      ...graded
    };
  } else if (question.type === 'theoretical') {
    const answerText = payload.answerText?.trim();
    if (!answerText) {
      const error = new Error('Answer text is required');
      error.status = 400;
      throw error;
    }
    const graded = gradeTheoreticalAnswer(question, answerText);
    answerPayload = {
      ...answerPayload,
      answerText,
      ...graded
    };
  } else {
    const error = new Error('Use code submit endpoint for coding questions');
    error.status = 400;
    throw error;
  }

  const [answer] = await AcademyContestAnswer.findOrCreate({
    where: { attemptId: attempt.id, questionId: question.id },
    defaults: answerPayload
  });

  if (!answer.isNewRecord) {
    await answer.update(answerPayload);
  }

  return {
    questionId: question.id,
    score: answerPayload.score,
    isCorrect: answerPayload.isCorrect
  };
};

const runCodingAnswer = async (contestId, questionId, user, payload) => {
  const contest = await getContestForStudent(contestId, user);
  ensureContestLive(contest);
  await getOrCreateAttempt(contest, user);

  const question = await AcademyContestQuestion.findOne({
    where: { id: questionId, contestId: contest.id, type: 'coding' }
  });

  if (!question) {
    const error = new Error('Coding question not found');
    error.status = 404;
    throw error;
  }

  const problem = getProblemBySlug(question.codingProblemSlug);
  const language = payload.language;
  const sourceCode = payload.sourceCode;
  const functionName = problem.functionName?.[language];

  if (!functionName) {
    const error = new Error(`Language "${language}" is not supported`);
    error.status = 400;
    throw error;
  }

  if (!sourceCode?.trim()) {
    const error = new Error('Source code is required');
    error.status = 400;
    throw error;
  }

  const verdict = await judgeService.judgeSubmission({
    language,
    userCode: sourceCode,
    functionName,
    testCases: problem.testCases,
    problem,
    sampleOnly: true
  });

  return { mode: 'run', ...verdict };
};

const submitCodingAnswer = async (contestId, questionId, user, payload) => {
  const contest = await getContestForStudent(contestId, user);
  ensureContestLive(contest);

  const attempt = await getOrCreateAttempt(contest, user);
  if (attempt.status !== 'in_progress') {
    const error = new Error('Contest attempt already submitted');
    error.status = 400;
    throw error;
  }

  const question = await AcademyContestQuestion.findOne({
    where: { id: questionId, contestId: contest.id, type: 'coding' }
  });

  if (!question) {
    const error = new Error('Coding question not found');
    error.status = 404;
    throw error;
  }

  const problem = getProblemBySlug(question.codingProblemSlug);
  const language = payload.language;
  const sourceCode = payload.sourceCode;
  const functionName = problem.functionName?.[language];

  if (!functionName) {
    const error = new Error(`Language "${language}" is not supported`);
    error.status = 400;
    throw error;
  }

  if (!sourceCode?.trim()) {
    const error = new Error('Source code is required');
    error.status = 400;
    throw error;
  }

  const verdict = await judgeService.judgeSubmission({
    language,
    userCode: sourceCode,
    functionName,
    testCases: problem.testCases,
    problem,
    sampleOnly: false
  });

  const isCorrect = verdict.status === judgeService.STATUS.ACCEPTED;
  const answerPayload = {
    attemptId: attempt.id,
    questionId: question.id,
    sourceCode,
    language,
    verdict,
    score: isCorrect ? question.points : 0,
    isCorrect,
    answeredAt: new Date()
  };

  const [answer] = await AcademyContestAnswer.findOrCreate({
    where: { attemptId: attempt.id, questionId: question.id },
    defaults: answerPayload
  });

  if (!answer.isNewRecord) {
    await answer.update(answerPayload);
  }

  return {
    questionId: question.id,
    score: answerPayload.score,
    isCorrect,
    verdict
  };
};

const finalizeAttempt = async (attempt, auto = false) => {
  if (attempt.status !== 'in_progress') {
    return attempt;
  }

  const answers = await AcademyContestAnswer.findAll({
    where: { attemptId: attempt.id }
  });
  const score = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);

  await attempt.update({
    status: auto ? 'auto_submitted' : 'submitted',
    submittedAt: new Date(),
    score
  });

  return attempt;
};

const submitAttempt = async (contestId, user) => {
  const contest = await getContestForStudent(contestId, user);
  ensureContestLive(contest);

  const attempt = await AcademyContestAttempt.findOne({
    where: { contestId: contest.id, studentId: user.id }
  });

  if (!attempt) {
    const error = new Error('Start the contest before submitting');
    error.status = 400;
    throw error;
  }

  const finalized = await finalizeAttempt(attempt, false);
  return {
    attemptId: finalized.id,
    status: finalized.status,
    score: finalized.score,
    submittedAt: finalized.submittedAt
  };
};

const autoSubmitContestAttempts = async (contest) => {
  const attempts = await AcademyContestAttempt.findAll({
    where: { contestId: contest.id, status: 'in_progress' }
  });

  await Promise.all(attempts.map((attempt) => finalizeAttempt(attempt, true)));
  return attempts.length;
};

const processScheduledContests = async () => {
  const now = new Date();
  const contests = await AcademyContest.findAll();

  let liveNotifications = 0;
  let autoSubmitted = 0;

  for (const contest of contests) {
    const status = getContestStatus(contest);

    if (
      status === 'live' &&
      !contest.liveNotifiedAt &&
      new Date(contest.startAt) <= now
    ) {
      const students = await getAcademyStudents(contest.academyId);
      await sendAcademyContestLiveEmailsToStudents(contest, students);
      await contest.update({ liveNotifiedAt: now });
      liveNotifications += 1;
    }

    if (status === 'ended' && new Date(contest.endAt) <= now) {
      const count = await autoSubmitContestAttempts(contest);
      autoSubmitted += count;
    }
  }

  return { liveNotifications, autoSubmitted };
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
  getAttemptDetail,
  saveAnswer,
  runCodingAnswer,
  submitCodingAnswer,
  submitAttempt,
  processScheduledContests,
  getContestStatus
};
