import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPosCompanyId } from "@/lib/pos-api";
import { serializeStTicket } from "@/lib/support-ticket-serialize";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";
import { maybeQueueTicketNotification } from "@/lib/storefront/storefront-support-notifications";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticket = await prisma.stTicket.findUnique({
      where: { id: BigInt(id) },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const companyId = await getPosCompanyId();
    if (
      companyId != null &&
      ticket.organizationId != null &&
      ticket.organizationId !== companyId
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: serializeStTicket(ticket) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load ticket" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bid = BigInt(id);
    const body = await req.json();
    const {
      account_type,
      name,
      email,
      subject,
      category_id,
      status,
      description,
      storefront_order_id,
      assigned_staff_user_id,
    } = body;

    const prev = await prisma.stTicket.findUnique({
      where: { id: bid },
      select: {
        status: true,
        description: true,
        organizationId: true,
        websiteId: true,
        ticketCode: true,
      },
    });
    if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ticket = await prisma.stTicket.update({
      where: { id: bid },
      data: {
        accountType: account_type,
        name,
        email,
        subject,
        categoryId: category_id ? BigInt(category_id) : null,
        status,
        description,
        ...(storefront_order_id != null && String(storefront_order_id).match(/^\d+$/)
          ? { storefrontOrderId: BigInt(String(storefront_order_id)) }
          : {}),
        ...(assigned_staff_user_id != null && String(assigned_staff_user_id).match(/^\d+$/)
          ? { assignedStaffUserId: BigInt(String(assigned_staff_user_id)) }
          : {}),
        updatedAt: new Date(),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    const oid = ticket.organizationId;
    if (oid != null) {
      const closedNow =
        String(prev.status).toLowerCase() !== "closed" && String(status ?? prev.status).toLowerCase() === "closed";
      if (closedNow) {
        await publishStorefrontEvent({
          organizationId: oid,
          websiteId: ticket.websiteId,
          eventType: STOREFRONT_EVENTS.TICKET_CLOSED,
          resourceType: "support_ticket",
          resourceId: ticket.id.toString(),
          message: `Ticket ${ticket.ticketCode} closed`,
        });
        if (ticket.email) {
          await maybeQueueTicketNotification({
            organizationId: oid,
            websiteId: ticket.websiteId,
            templateKey: "support.ticket.closed",
            recipientEmail: ticket.email,
            payload: { ticketCode: ticket.ticketCode },
          });
        }
      }
      const descChanged =
        description != null && String(description) !== String(prev.description ?? "");
      if (descChanged) {
        await publishStorefrontEvent({
          organizationId: oid,
          websiteId: ticket.websiteId,
          eventType: STOREFRONT_EVENTS.TICKET_REPLY,
          resourceType: "support_ticket",
          resourceId: ticket.id.toString(),
          message: `Ticket ${ticket.ticketCode} updated`,
        });
      }
    }

    return NextResponse.json({ data: serializeStTicket(ticket), message: "Ticket updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stTicket.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
