import "server-only";

import { prisma } from "@/lib/prisma";

/** Allowed support categories for marketplace order issues (also seeded as st_ticket_categories). */
export const MARKETPLACE_TICKET_CATEGORIES = [
  "Order issue",
  "Payment issue",
  "Delivery question",
  "Missing items",
  "Damaged items",
  "Refund request",
] as const;

export type MarketplaceTicketCategory = (typeof MARKETPLACE_TICKET_CATEGORIES)[number];

export function isMarketplaceTicketCategory(value: unknown): value is MarketplaceTicketCategory {
  return typeof value === "string" && (MARKETPLACE_TICKET_CATEGORIES as readonly string[]).includes(value.trim());
}

const CATEGORY_COLORS: Record<MarketplaceTicketCategory, string> = {
  "Order issue": "#6366F1",
  "Payment issue": "#10B981",
  "Delivery question": "#3B82F6",
  "Missing items": "#F59E0B",
  "Damaged items": "#EF4444",
  "Refund request": "#DC2626",
};

/** Find-or-create the StTicketCategory row for a marketplace category name. */
export async function resolveMarketplaceTicketCategoryId(name: MarketplaceTicketCategory): Promise<bigint | null> {
  const existing = await prisma.stTicketCategory.findFirst({ where: { name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.stTicketCategory
    .create({ data: { name, color: CATEGORY_COLORS[name] ?? "#6366F1" }, select: { id: true } })
    .catch(() => null);
  return created?.id ?? null;
}

/** 10-digit ticket code (mirrors the Support Ticket add-on convention). */
export function makeMarketplaceTicketCode(): string {
  return String(Date.now()).slice(-10);
}
