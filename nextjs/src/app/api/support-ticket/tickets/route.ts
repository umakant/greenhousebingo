import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPosCompanyId } from "@/lib/pos-api";
import { serializeStTicket } from "@/lib/support-ticket-serialize";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";
import { maybeQueueTicketNotification } from "@/lib/storefront/storefront-support-notifications";

function makeTicketCode(): string {
  return String(Date.now()).slice(-10);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const categoryId = searchParams.get("category_id") ?? "";

    const companyId = await getPosCompanyId();

    const parts: Prisma.StTicketWhereInput[] = [];
    if (search) {
      parts.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { subject: { contains: search, mode: "insensitive" } },
          { ticketCode: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (status && status !== "all") parts.push({ status });
    if (categoryId && categoryId !== "all") parts.push({ categoryId: BigInt(categoryId) });
    if (companyId != null) {
      parts.push({ OR: [{ organizationId: null }, { organizationId: companyId }] });
    }
    const where: Prisma.StTicketWhereInput = parts.length === 0 ? {} : { AND: parts };

    const [data, total] = await Promise.all([
      prisma.stTicket.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stTicket.count({ where }),
    ]);

    return NextResponse.json({ data: data.map(serializeStTicket), total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      account_type,
      name,
      email,
      subject,
      category_id,
      status,
      description,
      attachments,
      organization_id,
      website_id,
      storefront_customer_id,
      storefront_order_id,
      assigned_staff_user_id,
    } = body;

    if (!name || !email || !subject) {
      return NextResponse.json({ error: "Name, email and subject are required" }, { status: 422 });
    }

    const companyId = await getPosCompanyId();
    const orgFromBody =
      organization_id != null && String(organization_id).match(/^\d+$/)
        ? BigInt(String(organization_id))
        : null;
    const resolvedOrgId = orgFromBody ?? companyId ?? null;

    const ticket = await prisma.stTicket.create({
      data: {
        ticketCode: makeTicketCode(),
        accountType: account_type ?? "custom",
        name,
        email,
        subject,
        categoryId: category_id ? BigInt(category_id) : null,
        status: status ?? "open",
        description: description ?? null,
        attachments: attachments ?? [],
        organizationId: resolvedOrgId ?? undefined,
        websiteId:
          website_id != null && String(website_id).match(/^\d+$/) ? BigInt(String(website_id)) : undefined,
        storefrontCustomerId:
          storefront_customer_id != null && String(storefront_customer_id).match(/^\d+$/)
            ? BigInt(String(storefront_customer_id))
            : undefined,
        storefrontOrderId:
          storefront_order_id != null && String(storefront_order_id).match(/^\d+$/)
            ? BigInt(String(storefront_order_id))
            : undefined,
        assignedStaffUserId:
          assigned_staff_user_id != null && String(assigned_staff_user_id).match(/^\d+$/)
            ? BigInt(String(assigned_staff_user_id))
            : undefined,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    if (resolvedOrgId != null) {
      await publishStorefrontEvent({
        organizationId: resolvedOrgId,
        websiteId: ticket.websiteId,
        eventType: STOREFRONT_EVENTS.TICKET_CREATED,
        resourceType: "support_ticket",
        resourceId: ticket.id.toString(),
        message: `Ticket ${ticket.ticketCode}: ${ticket.subject}`,
        metadata: { ticketCode: ticket.ticketCode, email: ticket.email },
      });
      await maybeQueueTicketNotification({
        organizationId: resolvedOrgId,
        websiteId: ticket.websiteId,
        templateKey: "support.ticket.created",
        recipientEmail: ticket.email,
        payload: { ticketCode: ticket.ticketCode, subject: ticket.subject },
      });
    }

    return NextResponse.json({ data: serializeStTicket(ticket), message: "Ticket created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
