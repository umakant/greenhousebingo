import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.ORDER_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let oid: bigint;
  try {
    oid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid order" }, { status: 400 });
  }

  const row = await prisma.storefrontOrder.findFirst({
    where: { id: oid, organizationId: org.organizationId, source: "storefront" },
    include: {
      lines: true,
      events: { orderBy: { createdAt: "asc" } },
      paymentRecords: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "asc" } },
      fulfillmentAssignee: { select: { id: true, name: true, email: true } },
      crmCustomer: {
        select: {
          id: true,
          customerCode: true,
          companyName: true,
          contactPersonName: true,
          contactPersonEmail: true,
        },
      },
      discountCode: { select: { id: true, code: true } },
    },
  });
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  /** Loaded separately so `tsc` stays compatible if `StorefrontOrderInclude` lags schema after pulls. */
  const accountingRevenue =
    row.accountingRevenueId != null
      ? await prisma.revenue.findFirst({
          where: { id: row.accountingRevenueId },
          select: { id: true, referenceNumber: true, amount: true },
        })
      : null;

  return NextResponse.json({
    ok: true,
    order: {
      id: row.id.toString(),
      orderNumber: row.orderNumber,
      source: row.source,
      status: row.status,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      total: Number(row.total),
      currency: row.currency,
      subtotal: Number(row.subtotal),
      taxTotal: Number(row.taxTotal),
      shippingTotal: Number(row.shippingTotal),
      discountTotal: Number(row.discountTotal),
      taxLines: row.taxLines,
      discountCode: row.discountCode ? { code: row.discountCode.code } : null,
      customerEmail: row.customerEmail,
      customerName: row.customerName,
      shippingAddress: row.shippingAddress,
      billingAddress: row.billingAddress,
      internalNotes: row.internalNotes,
      accountingRevenueId: row.accountingRevenueId?.toString() ?? null,
      accountingRevenue: accountingRevenue
        ? {
            id: accountingRevenue.id.toString(),
            referenceNumber: accountingRevenue.referenceNumber,
            amount: Number(accountingRevenue.amount),
          }
        : null,
      fulfillmentAssigneeUserId: row.fulfillmentAssigneeUserId?.toString() ?? null,
      fulfillmentAssignee: row.fulfillmentAssignee
        ? {
            id: row.fulfillmentAssignee.id.toString(),
            name: row.fulfillmentAssignee.name,
            email: row.fulfillmentAssignee.email,
          }
        : null,
      crmCustomer: row.crmCustomer
        ? {
            id: row.crmCustomer.id.toString(),
            customerCode: row.crmCustomer.customerCode,
            companyName: row.crmCustomer.companyName,
            contactPersonName: row.crmCustomer.contactPersonName,
            contactPersonEmail: row.crmCustomer.contactPersonEmail,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      lines: row.lines.map((l) => ({
        id: l.id.toString(),
        name: l.name,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        lineTotal: Number(l.lineTotal),
      })),
      events: row.events.map((e) => ({
        kind: e.kind,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      })),
      payments: row.paymentRecords.map((p) => ({
        status: p.status,
        amount: Number(p.amount),
        provider: p.provider,
        createdAt: p.createdAt.toISOString(),
      })),
      shipments: row.shipments.map((s) => ({
        id: s.id.toString(),
        status: s.status,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        shippedAt: s.shippedAt?.toISOString() ?? null,
      })),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.ORDER_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let oid: bigint;
  try {
    oid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid order" }, { status: 400 });
  }

  const existing = await prisma.storefrontOrder.findFirst({
    where: { id: oid, organizationId: org.organizationId, source: "storefront" },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const internalNotes = body?.internalNotes != null ? String(body.internalNotes) : undefined;
  const fulfillmentStatus = body?.fulfillmentStatus != null ? String(body.fulfillmentStatus) : undefined;
  const fulfillmentAssigneeUserIdRaw = body?.fulfillmentAssigneeUserId;
  const fulfillmentAssigneeUserId =
    fulfillmentAssigneeUserIdRaw === null
      ? null
      : fulfillmentAssigneeUserIdRaw != null && String(fulfillmentAssigneeUserIdRaw).match(/^\d+$/)
        ? BigInt(String(fulfillmentAssigneeUserIdRaw))
        : undefined;

  if (fulfillmentAssigneeUserId !== undefined && fulfillmentAssigneeUserId !== null) {
    const assigneeOk = await prisma.user.findFirst({
      where: {
        id: fulfillmentAssigneeUserId,
        OR: [{ id: org.organizationId }, { creatorId: org.organizationId }],
      },
      select: { id: true },
    });
    if (!assigneeOk) {
      return NextResponse.json({ ok: false, error: "Invalid fulfillment assignee for this company." }, { status: 400 });
    }
  }

  const shipment =
    body?.shipment && typeof body.shipment === "object"
      ? (body.shipment as Record<string, unknown>)
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.storefrontOrder.update({
      where: { id: oid },
      data: {
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(fulfillmentStatus !== undefined ? { fulfillmentStatus } : {}),
        ...(fulfillmentAssigneeUserId !== undefined
          ? { fulfillmentAssigneeUserId }
          : {}),
      },
    });

    if (shipment) {
      const carrier = shipment.carrier != null ? String(shipment.carrier) : null;
      const trackingNumber = shipment.trackingNumber != null ? String(shipment.trackingNumber) : null;
      const shipStatus = shipment.status != null ? String(shipment.status) : "pending";
      const first = await tx.storefrontShipment.findFirst({
        where: { orderId: oid },
        orderBy: { id: "asc" },
      });
      if (first) {
        const markShipped = shipStatus === "shipped" || Boolean(trackingNumber?.trim());
        await tx.storefrontShipment.update({
          where: { id: first.id },
          data: {
            carrier,
            trackingNumber,
            status: shipStatus,
            ...(markShipped ? { shippedAt: new Date() } : {}),
          },
        });
      }
    }

    await tx.storefrontOrderEvent.create({
      data: {
        orderId: oid,
        kind: "merchant_update",
        message: "Order updated from merchant",
        metadata: body ? { patch: Object.keys(body) } : undefined,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
