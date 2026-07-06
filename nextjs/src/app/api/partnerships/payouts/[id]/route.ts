import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

/** Update payout status (mark paid / processing / failed). Marking paid settles linked commissions. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const payoutId = parseId(id);
  if (!payoutId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const payout = await prisma.partnerPayout.findFirst({ where: { id: payoutId } });
  if (!payout) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = body.status != null ? String(body.status).trim() : payout.status;
  const validStatuses = ["pending", "processing", "paid", "failed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
  }

  const data: Record<string, unknown> = { status, updatedAt: new Date() };
  if (body.payoutReference != null || body.payout_reference != null) {
    data.payoutReference = String(body.payoutReference ?? body.payout_reference).trim() || null;
  }
  if (body.payoutMethod != null || body.payout_method != null) {
    data.payoutMethod = String(body.payoutMethod ?? body.payout_method).trim() || null;
  }
  if (body.notes != null) data.notes = String(body.notes).trim() || null;

  if (status === "paid") {
    data.paidAt = new Date();
    await prisma.partnerCommission.updateMany({
      where: { payoutId },
      data: { status: "paid", paidAt: new Date(), updatedAt: new Date() },
    });
  } else if (status === "failed") {
    // Release commissions back to approved so they can be re-batched.
    await prisma.partnerCommission.updateMany({
      where: { payoutId },
      data: { payoutId: null, status: "approved", updatedAt: new Date() },
    });
  }

  const updated = await prisma.partnerPayout.update({ where: { id: payoutId }, data });

  return NextResponse.json({
    ok: true,
    item: {
      id: updated.id.toString(),
      partnerId: updated.partnerId.toString(),
      totalAmount: Number(updated.totalAmount),
      status: updated.status,
      payoutMethod: updated.payoutMethod,
      payoutReference: updated.payoutReference,
      notes: updated.notes,
      paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
    },
  });
}
