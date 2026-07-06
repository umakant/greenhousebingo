/**
 * Ensures every `isCompanyEmailNotificationEnabled*` template key used in API code
 * has a matching row in `notifications` (type=mail, action column).
 * Run from repo: cd nextjs && node scripts/verify-email-notification-keys.js
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const root = path.join(__dirname, "..");
  require("dotenv").config({ path: path.join(root, "prisma", ".env") });
  require("dotenv").config({ path: path.join(root, ".env.local") });
  require("dotenv").config({ path: path.join(root, ".env") });
}

function walkTs(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walkTs(p, acc);
    } else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
}

/** Call sites: isCompanyEmailNotificationEnabled(settings, "Key") */
const CALL_RE = /isCompanyEmailNotificationEnabled(?:Loose)?\(\s*[^,]+,\s*"([^"]+)"/g;

async function main() {
  loadEnv();
  const root = path.join(__dirname, "..");
  const srcRoot = path.join(root, "src");
  const files = [];
  walkTs(srcRoot, files);

  const codeKeys = new Set();
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(CALL_RE)) {
      codeKeys.add(m[1]);
    }
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.notification.findMany({
      where: { type: "mail" },
      select: { action: true },
    });
    const dbActions = new Set(rows.map((r) => r.action).filter(Boolean));
    const missingInDb = [...codeKeys].filter((k) => !dbActions.has(k)).sort();

    console.log("[verify-email-notification-keys] Keys referenced in code:", codeKeys.size);
    if (missingInDb.length) {
      console.error("[verify-email-notification-keys] FAIL: no notifications.action row for:");
      for (const k of missingInDb) console.error("  -", JSON.stringify(k));
      process.exit(1);
    }
    console.log("[verify-email-notification-keys] OK: all code keys exist in notifications (mail).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
