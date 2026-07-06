import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MARKETPLACE_ADMIN_SETTINGS,
  MARKETPLACE_SETTINGS_CONFIG_KEY,
  parseMarketplaceAdminSettings,
  type MarketplaceAdminSettings,
} from "@/lib/marketplace-admin-settings";

export async function loadMarketplaceAdminSettings(): Promise<MarketplaceAdminSettings> {
  const row = await prisma.marketplaceConfig.findFirst({
    where: { key: MARKETPLACE_SETTINGS_CONFIG_KEY },
    select: { value: true },
  });
  if (!row?.value) return structuredClone(DEFAULT_MARKETPLACE_ADMIN_SETTINGS);
  try {
    return parseMarketplaceAdminSettings(JSON.parse(row.value));
  } catch {
    return structuredClone(DEFAULT_MARKETPLACE_ADMIN_SETTINGS);
  }
}
