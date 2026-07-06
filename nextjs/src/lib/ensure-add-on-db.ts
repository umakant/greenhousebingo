import type { PrismaClient } from "@prisma/client";

/** Postgres "insufficient_privilege" — the app DB user is not the table owner (can't run DDL). */
function isPermissionError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  return (
    (e as { code?: string })?.code === "42501" ||
    /must be owner of/i.test(msg) ||
    /permission denied/i.test(msg)
  );
}

/**
 * Older PostgreSQL DBs may lack `add_ons.version`. Idempotent — safe before AddOn queries.
 */
export async function ensureAddOnVersionColumn(prisma: PrismaClient): Promise<void> {
  try {
    const existing = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'add_ons' AND column_name = 'version'
      ) AS exists;
    `);
    let hasColumn = existing?.[0]?.exists === true;

    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE add_ons ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0.0';
      `);
      hasColumn = true;
    }

    if (hasColumn) {
      await prisma.$executeRawUnsafe(`
        UPDATE add_ons SET version = '1.0.0' WHERE version IS NULL OR trim(version) = '';
      `);
    }
  } catch (e) {
    if (isPermissionError(e)) {
      console.warn(
        "[add-ons] ensureAddOnVersionColumn skipped (DB user is not owner of add_ons). " +
          "Run the ALTER as a DB superuser if the version column is missing.",
      );
      return;
    }
    console.error("[add-ons] ensureAddOnVersionColumn failed:", e);
    throw e;
  }
}

/** `add_ons` row for Expense Management (Add-ons Manager, plan gating). Idempotent. */
export async function ensureExpenseManagementAddOnRow(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.addOn.upsert({
      where: { module: "ExpenseManagement" },
      update: {},
      create: {
        module: "ExpenseManagement",
        name: "Expense Management",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "expensemanagement",
        priority: 0,
      },
    });
  } catch (e) {
    console.error("[add-ons] ensureExpenseManagementAddOnRow failed:", e);
  }
}

/** `add_ons` row for Affiliate Business (Add-ons Manager, plan gating). Idempotent. */
export async function ensureAffiliateBusinessAddOnRow(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.addOn.upsert({
      where: { module: "AffiliateBusiness" },
      update: {},
      create: {
        module: "AffiliateBusiness",
        name: "Affiliate Business",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "affiliatebusiness",
        priority: 77,
      },
    });
  } catch (e) {
    console.error("[add-ons] ensureAffiliateBusinessAddOnRow failed:", e);
  }
}

/** `add_ons` row for Compliance (Add-ons Manager, plan gating). Idempotent. */
export async function ensureComplianceAddOnRow(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.addOn.upsert({
      where: { module: "Compliance" },
      update: { isEnable: true },
      create: {
        module: "Compliance",
        name: "Compliance",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "compliance",
        priority: 78,
      },
    });
  } catch (e) {
    console.error("[add-ons] ensureComplianceAddOnRow failed:", e);
  }
}
