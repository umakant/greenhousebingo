import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPosCompanyId, posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posSale.findMany({
    include: { customer: true, branch: true, items: { include: { product: true } } },
    orderBy: { date: "desc" }, take: 200,
  });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  const number = `SL-${Date.now()}`;
  const items = (body.items ?? []) as Array<{ productId?: string; name: string; qty: number; price: number; discount?: number; taxRate?: number; subtotal: number }>;
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = items.reduce((s, i) => s + (i.subtotal * (i.taxRate ?? 0) / 100), 0);
  const discount = body.discount ?? 0;
  const total = subtotal + taxAmount - discount;
  const row = await prisma.posSale.create({
    data: {
      number, customerId: body.customerId ? BigInt(body.customerId) : null,
      branchId: body.branchId ? BigInt(body.branchId) : null,
      cashRegisterId: body.cashRegisterId ? BigInt(body.cashRegisterId) : null,
      subtotal, taxAmount, discount, total, paid: body.paid ?? total,
      paymentMethod: body.paymentMethod || "cash", status: body.status || "completed",
      note: body.note || null, date: new Date(body.date || Date.now()),
      items: { create: items.map(i => ({ productId: i.productId ? BigInt(i.productId) : null, name: i.name, qty: i.qty, price: i.price, discount: i.discount ?? 0, taxRate: i.taxRate ?? 0, subtotal: i.subtotal })) },
    },
    include: { customer: true, branch: true, items: { include: { product: true } } },
  });
  const orgId = await getPosCompanyId();
  if (orgId != null && row.status === "completed") {
    await publishStorefrontEvent({
      organizationId: orgId,
      websiteId: null,
      eventType: STOREFRONT_EVENTS.POS_SALE_COMPLETED,
      resourceType: "pos_sale",
      resourceId: row.id.toString(),
      message: `POS sale ${row.number}`,
      metadata: { total: Number(row.total), paymentMethod: row.paymentMethod },
    });
  }
  return posOk(ser(row), 201);
}
