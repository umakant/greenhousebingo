/**
 * Creates the app database if it does not exist (connects to `postgres` first).
 * Loads nextjs/.env.local then .env (same idea as prisma-with-env).
 */
const path = require("path");
const fs = require("fs");
const { Client } = require("pg");

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

const host =
  process.env.PF_PG_HOST ??
  process.env.PF_DB_HOST ??
  fromUrl?.host ??
  "localhost";
const port = Number(
  process.env.PF_PG_PORT ?? process.env.PF_DB_PORT ?? fromUrl?.port ?? 5432
);
const user =
  process.env.PF_PG_USER ??
  process.env.PF_DB_USER ??
  fromUrl?.user ??
  "postgres";
const password =
  process.env.PF_PG_PASSWORD ??
  process.env.PF_DB_PASSWORD ??
  fromUrl?.password ??
  "";
const targetDb =
  process.env.PF_PG_DATABASE ??
  process.env.PF_DB_NAME ??
  fromUrl?.database ??
  "paper_flight_dash";

const badPassword =
  !password ||
  password === "YOUR_PASSWORD" ||
  password === "PASSWORD" ||
  password === "USER:PASSWORD";

if (badPassword) {
  console.error(
    "Set your real PostgreSQL password in nextjs/.env, for example:\n" +
      '  DATABASE_URL="postgresql://postgres:YOUR_REAL_PASSWORD@localhost:5432/paper_flight_dash?schema=public"\n' +
      "  PF_PG_PASSWORD=YOUR_REAL_PASSWORD\n" +
      "(Use the password for the `postgres` user from your PostgreSQL 18 installation.)"
  );
  process.exit(1);
}

async function main() {
  const admin = new Client({
    host,
    port,
    user,
    password,
    database: "postgres",
  });

  await admin.connect();

  const { rows } = await admin.query(
    "SELECT 1 AS ok FROM pg_database WHERE datname = $1",
    [targetDb]
  );

  if (rows.length) {
    console.log(`Database "${targetDb}" already exists.`);
    await admin.end();
    return;
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(targetDb)) {
    await admin.end();
    throw new Error(`Refusing to create database with unsafe name: ${targetDb}`);
  }

  const quoted = `"${targetDb.replace(/"/g, '""')}"`;
  await admin.query(`CREATE DATABASE ${quoted}`);
  console.log(`Created database "${targetDb}".`);
  await admin.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
