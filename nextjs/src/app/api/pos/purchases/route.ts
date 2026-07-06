import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPosCompanyId, posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posPurchase.findMany({ include: { vendor: true, branch: true, items: { include: { product: true } } }, orderBy: { date: "desc" }, take: 200 });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  const number = `PO-${Date.now()}`;
  const items = (body.items ?? []) as Array<{ productId?: string; name: string; qty: number; cost: number; discount?: number; taxRate?: number; subtotal: number }>;
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = items.reduce((s, i) => s + (i.subtotal * (i.taxRate ?? 0) / 100), 0);
  const discount = body.discount ?? 0;
  const total = subtotal + taxAmount - discount;
  const row = await prisma.posPurchase.create({
    data: {
      number, vendorId: body.vendorId ? BigInt(body.vendorId) : null,
      branchId: body.branchId ? BigInt(body.branchId) : null,
      subtotal, taxAmount, discount, total, paid: body.paid ?? 0,
      status: body.status || "received", note: body.note || null, date: new Date(body.date || Date.now()),
      items: { create: items.map(i => ({ productId: i.productId ? BigInt(i.productId) : null, name: i.name, qty: i.qty, cost: i.cost, discount: i.discount ?? 0, taxRate: i.taxRate ?? 0, subtotal: i.subtotal })) },
    },
    include: { vendor: true, branch: true, items: { include: { product: true } } },
  });

  const sendVendor =
    body.send_vendor_email === true ||
    body.send_vendor_email === "true" ||
    body.send_vendor_email === 1;
  if (sendVendor && row.vendor?.email?.trim().includes("@")) {
    const companyId = await getPosCompanyId();
    if (companyId) {
      const settings = await getSettingsForOwner(companyId);
      if (isCompanyEmailNotificationEnabled(settings, "Purchase Send")) {
        const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
        const purchaseUrl = base ? `${base}/pos/dashboard` : "-";
        sendTemplatedEmailAsync({
          templateName: "Purchase Send",
          mailTo: [row.vendor!.email!.trim()],
          ownerId: companyId,
          variables: {
            purchase_name: row.vendor!.name,
            purchase_number: row.number,
            purchase_url: purchaseUrl,
          },
        });
      }
    }
  }

  return posOk(ser(row), 201);
}
