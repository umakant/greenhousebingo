import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Full message for API JSON when `companyBillingPaymentMethod` (or related) is missing from the generated client.
 * Root cause: `prisma generate` did not run after the schema gained these models, or it failed (common on Windows: EPERM while `next dev` holds `query_engine-windows.dll.node`).
 */
export const COMPANY_BILLING_PRISMA_NOT_READY =
  "Prisma client is missing billing models. Fix: (1) Stop the Next.js dev server (Ctrl+C). (2) In the `nextjs` folder run `npm run db:generate` or `npm run db:generate:clean`. (3) Run `npm run db:push` (or `migrate deploy`) so tables exist. (4) Start dev again. If generate fails with EPERM on Windows, close terminals, end `node.exe` in Task Manager for this project, then retry step 2.";

/** Short toast line when save fails for the same reason. */
export const COMPANY_BILLING_PRISMA_TOAST_SHORT =
  "Stop dev, then in `nextjs`: npm run db:generate:clean → npm run db:push → restart. (EPERM on Windows: quit node.exe, retry.)";

/** Shown in the Billing tab amber banner when GET loads partial data. */
export const COMPANY_BILLING_PRISMA_BANNER =
  "Saved card/PayPal data needs an up-to-date Prisma client. Stop the dev server, run `npm run db:generate:clean` and `npm run db:push` in the `nextjs` folder, then restart. On Windows, if generate errors with EPERM, another process is locking Prisma — stop all Node processes for this app and run generate again.";
type DelegateRecord = Record<string, { findMany?: unknown; groupBy?: unknown; create?: unknown; updateMany?: unknown; delete?: unknown } | undefined>;

/** True if this delegate exists on the runtime client (avoids undefined.findMany). */
export function hasPrismaDelegate(
  prisma: PrismaClient,
  model: keyof PrismaClient | string,
  method: "findMany" | "groupBy" | "create" | "updateMany" | "delete",
): boolean {
  const p = prisma as unknown as DelegateRecord;
  const d = p[String(model)];
  return typeof d?.[method] === "function";
}

/** For mutations: saved card/PayPal rows require this delegate. */
export function assertCompanyBillingPaymentMethodDelegate(prisma: PrismaClient): NextResponse | null {
  if (!hasPrismaDelegate(prisma, "companyBillingPaymentMethod", "findMany")) {
    return NextResponse.json({ ok: false, error: COMPANY_BILLING_PRISMA_NOT_READY }, { status: 503 });
  }
  return null;
}