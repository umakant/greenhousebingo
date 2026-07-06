import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventVendorCreateSchema, parseCommissionRate } from "@/lib/event-platform/vendors/vendor-schemas";
import { getEventVendorsListPayload } from "@/lib/event-platform/vendors/vendor-list-service";
import { serializeEventVendor } from "@/lib/event-platform/vendors/vendor-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "vendors.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const payload = await getEventVendorsListPayload(actor.organizationId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "vendors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventVendorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;
    const defaultRate = parseCommissionRate(p.defaultCommissionRate);
    const overrideRate = parseCommissionRate(p.overrideCommissionRate);
    const email = p.email?.trim() || null;

    const created = await prisma.eventVendor.create({
      data: {
        organizationId: actor.organizationId,
        vendorName: p.vendorName.trim(),
        companyName: p.companyName?.trim() || null,
        contactName: p.contactName?.trim() || null,
        email,
        phone: p.phone?.trim() || null,
        website: p.website?.trim() || null,
        businessType: p.businessType?.trim() || null,
        status: p.status ?? "pending",
        defaultCommissionRate: defaultRate != null ? new Prisma.Decimal(defaultRate) : null,
        overrideCommissionRate: overrideRate != null ? new Prisma.Decimal(overrideRate) : null,
        payoutMethod: p.payoutMethod?.trim() || null,
        taxId: p.taxId?.trim() || null,
        addressLine1: p.addressLine1?.trim() || null,
        addressLine2: p.addressLine2?.trim() || null,
        city: p.city?.trim() || null,
        state: p.state?.trim() || null,
        postalCode: p.postalCode?.trim() || null,
        country: p.country?.trim() || null,
        notes: p.notes?.trim() || null,
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "vendor.created",
      entityType: "event_vendor",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventVendor(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
