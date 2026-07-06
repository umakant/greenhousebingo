import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-orders")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const orderId = (url.searchParams.get("order_id") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = (url.searchParams.get("direction") ?? "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "10") || 10));
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (orderId) where.orderId = { contains: orderId, mode: "insensitive" as const };
  if (search) {
    where.OR = [
      { orderId: { contains: search, mode: "insensitive" as const } },
      { name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { planName: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const orderBy = (() => {
    const allowed: Record<string, any> = {
      order_id: { orderId: direction },
      payment_status: { paymentStatus: direction },
      payment_type: { paymentType: direction },
      created_at: { createdAt: direction },
      id: { id: direction },
    };
    if (sort && allowed[sort]) return allowed[sort];
    return { id: "desc" as const };
  })();

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }).catch(() => 0),
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      select: {
        id: true,
        orderId: true,
        name: true,
        email: true,
        planName: true,
        planId: true,
        price: true,
        discountAmount: true,
        currency: true,
        paymentStatus: true,
        paymentType: true,
        createdAt: true,
      },
    }),
  ]);

  const planIds = Array.from(new Set(rows.map((r) => (r.planId ? r.planId.toString() : null)).filter(Boolean))) as string[];
  const plans = planIds.length
    ? await prisma.plan.findMany({ where: { id: { in: planIds.map((s) => BigInt(s)) } }, select: { id: true, name: true } }).catch(() => [])
    : [];
  const plansById = new Map(plans.map((p) => [p.id.toString(), p.name ?? ""]));

  const orderIds = rows.map((r) => r.orderId).filter(Boolean) as string[];
  const couponUsage = orderIds.length
    ? await prisma.userCoupon.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, couponId: true } }).catch(() => [])
    : [];
  const couponIds = Array.from(new Set(couponUsage.map((u) => u.couponId.toString())));
  const coupons = couponIds.length
    ? await prisma.coupon.findMany({ where: { id: { in: couponIds.map((s) => BigInt(s)) } }, select: { id: true, code: true, name: true } }).catch(() => [])
    : [];
  const couponsById = new Map(coupons.map((c) => [c.id.toString(), { code: c.code, name: c.name }]));
  const couponByOrderId = new Map<string, { code: string; name: string }>();
  for (const u of couponUsage) {
    const c = couponsById.get(u.couponId.toString());
    if (u.orderId && c && !couponByOrderId.has(u.orderId)) couponByOrderId.set(u.orderId, c);
  }

  return NextResponse.json({
    ok: true,
    orders: {
      data: rows.map((o) => ({
        id: o.id.toString(),
        order_id: o.orderId ?? o.id.toString(),
        name: o.name ?? "",
        email: o.email ?? "",
        plan_name: o.planName ?? (o.planId ? plansById.get(o.planId.toString()) ?? "" : ""),
        plan_id: o.planId?.toString?.() ?? null,
        price: o.price?.toString?.() ?? "0",
        currency: o.currency ?? "USD",
        payment_status: o.paymentStatus ?? "pending",
        payment_type: o.paymentType ?? "bank_transfer",
        created_at: o.createdAt?.toISOString?.() ?? null,
        total_coupon_used: o.orderId && couponByOrderId.get(o.orderId) ? { coupon_detail: couponByOrderId.get(o.orderId) } : null,
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

