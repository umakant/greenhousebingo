import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import {
  ensureAffiliateDemoForOrg,
  serializePartner,
} from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-partners");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const rows = await prisma.affiliatePartner.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { referralCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 200,
  });

  return NextResponse.json({ ok: true, items: rows.map(serializePartner) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-partners");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const referralCode = String(body.referralCode ?? body.referral_code ?? "")
    .trim()
    .toUpperCase();
  if (!name || !referralCode) {
    return NextResponse.json({ ok: false, message: "Name and referral code are required." }, { status: 400 });
  }

  const row = await prisma.affiliatePartner.create({
    data: {
      organizationId: gate.actor.organizationId,
      name,
      email: String(body.email ?? "").trim() || null,
      referralCode,
      tier: String(body.tier ?? "standard").trim() || "standard",
      status: String(body.status ?? "pending").trim() || "pending",
      commissionRate: new Prisma.Decimal(Number(body.commissionRate ?? body.commission_rate ?? 10) || 10),
    },
  });

  return NextResponse.json({ ok: true, item: serializePartner(row) });
}
