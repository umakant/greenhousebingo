import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";
import { parseWebsiteId } from "@/lib/storefront-customer-auth";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";
import { maybeQueueTicketNotification } from "@/lib/storefront/storefront-support-notifications";
import { serializeStTicket } from "@/lib/support-ticket-serialize";

export const dynamic = "force-dynamic";

function makeTicketCode(): string {
  return String(Date.now()).slice(-10);
}

/** Days 43–45 — B2C shopper tickets (scoped by session + website). */
export async function GET(req: NextRequest) {
  const widRaw = req.nextUrl.searchParams.get("websiteId");
  const expected = widRaw != null && widRaw !== "" ? parseWebsiteId(widRaw) : null;
  if (expected == null) {
    return NextResponse.json({ ok: false, message: "websiteId required." }, { status: 400 });
  }
  const ctx = await getStorefrontCustomerFromRequest(req, expected);
  if (!ctx) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });

  const rows = await prisma.stTicket.findMany({
    where: {
      storefrontCustomerId: ctx.customerId,
      websiteId: ctx.websiteId,
    },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, tickets: rows.map(serializeStTicket) });
}

export async function POST(req: NextRequest) {
  const widRaw = req.nextUrl.searchParams.get("websiteId");
  const expected = widRaw != null && widRaw !== "" ? parseWebsiteId(widRaw) : null;
  if (expected == null) {
    return NextResponse.json({ ok: false, message: "websiteId required." }, { status: 400 });
  }
  const ctx = await getStorefrontCustomerFromRequest(req, expected);
  if (!ctx) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const subject = body?.subject != null ? String(body.subject).trim() : "";
  const description = body?.description != null ? String(body.description) : "";
  const categoryIdRaw = body?.category_id;
  const relatedOrderIdRaw = body?.related_order_id;

  if (!subject) {
    return NextResponse.json({ ok: false, message: "Subject is required." }, { status: 422 });
  }

  let storefrontOrderId: bigint | undefined;
  if (relatedOrderIdRaw != null && String(relatedOrderIdRaw).match(/^\d+$/)) {
    const oid = BigInt(String(relatedOrderIdRaw));
    const owns = await prisma.storefrontOrder.findFirst({
      where: {
        id: oid,
        organizationId: ctx.organizationId,
        websiteId: ctx.websiteId,
        storefrontCustomerId: ctx.customerId,
      },
      select: { id: true },
    });
    if (owns) storefrontOrderId = oid;
  }

  const ticket = await prisma.stTicket.create({
    data: {
      ticketCode: makeTicketCode(),
      accountType: "storefront_customer",
      name: ctx.name?.trim() || ctx.email,
      email: ctx.email,
      subject,
      categoryId:
        categoryIdRaw != null && String(categoryIdRaw).match(/^\d+$/)
          ? BigInt(String(categoryIdRaw))
          : null,
      status: "open",
      description: description || null,
      attachments: [],
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      storefrontCustomerId: ctx.customerId,
      storefrontOrderId,
    },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  await publishStorefrontEvent({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    eventType: STOREFRONT_EVENTS.TICKET_CREATED,
    resourceType: "support_ticket",
    resourceId: ticket.id.toString(),
    message: `Ticket ${ticket.ticketCode}: ${ticket.subject}`,
    metadata: { ticketCode: ticket.ticketCode, channel: "customer_account" },
    actorUserId: null,
  });

  await maybeQueueTicketNotification({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    templateKey: "support.ticket.created",
    recipientEmail: ticket.email,
    payload: { ticketCode: ticket.ticketCode, subject: ticket.subject },
  });

  return NextResponse.json({ ok: true, ticket: serializeStTicket(ticket) }, { status: 201 });
}
