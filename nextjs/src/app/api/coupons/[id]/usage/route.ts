import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { t } from "@/lib/admin-t";


export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "view-coupons")) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const url = new URL(req.url);
  const userName = (url.searchParams.get("user_name") ?? "").trim();
  const orderId = (url.searchParams.get("order_id") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "10") || 10));
  const skip = (page - 1) * perPage;

  const { id } = await ctx.params;
  const couponId = BigInt(id);

  const where: any = { couponId };
  if (orderId) where.orderId = { contains: orderId, mode: "insensitive" as const };

  const [total, rows] = await Promise.all([
    prisma.userCoupon.count({ where }).catch(() => 0),
    prisma.userCoupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      select: { id: true, userId: true, orderId: true, createdAt: true },
    }),
  ]);

  const userIds = Array.from(new Set(rows.map((r) => r.userId.toString())));
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds.map((s) => BigInt(s)) } }, select: { id: true, name: true, email: true } }).catch(() => [])
    : [];

  const usersById = new Map(users.map((u) => [u.id.toString(), { id: u.id.toString(), name: u.name ?? "", email: u.email ?? "" }]));

  const filteredRows = userName
    ? rows.filter((r) => {
        const u = usersById.get(r.userId.toString());
        return u?.name?.toLowerCase().includes(userName.toLowerCase());
      })
    : rows;

  return NextResponse.json({
    ok: true,
    usageRecords: {
      data: filteredRows.map((r) => ({
        id: r.id.toString(),
        coupon_id: couponId.toString(),
        user_id: r.userId.toString(),
        order_id: r.orderId ?? null,
        user: usersById.get(r.userId.toString()) ?? null,
        created_at: r.createdAt?.toISOString?.() ?? null,
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

