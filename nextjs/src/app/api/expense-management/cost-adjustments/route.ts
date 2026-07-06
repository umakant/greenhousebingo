import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { canManageEmWorkspace, canReadEmWorkspace, prismaTableMissingResponse, resolveEmWorkspaceRequest } from "@/lib/em-workspace-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serialize(row: {
  id: bigint;
  details: string;
  attachmentUrl: string | null;
  amount: { toNumber?: () => number } | number | null;
  createdAt: Date;
}) {
  const amount =
    row.amount == null
      ? null
      : typeof row.amount === "number"
        ? row.amount
        : row.amount.toNumber?.() ?? Number(row.amount);
  return {
    id: row.id.toString(),
    details: row.details,
    attachmentUrl: row.attachmentUrl,
    amount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    const db = (prisma as unknown as { emCostAdjustment?: { findMany: Function } }).emCostAdjustment;
    if (!db) return NextResponse.json({ error: "Prisma client missing EmCostAdjustment." }, { status: 503 });

    try {
      const rows = await db.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: rows.map(serialize) });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Cost adjustments table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;
    if (!canManageEmWorkspace(perms, role, ctx.actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = (prisma as unknown as { emCostAdjustment?: { create: Function } }).emCostAdjustment;
    if (!db) return NextResponse.json({ error: "Prisma client missing EmCostAdjustment." }, { status: 503 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const details = String(body?.details ?? "").trim();
    if (!details) return NextResponse.json({ error: "details required" }, { status: 400 });

    try {
      const row = await db.create({
        data: {
          organizationId: ctx.organizationId,
          details,
          attachmentUrl: String(body?.attachmentUrl ?? "").trim() || null,
          amount: body?.amount != null && body.amount !== "" ? Number(body.amount) : null,
        },
      });
      return NextResponse.json({ data: serialize(row) }, { status: 201 });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Cost adjustments table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
