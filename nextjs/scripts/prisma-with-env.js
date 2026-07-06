/**
 * Loads Next.js-style env files before invoking Prisma CLI.
 * Prisma only reads `.env` by default; this prepends `.env.local` (and `.env`) like `next dev`.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");

function loadEnvFile(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return;
  require("dotenv").config({ path: p });
}

// Same files Prisma CLI would load, plus Next.js `.env.local` (Prisma does not load that by itself).
loadEnvFile("prisma/.env");
loadEnvFile(".env.local");
loadEnvFile(".env");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-with-env.js <prisma-args...>");
  console.error("Example: node scripts/prisma-with-env.js db push");
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(r.status ?? 1);
