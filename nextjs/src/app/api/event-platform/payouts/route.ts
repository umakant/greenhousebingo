import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  createVendorPayoutBatch,
  listVendorsWithPendingCommissions,
} from "@/lib/event-platform/payouts/payout-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payouts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const rows = await prisma.eventVendorPayout.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { vendor: { select: { vendorName: true } } },
  });
  const pendingVendors = await listVendorsWithPendingCommissions(actor.organizationId);
  return NextResponse.json({
    ok: true,
    items: rows.map((p) => ({
      id: p.id.toString(),
      vendorId: p.vendorId.toString(),
      vendorName: p.vendor.vendorName,
      batchRef: p.batchRef,
      totalAmount: p.totalAmount.toString(),
      currency: p.currency,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    pendingVendors,
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payouts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as { vendorId?: string; notes?: string } | null;
  if (!body?.vendorId) {
    return NextResponse.json({ ok: false, message: "vendorId is required." }, { status: 400 });
  }
  let vendorId: bigint;
  try {
    vendorId = BigInt(body.vendorId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid vendorId." }, { status: 400 });
  }

  try {
    const batch = await createVendorPayoutBatch({
      organizationId: actor.organizationId,
      vendorId,
      notes: body.notes,
      createdById: actor.userId,
    });
    return NextResponse.json({ ok: true, batch });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Payout creation failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
