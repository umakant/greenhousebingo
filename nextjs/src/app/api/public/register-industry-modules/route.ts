import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Public list of **active** industry modules (`business_modules`) for the company self-registration wizard.
 */
export async function GET() {
  const rows = await prisma.businessModule.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id.toString(),
      label: r.name,
      code: r.code ?? null,
    })),
  });
}
