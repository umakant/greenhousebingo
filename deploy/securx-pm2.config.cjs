/**
 * PM2 config for SecurX production (securxpro.com).
 *
 * Usage on server:
 *   cd /var/www/apps/securx/nextjs
 *   npm run build
 *   pm2 delete securx 2>/dev/null || true
 *   pm2 start /var/www/apps/securx/deploy/securx-pm2.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "securx",
      cwd: "/var/www/apps/securx/nextjs",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 5025 --hostname 0.0.0.0",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5025",
        HOSTNAME: "0.0.0.0",
      },
      max_memory_restart: "1G",
      error_file: "/home/lnicely/.pm2/logs/securx-error.log",
      out_file: "/home/lnicely/.pm2/logs/securx-out.log",
    },
  ],
};
