import { NextResponse, type NextRequest } from "next/server";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import {
  MARKETPLACE_TICKET_CATEGORIES,
  isMarketplaceTicketCategory,
  makeMarketplaceTicketCode,
  resolveMarketplaceTicketCategoryId,
} from "@/lib/marketplace-support";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOrderId(orderId: string): bigint | null {
  try {
    return BigInt(orderId);
  } catch {
    return null;
  }
}

/** List support tickets the company has opened for this marketplace order. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; orderId: string }> },
) {
  const { companySlug, orderId } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const id = parseOrderId(orderId);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });

  const order = await prisma.marketplaceOrder.findFirst({
    where: { id, buyerOrganizationId: guard.ctx.organizationId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });

  const tickets = await prisma.stTicket.findMany({
    where: { marketplaceOrderId: id, organizationId: guard.ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json({
    ok: true,
    categories: [...MARKETPLACE_TICKET_CATEGORIES],
    tickets: tickets.map((t) => ({
      id: t.id.toString(),
      ticketCode: t.ticketCode,
      subject: t.subject,
      status: t.status,
      category: t.category?.name ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

/** Create a support ticket from a marketplace order detail page. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; orderId: string }> },
) {
  const { companySlug, orderId } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.view");
  if (!guard.ok) return guard.response;
  const { organizationId, userId } = guard.ctx;

  const id = parseOrderId(orderId);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const category = String(body.category ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (!isMarketplaceTicketCategory(category)) {
    return NextResponse.json({ ok: false, message: "Please choose a valid category." }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ ok: false, message: "Subject is required." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ ok: false, message: "Please describe the issue." }, { status: 400 });
  }

  // Order must belong to the company; pull vendor + delivery event for ticket linking.
  const order = await prisma.marketplaceOrder.findFirst({
    where: { id, buyerOrganizationId: organizationId },
    select: {
      id: true,
      orderNumber: true,
      vendorId: true,
      deliveryEventOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { deliveryEventId: true },
      },
    },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });

  const deliveryEventId = order.deliveryEventOrders[0]?.deliveryEventId ?? null;

  // Contact details for the ticket (the acting user, falling back to the company).
  const actor = userId
    ? await prisma.user.findFirst({ where: { id: userId }, select: { name: true, email: true } })
    : null;
  const company = await prisma.user.findFirst({
    where: { id: organizationId },
    select: { name: true, email: true },
  });
  const name = actor?.name || company?.name || "Company";
  const email = actor?.email || company?.email || "";

  const categoryId = await resolveMarketplaceTicketCategoryId(category);

  const ticket = await prisma.stTicket.create({
    data: {
      ticketCode: makeMarketplaceTicketCode(),
      accountType: "marketplace",
      name,
      email,
      subject,
      categoryId: categoryId ?? undefined,
      status: "open",
      description: `Order ${order.orderNumber}\nCategory: ${category}\n\n${description}`,
      attachments: [],
      organizationId,
      createdBy: userId ?? undefined,
      marketplaceOrderId: order.id,
      marketplaceVendorId: order.vendorId ?? undefined,
      deliveryEventId: deliveryEventId ?? undefined,
    },
    select: { id: true, ticketCode: true },
  });

  return NextResponse.json(
    { ok: true, id: ticket.id.toString(), ticketCode: ticket.ticketCode },
    { status: 201 },
  );
}
