// PM2 cluster mode config — utilises every CPU core on the server.
// Run with:   pm2 start ecosystem.config.js --env production
// Reload:     pm2 reload simpaskor-api
// Logs:       pm2 logs simpaskor-api
//
// Why cluster mode: Node.js is single-threaded for JS execution. With "max"
// instances, PM2 forks one worker per CPU core and load-balances incoming
// requests across them. For a 4-core server this gives ~4x scan throughput
// at zero code cost.
//
// IMPORTANT: cluster mode shares NOTHING in memory between workers. The
// in-memory caches in routes/tickets.ts (e.g. ticketStandingsCache) are
// per-worker — that's fine, they're advisory and bounded; just expect
// dashboard standings to refresh up to (TTL × workers) seconds in the
// worst case.

module.exports = {
  apps: [
    {
      name: "simpaskor-api",
      script: "dist/server.js",
      cwd: __dirname,

      // Cluster mode across all available CPU cores
      exec_mode: "cluster",
      instances: "max",

      // Restart policy
      max_memory_restart: "600M",
      min_uptime: "15s",
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 5000,

      // Logging
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      out_file: "./logs/out.log",
      error_file: "./logs/err.log",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
