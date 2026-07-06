import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import {
  MARKETPLACE_SETTINGS_CONFIG_KEY,
  parseMarketplaceAdminSettings,
  validateMarketplaceAdminSettings,
} from "@/lib/marketplace-admin-settings";
import { loadMarketplaceAdminSettings } from "@/lib/marketplace-admin-settings-server";

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.settings.manage");
  if (denied) return denied;

  const settings = await loadMarketplaceAdminSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function PUT(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.settings.manage");
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const settings = parseMarketplaceAdminSettings(body.settings ?? body);
  const validationError = validateMarketplaceAdminSettings(settings);
  if (validationError) {
    return NextResponse.json({ ok: false, message: validationError }, { status: 400 });
  }

  await prisma.marketplaceConfig.upsert({
    where: { key: MARKETPLACE_SETTINGS_CONFIG_KEY },
    update: { value: JSON.stringify(settings), updatedAt: new Date() },
    create: { key: MARKETPLACE_SETTINGS_CONFIG_KEY, value: JSON.stringify(settings) },
  });

  return NextResponse.json({ ok: true, settings });
}
