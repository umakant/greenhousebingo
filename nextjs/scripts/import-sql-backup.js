/**
 * Apply Prisma schema to the DB, then import a PostgreSQL .sql file (e.g. INSERT backup).
 *
 * Usage (from nextjs/):
 *   npm run db:import:backup -- "C:\path\to\backup.sql"
 *
 * Requires valid DATABASE_URL / PF_PG_* in .env (not placeholders).
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");

function loadEnvFile(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return;
  require("dotenv").config({ path: p });
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function fromDatabaseUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "http:"));
    const db = u.pathname.replace(/^\//, "").split("/")[0].split("?")[0];
    return {
      host: u.hostname || "localhost",
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username || "postgres"),
      password: decodeURIComponent(u.password || ""),
      database: db || "paper_flight_dash",
    };
  } catch {
    return null;
  }
}

const fromUrl = fromDatabaseUrl(process.env.DATABASE_URL);
const password =
  process.env.PF_PG_PASSWORD ??
  process.env.PF_DB_PASSWORD ??
  fromUrl?.password ??
  "";
const badPassword =
  !password ||
  password === "YOUR_PASSWORD" ||
  password === "PASSWORD" ||
  password === "USER:PASSWORD";

if (badPassword) {
  console.error(
    "Set a real PostgreSQL password in nextjs/.env (DATABASE_URL and PF_PG_PASSWORD), then re-run."
  );
  process.exit(1);
}

const host =
  process.env.PF_PG_HOST ??
  process.env.PF_DB_HOST ??
  fromUrl?.host ??
  "localhost";
const port = String(
  process.env.PF_PG_PORT ?? process.env.PF_DB_PORT ?? fromUrl?.port ?? 5432
);
const user =
  process.env.PF_PG_USER ??
  process.env.PF_DB_USER ??
  fromUrl?.user ??
  "postgres";
const database =
  process.env.PF_PG_DATABASE ??
  process.env.PF_DB_NAME ??
  fromUrl?.database ??
  "paper_flight_dash";

const sqlArg = process.argv[2];
const sqlPath = sqlArg
  ? path.resolve(sqlArg)
  : process.env.IMPORT_SQL_PATH
    ? path.resolve(process.env.IMPORT_SQL_PATH)
    : "";

if (!sqlPath || !fs.existsSync(sqlPath)) {
  console.error(
    "Pass the path to the .sql file:\n" +
      '  npm run db:import:backup -- "C:\\Users\\you\\Downloads\\paperflight-db-backup.sql"'
  );
  process.exit(1);
}

function findPsql() {
  const bases = [
    process.env.PG_BIN && path.join(process.env.PG_BIN, "psql.exe"),
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
  ].filter(Boolean);
  for (const p of bases) {
    if (fs.existsSync(p)) return p;
  }
  return "psql";
}

console.log("1/3 Ensuring database exists…");
let r = spawnSync(process.execPath, [path.join(__dirname, "ensure-pg-database.js")], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PGPASSWORD: password },
});
if (r.status !== 0) process.exit(r.status ?? 1);

console.log("2/3 Pushing Prisma schema (creates empty tables)…");
r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "db", "push"],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  }
);
if (r.status !== 0) {
  console.error("prisma db push failed.");
  process.exit(r.status ?? 1);
}

const psql = findPsql();
console.log(`3/3 Importing ${sqlPath} with ${psql}…`);
r = spawnSync(
  psql,
  [
    "-h",
    host,
    "-p",
    port,
    "-U",
    user,
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    sqlPath,
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PGPASSWORD: password },
  }
);

if (r.status !== 0) {
  console.error("psql import failed. If you see duplicate key errors, use a fresh DB or truncate tables first.");
  process.exit(r.status ?? 1);
}

console.log("Import finished.");
