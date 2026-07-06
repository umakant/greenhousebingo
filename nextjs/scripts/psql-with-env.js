/**
 * Run psql with DATABASE_URL from the same env files as Prisma (see prisma-with-env.js).
 * Use this on production instead of `psql -U user -d db` when peer auth fails on the local socket.
 *
 * Usage:
 *   node scripts/psql-with-env.js -f prisma/ops/apply-pos-products-storefront-columns-manually.sql
 *   node scripts/psql-with-env.js -c "SELECT 1"
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

loadEnvFile("prisma/.env");
loadEnvFile(".env.local");
loadEnvFile(".env");

const rawUrl = process.env.DATABASE_URL?.trim();
if (!rawUrl) {
  console.error("DATABASE_URL is not set. Add it to nextjs/.env (or .env.local) and try again.");
  process.exit(1);
}

/**
 * Prisma allows `?schema=public&connection_limit=…`. `psql` (libpq) errors with
 * "invalid URI query parameter: schema" on recent versions.
 * Strip Prisma-only params; keep `sslmode`, etc.
 */
function databaseUrlForPsql(prismaUrl) {
  let s = prismaUrl.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  const qIdx = s.indexOf("?");
  if (qIdx === -1) return s;
  const base = s.slice(0, qIdx);
  const qs = s.slice(qIdx + 1);
  const prismaOnlyKeys = new Set([
    "schema",
    "connection_limit",
    "pool_timeout",
    "socket_timeout",
    "pgbouncer",
  ]);
  const kept = [];
  for (const part of qs.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
    if (prismaOnlyKeys.has(key)) continue;
    kept.push(part);
  }
  return kept.length ? `${base}?${kept.join("&")}` : base;
}

const url = databaseUrlForPsql(rawUrl);
if ((url.match(/@/g) || []).length > 1) {
  console.warn(
    "[psql-with-env] DATABASE_URL has more than one '@'. If your password contains @, encode it in the URL (e.g. my@pass → my%40pass) or Prisma/psql will mis-parse the host.",
  );
}

const psqlArgs = process.argv.slice(2);
if (psqlArgs.length === 0) {
  console.error("Usage: node scripts/psql-with-env.js <psql-args...>");
  console.error('Example: node scripts/psql-with-env.js -f prisma/ops/apply-pos-products-storefront-columns-manually.sql');
  process.exit(1);
}

const r = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", ...psqlArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(r.status ?? 1);
