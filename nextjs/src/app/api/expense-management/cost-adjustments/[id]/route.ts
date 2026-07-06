import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { canManageEmWorkspace, canReadEmWorkspace, prismaTableMissingResponse, resolveEmWorkspaceRequest } from "@/lib/em-workspace-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;
    if (!canManageEmWorkspace(perms, role, ctx.actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: idRaw } = await params;
    if (!/^\d+$/.test(idRaw)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = (prisma as unknown as { emCostAdjustment?: { findFirst: Function; delete: Function } }).emCostAdjustment;
    if (!db) return NextResponse.json({ error: "Prisma client missing EmCostAdjustment." }, { status: 503 });

    try {
      const existing = await db.findFirst({
        where: { id: BigInt(idRaw), organizationId: ctx.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.delete({ where: { id: BigInt(idRaw) } });
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Cost adjustments table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
