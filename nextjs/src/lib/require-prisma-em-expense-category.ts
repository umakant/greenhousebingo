import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** Prisma P2021: referenced table does not exist (migration not applied). */
export function prismaExpenseCategoryTableMissingResponse(e: unknown): NextResponse | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
  if (code !== "P2021") return null;
  return NextResponse.json(
    {
      error:
        "Expense category table is missing. Apply migrations: `npm run db:migrate:deploy`, then restart the server.",
    },
    { status: 503 },
  );
}

const STALE_CLIENT_ERROR =
  "Prisma client is out of date (EmExpenseCategory missing). Stop the Next.js dev server, run `npx prisma generate`, apply migrations for `em_expense_categories`, then restart. On Windows, if generate fails with EPERM on query_engine-windows.dll.node, stop all Node processes and try again.";

type EmExpenseCategoryDelegate = (typeof prisma)["emExpenseCategory"];

/**
 * After adding models to schema.prisma, `npx prisma generate` must succeed; otherwise
 * `prisma.emExpenseCategory` is undefined at runtime and `.count` throws.
 */
export function requireEmExpenseCategoryDelegate():
  | { ok: true; emExpenseCategory: EmExpenseCategoryDelegate }
  | { ok: false; response: NextResponse } {
  const emExpenseCategory = (prisma as unknown as { emExpenseCategory?: EmExpenseCategoryDelegate }).emExpenseCategory;
  if (!emExpenseCategory) {
    return {
      ok: false,
      response: NextResponse.json({ error: STALE_CLIENT_ERROR, ok: false }, { status: 503 }),
    };
  }
  return { ok: true, emExpenseCategory };
}
