const cronSecret = process.env.HEALTH_CRON_SECRET;

const cronPath = cronSecret
  ? `/api/cron/health-weekly?secret=${encodeURIComponent(cronSecret)}`
  : "/api/cron/health-weekly";

export default {
  crons: [
    // Vercel cron timezone is always UTC.
    // 21:00 Asia/Shanghai (UTC+8) => 13:00 UTC, every Sunday.
    {
      path: cronPath,
      schedule: "0 13 * * 0",
    },
  ],
};
