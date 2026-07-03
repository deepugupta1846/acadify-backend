const {
  SUPPORTED_LANGUAGES,
  DIFFICULTIES,
  PROBLEMS,
  buildDefaultContests,
} = require('./contest.constants');
const judgeService = require('./judge.service');

const contests = buildDefaultContests();
const participants = new Map();
const submissions = [];

function getContestStatus(contest) {
  const now = Date.now();
  const start = new Date(contest.startAt).getTime();
  const end = new Date(contest.endAt).getTime();

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'ended';
}

function enrichContest(contest) {
  const status = getContestStatus(contest);
  const problems = contest.problemSlugs
    .map((slug) => PROBLEMS.find((p) => p.slug === slug))
    .filter(Boolean)
    .map((problem, index) => ({
      order: index + 1,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      points: problem.points,
    }));

  return {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    type: contest.type,
    durationMinutes: contest.durationMinutes,
    startAt: contest.startAt,
    endAt: contest.endAt,
    status,
    problemCount: problems.length,
    problems,
    createdBy: contest.createdBy || null,
  };
}

function getOptions() {
  return {
    languages: SUPPORTED_LANGUAGES.map(({ id, label, monacoId }) => ({
      id,
      label,
      monacoId,
    })),
    difficulties: DIFFICULTIES,
    problemCount: PROBLEMS.length,
  };
}

function listContests() {
  const enriched = contests.map(enrichContest);
  return {
    live: enriched.filter((c) => c.status === 'live'),
    upcoming: enriched.filter((c) => c.status === 'upcoming'),
    past: enriched.filter((c) => c.status === 'ended'),
    all: enriched,
  };
}

function getContestById(contestId) {
  const contest = contests.find((c) => c.id === contestId);
  if (!contest) {
    const error = new Error('Contest not found');
    error.status = 404;
    throw error;
  }
  return enrichContest(contest);
}

function getProblemBySlug(slug) {
  const problem = PROBLEMS.find((p) => p.slug === slug);
  if (!problem) {
    const error = new Error('Problem not found');
    error.status = 404;
    throw error;
  }
  return problem;
}

function serializeProblem(problem, includeHidden = false) {
  return {
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    points: problem.points,
    tags: problem.tags,
    description: problem.description,
    examples: problem.examples,
    constraints: problem.constraints,
    starterCode: problem.starterCode,
    sampleTestCases: problem.testCases
      .filter((tc) => tc.sample)
      .map((tc) => ({ input: tc.input, output: tc.output })),
    testCaseCount: includeHidden
      ? problem.testCases.length
      : problem.testCases.filter((tc) => tc.sample).length,
  };
}

function getContestProblem(contestId, problemSlug) {
  const contest = getContestById(contestId);
  if (!contest.problems.some((p) => p.slug === problemSlug)) {
    const error = new Error('Problem is not part of this contest');
    error.status = 404;
    throw error;
  }
  return serializeProblem(getProblemBySlug(problemSlug));
}

function joinContest(contestId, user) {
  const contest = getContestById(contestId);
  const key = `${contestId}:${user.id}`;

  if (!participants.has(key)) {
    participants.set(key, {
      contestId,
      userId: user.id,
      userName: user.name,
      joinedAt: new Date().toISOString(),
      score: 0,
      solvedProblems: [],
    });
  }

  return {
    contest,
    participant: participants.get(key),
  };
}

function scheduleContest({ title, durationMinutes, problemSlugs, startAt }, user) {
  if (!title?.trim()) {
    const error = new Error('Contest title is required');
    error.status = 400;
    throw error;
  }

  const duration = Number(durationMinutes) || 90;
  const slugs =
    Array.isArray(problemSlugs) && problemSlugs.length
      ? problemSlugs.filter((slug) => PROBLEMS.some((p) => p.slug === slug))
      : ['two-sum', 'valid-parentheses', 'reverse-string'];

  if (!slugs.length) {
    const error = new Error('Select at least one valid problem');
    error.status = 400;
    throw error;
  }

  const start = startAt ? new Date(startAt) : new Date();
  if (Number.isNaN(start.getTime())) {
    const error = new Error('Invalid start time');
    error.status = 400;
    throw error;
  }

  const end = new Date(start.getTime() + duration * 60 * 1000);
  const id = `practice-${user.id}-${Date.now()}`;

  const contest = {
    id,
    title: title.trim(),
    description: 'Personal practice contest scheduled by you.',
    type: 'practice',
    durationMinutes: duration,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    problemSlugs: slugs,
    createdBy: user.id,
  };

  contests.unshift(contest);
  return enrichContest(contest);
}

async function runCode({
  contestId,
  problemSlug,
  language,
  sourceCode,
  user,
}) {
  getContestById(contestId);
  const problem = getProblemBySlug(problemSlug);
  const functionName = problem.functionName?.[language];

  if (!functionName) {
    const error = new Error(`Language "${language}" is not supported for this problem`);
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
    sampleOnly: true,
  });

  return {
    mode: 'run',
    ...verdict,
  };
}

async function submitCode({
  contestId,
  problemSlug,
  language,
  sourceCode,
  user,
}) {
  const contest = getContestById(contestId);
  if (contest.status === 'upcoming') {
    const error = new Error('Contest has not started yet');
    error.status = 400;
    throw error;
  }

  const problem = getProblemBySlug(problemSlug);
  const functionName = problem.functionName?.[language];

  if (!functionName) {
    const error = new Error(`Language "${language}" is not supported for this problem`);
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
    sampleOnly: false,
  });

  const submission = {
    id: `sub-${Date.now()}-${user.id}`,
    contestId,
    problemSlug,
    userId: user.id,
    userName: user.name,
    language,
    status: verdict.status,
    runtimeMs: verdict.runtimeMs,
    passedCount: verdict.passedCount,
    totalCount: verdict.totalCount,
    createdAt: new Date().toISOString(),
    results: verdict.results.map((r) => ({
      index: r.index,
      status: r.status,
      runtimeMs: r.runtimeMs,
      sample: r.sample,
    })),
  };

  submissions.unshift(submission);

  if (verdict.status === judgeService.STATUS.ACCEPTED) {
    const key = `${contestId}:${user.id}`;
    const participant =
      participants.get(key) ||
      ({
        contestId,
        userId: user.id,
        userName: user.name,
        joinedAt: new Date().toISOString(),
        score: 0,
        solvedProblems: [],
      });

    if (!participant.solvedProblems.includes(problemSlug)) {
      participant.solvedProblems.push(problemSlug);
      participant.score += problem.points;
    }

    participants.set(key, participant);
  }

  return {
    mode: 'submit',
    submissionId: submission.id,
    ...verdict,
  };
}

function getLeaderboard(contestId) {
  getContestById(contestId);

  const rows = [];
  for (const [, participant] of participants) {
    if (participant.contestId !== contestId) continue;
    rows.push({
      userId: participant.userId,
      userName: participant.userName,
      score: participant.score,
      solvedCount: participant.solvedProblems.length,
      solvedProblems: participant.solvedProblems,
    });
  }

  rows.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
  }));
}

function listProblems() {
  return PROBLEMS.map((problem) => ({
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    points: problem.points,
    tags: problem.tags,
  }));
}

module.exports = {
  getOptions,
  listContests,
  listProblems,
  getContestById,
  getContestProblem,
  joinContest,
  scheduleContest,
  runCode,
  submitCode,
  getLeaderboard,
};
