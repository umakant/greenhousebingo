import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireAffiliateApiAccess, decimalToNumber } from "@/lib/affiliate-access";
import { DEFAULT_AFFILIATE_LANDING_URL } from "@/lib/affiliate-link-utils";
import { ensureAffiliateDemoForOrg } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeSettings(row: {
  defaultCommissionRate: Prisma.Decimal;
  cookieWindowDays: number;
  minimumPayout: Prisma.Decimal;
  autoApproveCommissions: boolean;
  notificationEmail: string | null;
  defaultLandingUrl: string | null;
  currency: string;
}) {
  return {
    defaultCommissionRate: decimalToNumber(row.defaultCommissionRate),
    cookieWindowDays: row.cookieWindowDays,
    minimumPayout: decimalToNumber(row.minimumPayout),
    autoApproveCommissions: row.autoApproveCommissions,
    notificationEmail: row.notificationEmail,
    defaultLandingUrl: row.defaultLandingUrl ?? "",
    currency: row.currency,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-settings");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  let row = await prisma.affiliateSettings.findUnique({ where: { organizationId } });
  if (!row) {
    row = await prisma.affiliateSettings.create({
      data: { organizationId },
    });
  }

  return NextResponse.json({ ok: true, settings: serializeSettings(row) });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-settings");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { organizationId } = gate.actor;

  const row = await prisma.affiliateSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      defaultCommissionRate: new Prisma.Decimal(Number(body.defaultCommissionRate ?? 10) || 10),
      cookieWindowDays: Math.max(1, Number(body.cookieWindowDays ?? 30) || 30),
      minimumPayout: new Prisma.Decimal(Number(body.minimumPayout ?? 50) || 50),
      autoApproveCommissions: Boolean(body.autoApproveCommissions),
      notificationEmail: String(body.notificationEmail ?? "").trim() || null,
      defaultLandingUrl:
        String(body.defaultLandingUrl ?? body.default_landing_url ?? DEFAULT_AFFILIATE_LANDING_URL).trim() ||
        DEFAULT_AFFILIATE_LANDING_URL,
      currency: String(body.currency ?? "USD").trim() || "USD",
    },
    update: {
      defaultCommissionRate:
        body.defaultCommissionRate != null
          ? new Prisma.Decimal(Number(body.defaultCommissionRate) || 10)
          : undefined,
      cookieWindowDays:
        body.cookieWindowDays != null ? Math.max(1, Number(body.cookieWindowDays) || 30) : undefined,
      minimumPayout:
        body.minimumPayout != null ? new Prisma.Decimal(Number(body.minimumPayout) || 50) : undefined,
      autoApproveCommissions:
        body.autoApproveCommissions != null ? Boolean(body.autoApproveCommissions) : undefined,
      notificationEmail:
        body.notificationEmail != null ? String(body.notificationEmail).trim() || null : undefined,
      defaultLandingUrl:
        body.defaultLandingUrl != null || body.default_landing_url != null
          ? String(body.defaultLandingUrl ?? body.default_landing_url ?? "").trim() ||
            DEFAULT_AFFILIATE_LANDING_URL
          : undefined,
      currency: body.currency != null ? String(body.currency).trim() || "USD" : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, settings: serializeSettings(row) });
}
