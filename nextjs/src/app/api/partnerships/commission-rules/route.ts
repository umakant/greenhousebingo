import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import {
  getDefaultCommissionRate,
  getMarketplaceDefaultCommissionRule,
  normalizeMarketplaceCommissionType,
  setDefaultCommissionRate,
  setMarketplaceDefaultCommissionRule,
  serializePartner,
} from "@/lib/partner-service";

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const [defaultRate, marketplaceDefault, partners] = await Promise.all([
    getDefaultCommissionRate(),
    getMarketplaceDefaultCommissionRule(),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    ok: true,
    defaultRate,
    marketplaceDefault,
    partners: partners.map(serializePartner),
  });
}

export async function POST(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Update platform default subscription rate.
  if (body.defaultRate !== undefined || body.default_rate !== undefined) {
    const n = Number(body.defaultRate ?? body.default_rate);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ ok: false, message: "Default rate must be between 0 and 100." }, { status: 400 });
    }
    await setDefaultCommissionRate(n);
  }

  // Update platform default MARKETPLACE commission rule (percentage / flat / none).
  if (body.marketplaceDefault !== undefined) {
    const md = (body.marketplaceDefault ?? {}) as Record<string, unknown>;
    const type = normalizeMarketplaceCommissionType(md.type);
    const value = Number(md.value);
    if (type === "percentage" && (!Number.isFinite(value) || value < 0 || value > 100)) {
      return NextResponse.json(
        { ok: false, message: "Marketplace percentage must be between 0 and 100." },
        { status: 400 },
      );
    }
    if (type === "flat" && (!Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ ok: false, message: "Marketplace flat amount must be ≥ 0." }, { status: 400 });
    }
    await setMarketplaceDefaultCommissionRule({ type, value: type === "none" ? 0 : value });
  }

  // Optional per-partner override in the same call.
  if (body.partnerId !== undefined || body.partner_id !== undefined) {
    let partnerId: bigint;
    try {
      partnerId = BigInt(String(body.partnerId ?? body.partner_id));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid partnerId." }, { status: 400 });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };

    // Subscription rate override.
    if (body.commissionRate !== undefined || body.commission_rate !== undefined) {
      const rateRaw = body.commissionRate ?? body.commission_rate;
      let rate: number | null = null;
      if (rateRaw !== null && rateRaw !== undefined && String(rateRaw).trim() !== "") {
        const n = Number(rateRaw);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return NextResponse.json(
            { ok: false, message: "Commission rate must be between 0 and 100." },
            { status: 400 },
          );
        }
        rate = n;
      }
      data.commissionRate = rate;
    }

    // Marketplace rule override (percentage / flat / none → clears override).
    if (body.marketplaceCommissionType !== undefined) {
      const type = normalizeMarketplaceCommissionType(body.marketplaceCommissionType);
      if (type === "none") {
        data.marketplaceCommissionType = null;
        data.marketplaceCommissionValue = null;
      } else {
        const value = Number(body.marketplaceCommissionValue);
        if (type === "percentage" && (!Number.isFinite(value) || value < 0 || value > 100)) {
          return NextResponse.json(
            { ok: false, message: "Marketplace percentage must be between 0 and 100." },
            { status: 400 },
          );
        }
        if (type === "flat" && (!Number.isFinite(value) || value < 0)) {
          return NextResponse.json({ ok: false, message: "Marketplace flat amount must be ≥ 0." }, { status: 400 });
        }
        data.marketplaceCommissionType = type;
        data.marketplaceCommissionValue = value;
      }
    }

    await prisma.partner.update({ where: { id: partnerId }, data });
  }

  return NextResponse.json({
    ok: true,
    defaultRate: await getDefaultCommissionRate(),
    marketplaceDefault: await getMarketplaceDefaultCommissionRule(),
  });
}
