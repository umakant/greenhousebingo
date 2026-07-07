/**
 * PM2 config for Greenhouse Bingo production (greenhousebingo.com).
 *
 * Usage on server:
 *   cd /var/www/apps/greenhousebingo/nextjs
 *   npm run build
 *   pm2 delete greenhousebingo 2>/dev/null || true
 *   pm2 start /var/www/apps/greenhousebingo/deploy/greenhousebingo-pm2.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "greenhousebingo",
      cwd: "/var/www/apps/greenhousebingo/nextjs",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 5030 --hostname 0.0.0.0",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5030",
        HOSTNAME: "0.0.0.0",
        NEXT_PUBLIC_APP_URL: "https://greenhousebingo.com",
      },
      max_memory_restart: "1G",
    },
  ],
};
