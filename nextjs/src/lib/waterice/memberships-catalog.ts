import "server-only";

import { prisma } from "@/lib/prisma";
import { MEMBERSHIPS, type Membership } from "@/data/waterice/memberships";

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function rowToMembership(row: {
  slug: string;
  name: string;
  price: unknown;
  billingPeriod: string;
  tagline: string | null;
  perks: unknown;
  badge: string | null;
  ctaLabel: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}): Membership {
  return {
    slug: row.slug,
    name: row.name,
    price: toNumber(row.price),
    billingPeriod: row.billingPeriod || "month",
    tagline: row.tagline ?? "",
    perks: asStringArray(row.perks),
    badge: row.badge,
    ctaLabel: row.ctaLabel || "Join",
    featured: row.featured,
    published: row.published,
    sortOrder: row.sortOrder ?? 0,
  };
}

/**
 * Returns published Water Ice Express membership plans, falling back to the
 * bundled static list when the table is empty or the DB is unavailable
 * (dev / pre-seed safety).
 */
export async function getWaterIceMemberships(): Promise<Membership[]> {
  try {
    const rows = await prisma.waterIceMembership.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    });
    if (rows.length === 0) return MEMBERSHIPS.filter((m) => m.published);
    return rows.map(rowToMembership);
  } catch {
    return MEMBERSHIPS.filter((m) => m.published);
  }
}
