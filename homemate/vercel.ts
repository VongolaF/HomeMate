export const config = {
  crons: [
    // Vercel cron timezone is always UTC.
    // 21:00 Asia/Shanghai (UTC+8) => 13:00 UTC, every Sunday.
    {
      path: "/api/cron/health-weekly",
      schedule: "0 13 * * 0",
    },
  ],
};
