import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventVendorUpdateSchema, parseCommissionRate } from "@/lib/event-platform/vendors/vendor-schemas";
import { getEventVendorById, serializeEventVendor } from "@/lib/event-platform/vendors/vendor-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "vendors.view");
  if (isEventPlatformApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  const row = await getEventVendorById(actor.organizationId, id);
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, item: serializeEventVendor(row) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "vendors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await getEventVendorById(actor.organizationId, id);
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = eventVendorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;
  const data: Prisma.EventVendorUpdateInput = { updatedById: actor.userId };

  if (p.vendorName !== undefined) data.vendorName = p.vendorName.trim();
  if (p.companyName !== undefined) data.companyName = p.companyName?.trim() || null;
  if (p.contactName !== undefined) data.contactName = p.contactName?.trim() || null;
  if (p.email !== undefined) data.email = p.email?.trim() || null;
  if (p.phone !== undefined) data.phone = p.phone?.trim() || null;
  if (p.website !== undefined) data.website = p.website?.trim() || null;
  if (p.businessType !== undefined) data.businessType = p.businessType?.trim() || null;
  if (p.status !== undefined) data.status = p.status;
  if (p.payoutMethod !== undefined) data.payoutMethod = p.payoutMethod?.trim() || null;
  if (p.taxId !== undefined) data.taxId = p.taxId?.trim() || null;
  if (p.addressLine1 !== undefined) data.addressLine1 = p.addressLine1?.trim() || null;
  if (p.addressLine2 !== undefined) data.addressLine2 = p.addressLine2?.trim() || null;
  if (p.city !== undefined) data.city = p.city?.trim() || null;
  if (p.state !== undefined) data.state = p.state?.trim() || null;
  if (p.postalCode !== undefined) data.postalCode = p.postalCode?.trim() || null;
  if (p.country !== undefined) data.country = p.country?.trim() || null;
  if (p.notes !== undefined) data.notes = p.notes?.trim() || null;
  if (p.defaultCommissionRate !== undefined) {
    const r = parseCommissionRate(p.defaultCommissionRate);
    data.defaultCommissionRate = r != null ? new Prisma.Decimal(r) : null;
  }
  if (p.overrideCommissionRate !== undefined) {
    const r = parseCommissionRate(p.overrideCommissionRate);
    data.overrideCommissionRate = r != null ? new Prisma.Decimal(r) : null;
  }

  const updated = await prisma.eventVendor.update({ where: { id }, data });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "vendor.updated",
    entityType: "event_vendor",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializeEventVendor(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "vendors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await getEventVendorById(actor.organizationId, id);
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.eventVendor.update({
    where: { id },
    data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "vendor.archived",
    entityType: "event_vendor",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true });
}
