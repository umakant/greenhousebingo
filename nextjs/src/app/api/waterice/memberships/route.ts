import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 200);
}

function isSuperadmin(req: NextRequest): boolean {
  return req.cookies.get("pf_role")?.value === "superadmin";
}

function parsePerks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

type MembershipRow = {
  id: bigint;
  name: string;
  slug: string;
  price: unknown;
  billingPeriod: string;
  tagline: string | null;
  perks: unknown;
  badge: string | null;
  ctaLabel: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export function serializeMembership(m: MembershipRow) {
  const price =
    m.price && typeof m.price === "object" && "toNumber" in m.price
      ? (m.price as { toNumber: () => number }).toNumber()
      : Number(m.price);
  return {
    id: m.id.toString(),
    name: m.name,
    slug: m.slug,
    price: Number.isFinite(price) ? price : 0,
    billingPeriod: m.billingPeriod,
    tagline: m.tagline ?? "",
    perks: Array.isArray(m.perks) ? (m.perks as string[]) : [],
    badge: m.badge,
    ctaLabel: m.ctaLabel ?? "Join",
    featured: m.featured,
    published: m.published,
    sortOrder: m.sortOrder,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  if (!isSuperadmin(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.waterIceMembership.findMany({
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
  return NextResponse.json({ ok: true, items: rows.map(serializeMembership) });
}

export async function POST(req: NextRequest) {
  if (!isSuperadmin(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ ok: false, message: "A valid price is required." }, { status: 400 });
  }

  const slugRaw = body.slug != null ? String(body.slug).trim() : "";
  const slug = slugify(slugRaw || name);
  if (!slug) return NextResponse.json({ ok: false, message: "Invalid name/slug." }, { status: 400 });

  const dup = await prisma.waterIceMembership.findFirst({ where: { slug }, select: { id: true } });
  if (dup) {
    return NextResponse.json({ ok: false, message: "A plan with this slug already exists." }, { status: 409 });
  }

  const created = await prisma.waterIceMembership.create({
    data: {
      name,
      slug,
      price,
      billingPeriod: String(body.billingPeriod ?? "month").trim() || "month",
      tagline: body.tagline != null && String(body.tagline).trim() ? String(body.tagline).trim() : null,
      perks: parsePerks(body.perks) as Prisma.InputJsonValue,
      badge: body.badge != null && String(body.badge).trim() ? String(body.badge).trim().slice(0, 64) : null,
      ctaLabel: body.ctaLabel != null && String(body.ctaLabel).trim() ? String(body.ctaLabel).trim().slice(0, 64) : "Join",
      featured: Boolean(body.featured),
      published: body.published !== undefined ? Boolean(body.published) : true,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0,
    },
  });

  return NextResponse.json({ ok: true, item: serializeMembership(created) }, { status: 201 });
}
