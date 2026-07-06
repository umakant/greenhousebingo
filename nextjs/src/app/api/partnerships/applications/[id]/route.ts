import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { serializePartner } from "@/lib/partner-service";
import { assignPartnerRoleToUser } from "@/lib/partner-role";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

/** Approve or reject a partner application. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const partner = await prisma.partner.findFirst({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "").trim().toLowerCase();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, message: "action must be approve or reject." }, { status: 400 });
  }

  const status = action === "approve" ? "active" : "rejected";
  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: { status, updatedAt: new Date() },
  });

  if (partner.userId) {
    if (action === "approve") {
      await assignPartnerRoleToUser(partner.userId);
    } else {
      await prisma.user.update({
        where: { id: partner.userId },
        data: { isEnableLogin: false, isActive: false },
      });
    }
  }

  return NextResponse.json({ ok: true, item: serializePartner(updated) });
}
