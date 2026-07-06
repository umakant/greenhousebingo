/* eslint-disable no-console */

const path = require("path");
const fs = require("fs/promises");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Only these add-on modules (from Laravel Add-ons Manager) are synced from packages.
 * Matches module.json "name". BusinessModules has no package, so it's not listed.
 */
const ALLOWED_MODULES_FROM_PACKAGES = new Set([
  "Taskly",
  "Account",
  "Hrm",
  "Lead",
  "Pos",
  "RecurringInvoiceBill",
  "Recruitment",
  "Appointment",
  "Stripe",
  "Paypal",
]);

async function listModuleJsonFiles(packagesRoot) {
  const dirs = await fs.readdir(packagesRoot, { withFileTypes: true });
  const out = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const fp = path.join(packagesRoot, d.name, "module.json");
    try {
      await fs.access(fp);
      out.push(fp);
    } catch {
      // ignore
    }
  }
  return out;
}

function asDecimal(x) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  const safe = Number.isFinite(n) ? n : 0;
  return new Prisma.Decimal(safe);
}

async function main() {
  const packagesRoot = path.join(__dirname, "..", "..", "packages", "workdo");
  const files = await listModuleJsonFiles(packagesRoot);
  console.log(`Found module.json files: ${files.length}`);

  let upserts = 0;
  let skipped = 0;
  for (const fp of files) {
    const raw = await fs.readFile(fp, "utf8");
    const mod = JSON.parse(raw);

    const moduleCode = String(mod?.name ?? "").trim();
    const alias = String(mod?.alias ?? moduleCode).trim() || moduleCode;
    const packageName = String(mod?.package_name ?? "").trim();
    if (!moduleCode) continue;

    if (!ALLOWED_MODULES_FROM_PACKAGES.has(moduleCode)) {
      skipped++;
      continue;
    }

    await prisma.addOn.upsert({
      where: { module: moduleCode },
      create: {
        module: moduleCode,
        name: alias,
        monthlyPrice: asDecimal(mod?.monthly_price ?? 0),
        yearlyPrice: asDecimal(mod?.yearly_price ?? 0),
        image: null,
        isEnable: true,
        forAdmin: Boolean(mod?.for_admin ?? false),
        packageName: packageName || moduleCode,
        priority: Number(mod?.priority ?? 0) || 0,
        createdAt: new Date(),
      },
      update: {
        name: alias,
        monthlyPrice: asDecimal(mod?.monthly_price ?? 0),
        yearlyPrice: asDecimal(mod?.yearly_price ?? 0),
        isEnable: true,
        forAdmin: Boolean(mod?.for_admin ?? false),
        packageName: packageName || moduleCode,
        priority: Number(mod?.priority ?? 0) || 0,
        updatedAt: new Date(),
      },
    });
    upserts += 1;
  }

  console.log(`✓ Upserted add_ons: ${upserts} (skipped ${skipped} not in allowed list)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

