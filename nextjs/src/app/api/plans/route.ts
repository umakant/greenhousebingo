import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  canReadSubscriptionCatalog,
  roleFromRequest,
} from "@/lib/subscription-catalog-auth";
import { sortPlansForDisplay } from "@/lib/plan-display-order";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Avoid duplicate `const` names inside route handlers (some Turbopack builds merge scopes). */
function pfRoleIsSuperadmin(role: string | undefined): boolean {
  return role === "superadmin";
}

async function nextPlanId(): Promise<bigint> {
  const agg = await prisma.plan.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

function asNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function asUsersCount(x: unknown) {
  const n = Math.trunc(asNumber(x, 1));
  // Laravel supports "-1" for unlimited.
  if (n === -1) return -1;
  return Math.max(1, n);
}

export async function GET(req: NextRequest) {
  const role = roleFromRequest(req);
  if (!role) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!canReadSubscriptionCatalog(role, perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const callerIsSuperadmin = role === "superadmin";

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;
  const actorId = actor?.id ?? null;

  const where = callerIsSuperadmin
    ? {}
    : {
        OR: [{ customPlan: false }, ...(actorId ? [{ createdBy: actorId }] : [])],
      };

  const [rows, orderCounts] = await Promise.all([
    prisma.plan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        numberOfUsers: true,
        storageLimit: true,
        status: true,
        freePlan: true,
        customPlan: true,
        modules: true,
        packagePriceMonthly: true,
        packagePriceYearly: true,
        pricePerUserMonthly: true,
        pricePerUserYearly: true,
        pricePerStorageMonthly: true,
        pricePerStorageYearly: true,
        trial: true,
        trialDays: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        planId: { not: null },
        OR: [{ paymentStatus: "succeeded" }, { status: "succeeded" }],
      },
      _count: { _all: true },
    }),
  ]);

  const countsByPlan = new Map<string, number>();
  for (const r of orderCounts) {
    if (!r.planId) continue;
    countsByPlan.set(r.planId.toString(), r._count._all);
  }

  return NextResponse.json({
    ok: true,
    items: sortPlansForDisplay(
      rows.map((p) => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        numberOfUsers: p.numberOfUsers,
        storageLimit: p.storageLimit,
        status: p.status,
        freePlan: p.freePlan,
        customPlan: p.customPlan,
        modules: p.modules,
        orders_count: countsByPlan.get(p.id.toString()) ?? 0,
        packagePriceMonthly: p.packagePriceMonthly?.toString?.() ?? String(p.packagePriceMonthly ?? "0"),
        packagePriceYearly: p.packagePriceYearly?.toString?.() ?? String(p.packagePriceYearly ?? "0"),
        pricePerUserMonthly: p.pricePerUserMonthly?.toString?.() ?? String(p.pricePerUserMonthly ?? "0"),
        pricePerUserYearly: p.pricePerUserYearly?.toString?.() ?? String(p.pricePerUserYearly ?? "0"),
        pricePerStorageMonthly: p.pricePerStorageMonthly?.toString?.() ?? String(p.pricePerStorageMonthly ?? "0"),
        pricePerStorageYearly: p.pricePerStorageYearly?.toString?.() ?? String(p.pricePerStorageYearly ?? "0"),
        trial: p.trial,
        trialDays: p.trialDays,
        createdBy: p.createdBy != null ? p.createdBy.toString() : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    ),
  });
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "create-plans")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const role = roleFromRequest(req);
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;
  const actorId = actor?.id ?? null;
  const postingAsCompanyUser = !pfRoleIsSuperadmin(role);

  // Company users create custom plans (usage subscription); superadmin creates pre-package plans.
  const customPlan = postingAsCompanyUser;

  const body = (await req.json().catch(() => null)) as any;
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const description = String(body?.description ?? "").trim();
  const numberOfUsers = asUsersCount(body?.number_of_users);
  const storageLimitMb = Math.max(0, Math.floor(asNumber(body?.storage_limit_mb, 0)));
  const storageLimit = storageLimitMb * 1024 * 1024;

  const status = Boolean(body?.status ?? true);
  const freePlan = Boolean(body?.free_plan ?? false);
  const trialRaw = body?.trial;
  const trial =
    trialRaw != null
      ? Boolean(trialRaw)
      : !freePlan;
  const trialDays = Math.max(
    0,
    Math.floor(
      asNumber(
        body?.trial_days,
        trial && !freePlan ? 30 : 0,
      ),
    ),
  );

  const modules = Array.isArray(body?.modules) ? body.modules.filter((x: any) => typeof x === "string") : [];

  const packagePriceMonthly = new Prisma.Decimal(asNumber(body?.package_price_monthly, 0));
  const packagePriceYearly = new Prisma.Decimal(asNumber(body?.package_price_yearly, 0));
  const pricePerUserMonthly = new Prisma.Decimal(asNumber(body?.price_per_user_monthly, 0));
  const pricePerUserYearly = new Prisma.Decimal(asNumber(body?.price_per_user_yearly, 0));
  const pricePerStorageMonthly = new Prisma.Decimal(asNumber(body?.price_per_storage_monthly, 0));
  const pricePerStorageYearly = new Prisma.Decimal(asNumber(body?.price_per_storage_yearly, 0));

  const id = await nextPlanId();
  const plan = await prisma.plan.create({
    data: {
      id,
      name,
      description: description || null,
      numberOfUsers,
      storageLimit,
      status,
      freePlan,
      customPlan,
      modules,
      packagePriceMonthly,
      packagePriceYearly,
      pricePerUserMonthly,
      pricePerUserYearly,
      pricePerStorageMonthly,
      pricePerStorageYearly,
      trial,
      trialDays,
      createdBy: postingAsCompanyUser ? actorId : null,
      createdAt: new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: plan.id.toString() }, { status: 201 });
}

