import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { generateOrderNumber, serializeOrder } from "@/lib/marketplace-service";
import { sendTemplatedEmail } from "@/lib/send-templated-email";

export async function GET(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const orders = await prisma.marketplaceOrder.findMany({
    where: { buyerOrganizationId: guard.ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });

  return NextResponse.json({ ok: true, items: orders.map(serializeOrder) });
}

type IncomingLine = { productId?: unknown; quantity?: unknown };

export async function POST(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.manage");
  if (!guard.ok) return guard.response;
  const { organizationId, userId } = guard.ctx;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawLines = Array.isArray(body.lines) ? (body.lines as IncomingLine[]) : [];
  if (rawLines.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one item is required." }, { status: 400 });
  }

  // Snapshot product price/title at order time. Only active products are orderable.
  const productIds: bigint[] = [];
  const qtyById = new Map<string, number>();
  for (const l of rawLines) {
    let pid: bigint;
    try {
      pid = BigInt(String(l.productId));
    } catch {
      continue;
    }
    const qty = Math.max(1, Math.floor(Number(l.quantity ?? 1)) || 1);
    productIds.push(pid);
    qtyById.set(pid.toString(), qty);
  }
  if (productIds.length === 0) {
    return NextResponse.json({ ok: false, message: "No valid items." }, { status: 400 });
  }

  const products = await prisma.marketplaceProduct.findMany({
    where: { id: { in: productIds }, status: "active", vendor: { status: "active" } },
  });
  if (products.length === 0) {
    return NextResponse.json({ ok: false, message: "Items are no longer available." }, { status: 400 });
  }

  let currency = "USD";
  let subtotal = 0;
  const lineData = products.map((p) => {
    const qty = qtyById.get(p.id.toString()) ?? 1;
    const unitPrice = Number(p.price);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    currency = p.currency || currency;
    return {
      productId: p.id,
      vendorId: p.vendorId,
      title: p.name,
      unitPrice,
      quantity: qty,
      lineTotal,
    };
  });

  const notes = String(body.notes ?? "").trim() || null;
  const address = (body.address ?? {}) as Record<string, unknown>;

  const order = await prisma.marketplaceOrder.create({
    data: {
      orderNumber: await generateOrderNumber(),
      buyerOrganizationId: organizationId,
      placedByUserId: userId,
      status: "pending",
      paymentStatus: "unpaid",
      subtotal,
      total: subtotal,
      currency,
      notes,
      lines: { create: lineData },
    },
    include: { lines: true },
  });

  // Scaffold: create an initial queued delivery so buyers can track status.
  await prisma.marketplaceDelivery
    .create({
      data: {
        orderId: order.id,
        buyerOrganizationId: organizationId,
        status: "queued",
        addressLine: String(address.line ?? address.addressLine ?? "").trim() || null,
        city: String(address.city ?? "").trim() || null,
        state: String(address.state ?? "").trim() || null,
        postalCode: String(address.postalCode ?? address.postal_code ?? "").trim() || null,
        country: String(address.country ?? "").trim() || null,
        events: { create: { status: "queued", note: "Order placed", createdByUserId: userId } },
      },
    })
    .catch(() => null);

  // Optional, non-blocking order confirmation email.
  void sendOrderConfirmation(order.orderNumber, subtotal, currency, userId, organizationId).catch(() => null);

  return NextResponse.json({ ok: true, item: serializeOrder(order) }, { status: 201 });
}

async function sendOrderConfirmation(
  orderNumber: string,
  total: number,
  currency: string,
  userId: bigint,
  organizationId: bigint,
): Promise<void> {
  const { loadMarketplaceAdminSettings } = await import("@/lib/marketplace-admin-settings-server");
  const settings = await loadMarketplaceAdminSettings();
  if (!settings.notifications.customerOrderConfirmation) return;

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user?.email) return;

  await sendTemplatedEmail({
    templateName: "Marketplace Order Confirmation",
    mailTo: [user.email],
    ownerId: organizationId,
    variables: {
      name: user.name ?? "Customer",
      order_number: orderNumber,
      order_total: `${currency} ${total.toFixed(2)}`,
      order_status: "pending",
    },
  });
}
