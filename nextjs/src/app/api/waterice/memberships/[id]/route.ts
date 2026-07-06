import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeMembership } from "../route";

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

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSuperadmin(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const mid = parseId(id);
  if (!mid) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.waterIceMembership.findUnique({ where: { id: mid }, select: { id: true, slug: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Prisma.WaterIceMembershipUpdateInput = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ ok: false, message: "Name cannot be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.slug !== undefined) {
    const slug = slugify(String(body.slug));
    if (slug && slug !== existing.slug) {
      const dup = await prisma.waterIceMembership.findFirst({
        where: { slug, id: { not: mid } },
        select: { id: true },
      });
      if (dup) return NextResponse.json({ ok: false, message: "Slug already in use." }, { status: 409 });
      data.slug = slug;
    }
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ ok: false, message: "Invalid price." }, { status: 400 });
    }
    data.price = price;
  }
  if (body.billingPeriod !== undefined) {
    data.billingPeriod = String(body.billingPeriod).trim() || "month";
  }
  if (body.tagline !== undefined) {
    data.tagline = String(body.tagline).trim() ? String(body.tagline).trim() : null;
  }
  if (body.perks !== undefined) {
    data.perks = parsePerks(body.perks) as Prisma.InputJsonValue;
  }
  if (body.badge !== undefined) {
    data.badge = String(body.badge).trim() ? String(body.badge).trim().slice(0, 64) : null;
  }
  if (body.ctaLabel !== undefined) {
    data.ctaLabel = String(body.ctaLabel).trim() ? String(body.ctaLabel).trim().slice(0, 64) : "Join";
  }
  if (body.featured !== undefined) data.featured = Boolean(body.featured);
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
    data.sortOrder = Math.trunc(Number(body.sortOrder));
  }

  const updated = await prisma.waterIceMembership.update({ where: { id: mid }, data });
  return NextResponse.json({ ok: true, item: serializeMembership(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSuperadmin(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const mid = parseId(id);
  if (!mid) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.waterIceMembership.findUnique({ where: { id: mid }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.waterIceMembership.delete({ where: { id: mid } });
  return NextResponse.json({ ok: true });
}
