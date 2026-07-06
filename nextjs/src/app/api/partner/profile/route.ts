import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnerApi } from "@/lib/partner-api-guard";
import { serializePartner } from "@/lib/partner-service";

export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const partner = await prisma.partner.findFirst({ where: { id: guard.partner.id } });
  if (!partner) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true, item: serializePartner(partner) });
}

/** Partner self-service profile update. Cannot change status, slug, code, or commission rate. */
export async function PATCH(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ ok: false, message: "Name cannot be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.phone != null) data.phone = String(body.phone).trim() || null;
  if (body.brandName != null || body.brand_name != null) {
    data.brandName = String(body.brandName ?? body.brand_name).trim() || null;
  }
  if (body.notes != null) data.notes = String(body.notes).trim() || null;

  // Payout settings (allowed for self-service).
  if (body.payoutMethod != null || body.payout_method != null) {
    data.payoutMethod = String(body.payoutMethod ?? body.payout_method).trim() || null;
  }
  if (body.payoutEmail != null || body.payout_email != null) {
    data.payoutEmail = String(body.payoutEmail ?? body.payout_email).trim() || null;
  }

  const updated = await prisma.partner.update({ where: { id: guard.partner.id }, data });
  return NextResponse.json({ ok: true, item: serializePartner(updated) });
}
