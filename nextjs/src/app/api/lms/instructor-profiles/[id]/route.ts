import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parsePercent(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-lms-instructors") && !hasPermission(perms, "manage-lms")) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const pct = parsePercent(body?.commissionPercent);
  if (pct === undefined) {
    return NextResponse.json({ ok: false, message: "commissionPercent is required." }, { status: 400 });
  }

  const updated = await prisma.instructorProfile.updateMany({
    where: { id, organizationId: actor.organizationId },
    data: { commissionPercent: new Prisma.Decimal(pct), updatedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, message: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, commissionPercent: pct });
}
