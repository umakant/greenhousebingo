import { Pool } from "pg";

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (pool) return pool;

  // New Postgres env vars (preferred)
  const host = process.env.PF_PG_HOST;
  const user = process.env.PF_PG_USER;
  const database = process.env.PF_PG_DATABASE;

  // Back-compat alias (if you already populated PF_DB_* before)
  const resolvedHost = host ?? process.env.PF_DB_HOST;
  const resolvedUser = user ?? process.env.PF_DB_USER;
  const resolvedDatabase = database ?? process.env.PF_DB_NAME;

  const portRaw = process.env.PF_PG_PORT ?? process.env.PF_DB_PORT;
  const port = portRaw ? Number(portRaw) : 5432;

  const password =
    process.env.PF_PG_PASSWORD ?? process.env.PF_DB_PASSWORD ?? "";

  pool = new Pool({
    host: required("PF_PG_HOST (or PF_DB_HOST)", resolvedHost),
    user: required("PF_PG_USER (or PF_DB_USER)", resolvedUser),
    database: required("PF_PG_DATABASE (or PF_DB_NAME)", resolvedDatabase),
    port,
    password,
    max: 10,
  });

  return pool;
}
