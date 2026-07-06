import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { t } from "@/lib/admin-t";


function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-bank-transfer-requests")) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  const url = new URL(req.url);
  const orderNumber = (url.searchParams.get("order_number") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const userName = (url.searchParams.get("user_name") ?? "").trim();
  const sort = (url.searchParams.get("sort") ?? "").trim();
  const direction = (url.searchParams.get("direction") ?? "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "10") || 10));
  const skip = (page - 1) * perPage;

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } }) : null;

  const where: any = {};
  if (actor?.type !== "superadmin" && actor?.id) where.userId = actor.id;
  if (orderNumber) where.orderId = { contains: orderNumber, mode: "insensitive" as const };
  if (status) where.status = status;

  const orderBy = (() => {
    const allowed: Record<string, any> = {
      order_id: { orderId: direction },
      status: { status: direction },
      created_at: { createdAt: direction },
      price: { price: direction },
    };
    if (sort && allowed[sort]) return allowed[sort];
    return { createdAt: "desc" as const };
  })();

  const [total, rows] = await Promise.all([
    prisma.bankTransferPayment.count({ where }).catch(() => 0),
    prisma.bankTransferPayment.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      select: {
        id: true,
        userId: true,
        orderId: true,
        status: true,
        priceCurrency: true,
        attachment: true,
        price: true,
        request: true,
        createdAt: true,
      },
    }),
  ]);

  const userIds = Array.from(new Set(rows.map((r) => r.userId.toString())));
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds.map((s) => BigInt(s)) } }, select: { id: true, name: true, email: true } }).catch(() => [])
    : [];
  const usersById = new Map(users.map((u) => [u.id.toString(), { id: u.id.toString(), name: u.name ?? "", email: u.email ?? "" }]));

  const parsed = rows.map((r) => {
    const reqObj = (() => {
      try {
        return r.request ? (JSON.parse(r.request) as any) : {};
      } catch {
        return {};
      }
    })();
    return {
      id: r.id.toString(),
      order_id: r.orderId,
      status: r.status,
      price_currency: r.priceCurrency,
      attachment: r.attachment,
      price: r.price?.toString?.() ?? "0",
      created_at: r.createdAt?.toISOString?.() ?? null,
      user: usersById.get(r.userId.toString()) ?? null,
      request: reqObj,
      plan: reqObj?.plan_id ? { id: String(reqObj.plan_id), name: "" } : null,
    };
  });

  const planIds = Array.from(
    new Set(parsed.map((r) => (r.request?.plan_id != null ? String(r.request.plan_id) : null)).filter(Boolean)),
  ) as string[];
  const plans = planIds.length
    ? await prisma.plan.findMany({ where: { id: { in: planIds.map((s) => BigInt(s)) } }, select: { id: true, name: true } }).catch(() => [])
    : [];
  const plansById = new Map(plans.map((p) => [p.id.toString(), p.name ?? ""]));

  for (const r of parsed) {
    const pid = r.request?.plan_id != null ? String(r.request.plan_id) : null;
    if (pid && r.plan) r.plan.name = plansById.get(pid) ?? "";
  }

  const filtered = userName
    ? parsed.filter((r) => (r.user?.name ?? "").toLowerCase().includes(userName.toLowerCase()))
    : parsed;

  return NextResponse.json({
    ok: true,
    requests: {
      data: filtered,
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    },
  });
}

