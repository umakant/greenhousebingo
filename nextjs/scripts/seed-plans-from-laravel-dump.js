/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function pickDumpPath() {
  const candidates = [
    path.join(process.cwd(), "..", "attached_assets", "daaspaperflight_db_1770988535875.sql"),
    path.join(process.cwd(), "..", "attached_assets", "daaspaperflight_db_1770987509880.sql"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Laravel dump not found. Tried:\n- ${candidates.join("\n- ")}`);
}

function extractInsertBlock(sql, tableName) {
  // Use a regex so we don't depend on line endings (\n vs \r\n).
  const re = new RegExp(`INSERT INTO\\s+\\\`${tableName}\\\`[\\s\\S]*?;`, "i");
  const m = sql.match(re);
  return m ? m[0] : null;
}

function unescapeSqlString(s) {
  // Input is the raw content inside single quotes.
  // Handle common mysqldump escapes.
  return s
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function parseSqlValuesTuple(tupleText) {
  // tupleText includes surrounding parentheses.
  const inner = tupleText.trim().replace(/^\(/, "").replace(/\)$/, "");
  const values = [];

  let cur = "";
  let inStr = false;
  let esc = false;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      cur += ch;
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === "'") {
        inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
      continue;
    }
    if (ch === ",") {
      values.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length) values.push(cur.trim());
  return values;
}

function parseTuplesFromInsert(insertSql) {
  // Scan char-by-char to find top-level (...) tuples.
  const tuples = [];
  let i = insertSql.indexOf("VALUES");
  if (i < 0) return tuples;
  i += "VALUES".length;

  let depth = 0;
  let inStr = false;
  let esc = false;
  let start = -1;

  for (; i < insertSql.length; i++) {
    const ch = insertSql[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === "'") {
        inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        tuples.push(insertSql.slice(start, i + 1));
        start = -1;
      }
      continue;
    }
  }

  return tuples;
}

function parseValue(token) {
  if (token === "NULL") return null;
  if (token === "") return null;
  if (token.startsWith("'") && token.endsWith("'")) {
    const raw = token.slice(1, -1);
    return unescapeSqlString(raw);
  }
  // numeric or bare token
  const n = Number(token);
  if (Number.isFinite(n)) return n;
  return token;
}

function toDateOrNull(v) {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v.replace(" ", "T") + "Z");
  return Number.isFinite(d.getTime()) ? d : null;
}

function normalizeModules(mods) {
  if (mods == null) return null;
  if (Array.isArray(mods)) return mods;
  if (typeof mods === "string") {
    const s = mods.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        return JSON.parse(s);
      } catch {
        return [];
      }
    }
  }
  return [];
}

async function upsertPlan(row) {
  const id = BigInt(row.id);
  const createdAt = toDateOrNull(row.created_at) ?? new Date();
  const updatedAt = toDateOrNull(row.updated_at);

  const data = {
    id,
    name: row.name ?? null,
    description: row.description ?? null,
    numberOfUsers: Number(row.number_of_users ?? 0),
    customPlan: Boolean(row.custom_plan),
    status: Boolean(row.status),
    freePlan: Boolean(row.free_plan),
    modules: normalizeModules(row.modules),
    packagePriceYearly: String(row.package_price_yearly ?? "0"),
    packagePriceMonthly: String(row.package_price_monthly ?? "0"),
    pricePerUserMonthly: String(row.price_per_user_monthly ?? "0"),
    pricePerUserYearly: String(row.price_per_user_yearly ?? "0"),
    storageLimit: Number(row.storage_limit ?? 0),
    pricePerStorageMonthly: String(row.price_per_storage_monthly ?? "0"),
    pricePerStorageYearly: String(row.price_per_storage_yearly ?? "0"),
    trial: Boolean(row.trial),
    trialDays: Number(row.trial_days ?? 0),
    createdBy: row.created_by != null ? BigInt(row.created_by) : null,
    createdAt,
    updatedAt,
  };

  await prisma.plan.upsert({
    where: { id },
    create: data,
    update: {
      ...data,
      id: undefined, // cannot update id
    },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in nextjs/.env.local");
  }

  const dumpPath = pickDumpPath();
  console.log(`Reading Laravel dump: ${dumpPath}`);
  const sql = fs.readFileSync(dumpPath, "utf8");

  const insert = extractInsertBlock(sql, "plans");
  if (!insert) throw new Error("Could not find INSERT block for `plans` in dump.");

  const tuples = parseTuplesFromInsert(insert);
  if (tuples.length === 0) throw new Error("No tuples found in `plans` INSERT block.");

  // Extract column list from insert statement.
  const colMatch = insert.match(/INSERT INTO `plans`\s*\(([^)]+)\)\s*VALUES/i);
  if (!colMatch) throw new Error("Could not parse column list for `plans` INSERT.");
  const columns = colMatch[1]
    .split(",")
    .map((c) => c.trim().replace(/^`|`$/g, ""))
    .filter(Boolean);

  console.log(`Found ${tuples.length} plan rows in dump.`);

  let upserted = 0;
  for (const tuple of tuples) {
    const tokens = parseSqlValuesTuple(tuple);
    if (tokens.length !== columns.length) {
      throw new Error(`Column/value count mismatch. columns=${columns.length}, values=${tokens.length}`);
    }
    const row = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = parseValue(tokens[i]);
    }
    await upsertPlan(row);
    upserted++;
  }

  console.log(`✓ Upserted ${upserted} plans into Postgres`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });

