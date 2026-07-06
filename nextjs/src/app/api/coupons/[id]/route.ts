import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { t } from "@/lib/admin-t";


function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function asNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function asJsonStringArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.filter((v): v is string => typeof v === "string");
  return [];
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "view-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const { id } = await ctx.params;
  const couponId = BigInt(id);

  const c = await prisma.coupon.findFirst({
    where: { id: couponId },
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      discount: true,
      limit: true,
      type: true,
      minimumSpend: true,
      maximumSpend: true,
      limitPerUser: true,
      expiryDate: true,
      includedModule: true,
      excludedModule: true,
      status: true,
      createdBy: true,
      createdAt: true,
    },
  });
  if (!c) return NextResponse.json({ ok: false, message: t("Not found") }, { status: 404 });

  // Tenant scoping like Laravel: non-superadmin only sees own.
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } }) : null;
  if (actor?.type !== "superadmin" && actor?.id && c.createdBy && c.createdBy.toString() !== actor.id.toString()) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    coupon: {
      id: c.id.toString(),
      name: c.name,
      description: c.description,
      code: c.code,
      discount: c.discount?.toString?.() ?? String(c.discount ?? "0"),
      limit: c.limit,
      type: c.type,
      minimum_spend: c.minimumSpend?.toString?.() ?? null,
      maximum_spend: c.maximumSpend?.toString?.() ?? null,
      limit_per_user: c.limitPerUser ?? null,
      expiry_date: c.expiryDate?.toISOString?.() ?? null,
      included_module: c.includedModule ?? null,
      excluded_module: c.excludedModule ?? null,
      status: c.status,
      created_at: c.createdAt?.toISOString?.() ?? null,
    },
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "edit-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const { id } = await ctx.params;
  const couponId = BigInt(id);
  const existing = await prisma.coupon.findFirst({ where: { id: couponId }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: t("Not found") }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const data: any = {};
  if (typeof (body as any)?.name === "string") data.name = String((body as any).name).trim();
  if (typeof (body as any)?.description === "string") data.description = String((body as any).description).trim() || null;
  if (typeof (body as any)?.code === "string" && String((body as any).code).trim()) data.code = String((body as any).code).trim().toUpperCase();
  if ((body as any)?.discount != null) data.discount = new Prisma.Decimal(asNumber((body as any).discount, 0));
  if ((body as any)?.limit != null) data.limit = String((body as any).limit).trim() ? Math.max(1, Math.trunc(asNumber((body as any).limit, 1))) : null;
  if (typeof (body as any)?.type === "string" && String((body as any).type).trim()) data.type = String((body as any).type).trim();
  if ((body as any)?.minimum_spend != null) {
    data.minimumSpend = String((body as any).minimum_spend).trim() ? new Prisma.Decimal(asNumber((body as any).minimum_spend, 0)) : null;
  }
  if ((body as any)?.maximum_spend != null) {
    data.maximumSpend = String((body as any).maximum_spend).trim() ? new Prisma.Decimal(asNumber((body as any).maximum_spend, 0)) : null;
  }
  if ((body as any)?.limit_per_user != null) {
    data.limitPerUser = String((body as any).limit_per_user).trim() ? Math.max(1, Math.trunc(asNumber((body as any).limit_per_user, 1))) : null;
  }
  if ((body as any)?.expiry_date != null) data.expiryDate = (body as any).expiry_date ? new Date(String((body as any).expiry_date)) : null;
  if ((body as any)?.included_module != null) data.includedModule = asJsonStringArray((body as any).included_module);
  if ((body as any)?.excluded_module != null) data.excludedModule = asJsonStringArray((body as any).excluded_module);
  if ((body as any)?.status != null) data.status = Boolean((body as any).status);
  data.updatedAt = new Date();

  await prisma.coupon.update({ where: { id: couponId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "delete-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const { id } = await ctx.params;
  const couponId = BigInt(id);
  await prisma.userCoupon.deleteMany({ where: { couponId } }).catch(() => null);
  await prisma.coupon.delete({ where: { id: couponId } });
  return NextResponse.json({ ok: true });
}

