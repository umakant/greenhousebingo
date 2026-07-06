import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";

/** Search companies for assignment (defaults to companies not yet assigned to any partner). */
export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const unassignedOnly = (url.searchParams.get("unassigned") ?? "1").trim() !== "0";

  const where: Record<string, unknown> = { type: { in: ["company", "company_admin"] } };
  if (unassignedOnly) where.partnerId = null;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const companies = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, partnerId: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    items: companies.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      email: c.email,
      partnerId: c.partnerId ? c.partnerId.toString() : null,
    })),
  });
}
