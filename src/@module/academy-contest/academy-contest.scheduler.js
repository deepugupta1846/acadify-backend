const academyContestService = require('../academy-contest/academy-contest.service');

const CONTEST_SCHEDULER_INTERVAL_MS = 30 * 1000;

const startAcademyContestScheduler = () => {
  const tick = async () => {
    try {
      await academyContestService.processScheduledContests();
    } catch (error) {
      console.error('Academy contest scheduler error:', error.message);
    }
  };

  tick();
  return setInterval(tick, CONTEST_SCHEDULER_INTERVAL_MS);
};

module.exports = {
  startAcademyContestScheduler
};
