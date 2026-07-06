import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { serializeNotification } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-dashboard");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceNotification.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const row = await prisma.complianceNotification.update({
    where: { id: existing.id },
    data: {
      readAt: body.read === false ? null : new Date(),
    },
  });

  return NextResponse.json({ ok: true, item: serializeNotification(row) });
}
