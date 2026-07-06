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

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const code = (url.searchParams.get("code") ?? "").trim();
  const type = (url.searchParams.get("type") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim(); // 1|0
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = (url.searchParams.get("direction") ?? "asc").trim().toLowerCase() === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "10") || 10));
  const skip = (page - 1) * perPage;

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } }) : null;
  const actorId = actor?.id ?? null;

  const where: any = {};
  if (actor?.type !== "superadmin" && actorId) where.createdBy = actorId;
  if (name) where.name = { contains: name, mode: "insensitive" as const };
  if (code) where.code = { contains: code, mode: "insensitive" as const };
  if (type) where.type = type;
  if (status === "1") where.status = true;
  if (status === "0") where.status = false;

  const orderBy = (() => {
    const allowed: Record<string, any> = {
      name: { name: direction },
      code: { code: direction },
      type: { type: direction },
      status: { status: direction },
      expiryDate: { expiryDate: direction },
      createdAt: { createdAt: direction },
    };
    if (sort && allowed[sort]) return allowed[sort];
    return { createdAt: "desc" as const };
  })();

  const [total, rows] = await Promise.all([
    prisma.coupon.count({ where }).catch(() => 0),
    prisma.coupon.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
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
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    coupons: {
      data: rows.map((c) => ({
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
      })),
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "create-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;
  const actorId = actor?.id ?? null;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String((body as any)?.name ?? "").trim();
  const code = String((body as any)?.code ?? "").trim().toUpperCase();
  const description = String((body as any)?.description ?? "").trim();
  const type = String((body as any)?.type ?? "percentage").trim();
  const status = Boolean((body as any)?.status ?? true);

  if (!name) return NextResponse.json({ ok: false, message: t("Name is required.") }, { status: 400 });
  if (!code) return NextResponse.json({ ok: false, message: t("Code is required.") }, { status: 400 });

  const coupon = await prisma.coupon.create({
    data: {
      name,
      description: description || null,
      code,
      discount: new Prisma.Decimal(asNumber((body as any)?.discount, 0)),
      limit: (body as any)?.limit != null && String((body as any)?.limit).trim() ? Math.max(1, Math.trunc(asNumber((body as any)?.limit, 1))) : null,
      type,
      minimumSpend: (body as any)?.minimum_spend != null && String((body as any)?.minimum_spend).trim() ? new Prisma.Decimal(asNumber((body as any)?.minimum_spend, 0)) : null,
      maximumSpend: (body as any)?.maximum_spend != null && String((body as any)?.maximum_spend).trim() ? new Prisma.Decimal(asNumber((body as any)?.maximum_spend, 0)) : null,
      limitPerUser: (body as any)?.limit_per_user != null && String((body as any)?.limit_per_user).trim() ? Math.max(1, Math.trunc(asNumber((body as any)?.limit_per_user, 1))) : null,
      expiryDate: (body as any)?.expiry_date ? new Date(String((body as any)?.expiry_date)) : null,
      includedModule: asJsonStringArray((body as any)?.included_module),
      excludedModule: asJsonStringArray((body as any)?.excluded_module),
      status,
      createdBy: actorId,
      createdAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: coupon.id.toString() }, { status: 201 });
}

