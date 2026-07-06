import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPosCompanyId, posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const row = await prisma.posPurchase.findUnique({ where: { id: BigInt(id) }, include: { vendor: true, branch: true, items: { include: { product: true } } } });
  if (!row) return posErr("Not found", 404);
  return posOk(ser(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const prev = await prisma.posPurchase.findUnique({ where: { id: BigInt(id) }, include: { vendor: true } });
  if (!prev) return posErr("Not found", 404);
  const row = await prisma.posPurchase.update({
    where: { id: BigInt(id) },
    data: { status: body.status ?? undefined, paid: body.paid ?? undefined, note: body.note ?? undefined },
    include: { vendor: true, branch: true, items: true },
  });

  const sendVendor =
    body.send_vendor_email === true ||
    body.send_vendor_email === "true" ||
    body.send_vendor_email === 1;
  const becameSent = body.status != null && String(body.status).trim() === "sent" && prev.status !== "sent";
  if ((sendVendor || becameSent) && row.vendor?.email?.trim().includes("@")) {
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

  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posPurchase.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
