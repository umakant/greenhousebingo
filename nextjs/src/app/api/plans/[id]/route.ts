import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { hasPermission } from "@/lib/authz";
import {
  canReadSubscriptionCatalog,
  isCompanyTenantRole,
  roleFromRequest,
} from "@/lib/subscription-catalog-auth";

function asNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function asUsersCount(x: unknown) {
  const n = Math.trunc(asNumber(x, 1));
  if (n === -1) return -1;
  return Math.max(1, n);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = roleFromRequest(req);
  if (!role) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!canReadSubscriptionCatalog(role, perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const isSuperAdmin = role === "superadmin";
  const hasManagePlans = hasPermission(perms, "manage-plans");
  const canManage = isSuperAdmin && hasManagePlans;

  const { id } = await ctx.params;
  const planId = BigInt(id);

  const plan = await prisma.plan.findFirst({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      description: true,
      numberOfUsers: true,
      storageLimit: true,
      status: true,
      freePlan: true,
      customPlan: true,
      createdBy: true,
      modules: true,
      packagePriceMonthly: true,
      packagePriceYearly: true,
      pricePerUserMonthly: true,
      pricePerUserYearly: true,
      pricePerStorageMonthly: true,
      pricePerStorageYearly: true,
      trial: true,
      trialDays: true,
      createdAt: true,
    },
  });

  if (!plan) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!canManage && !isSuperAdmin && !isCompanyTenantRole(role)) {
    const email = req.cookies.get("pf_email")?.value ?? "";
    const actor = email ? await prisma.user.findFirst({ where: { email }, select: { id: true } }) : null;
    const actorId = actor?.id ?? null;
    const visible = !plan.customPlan || (plan.createdBy != null && plan.createdBy === actorId);
    if (!visible) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const planPayload = {
    id: plan.id.toString(),
    name: plan.name,
    description: plan.description,
    numberOfUsers: Number(plan.numberOfUsers),
    storageLimit: Number(plan.storageLimit),
    status: plan.status,
    freePlan: plan.freePlan,
    customPlan: plan.customPlan,
    createdBy: plan.createdBy != null ? plan.createdBy.toString() : null,
    modules: plan.modules,
    packagePriceMonthly: plan.packagePriceMonthly?.toString?.() ?? String(plan.packagePriceMonthly ?? "0"),
    packagePriceYearly: plan.packagePriceYearly?.toString?.() ?? String(plan.packagePriceYearly ?? "0"),
    pricePerUserMonthly: plan.pricePerUserMonthly?.toString?.() ?? String(plan.pricePerUserMonthly ?? "0"),
    pricePerUserYearly: plan.pricePerUserYearly?.toString?.() ?? String(plan.pricePerUserYearly ?? "0"),
    pricePerStorageMonthly: plan.pricePerStorageMonthly?.toString?.() ?? String(plan.pricePerStorageMonthly ?? "0"),
    pricePerStorageYearly: plan.pricePerStorageYearly?.toString?.() ?? String(plan.pricePerStorageYearly ?? "0"),
    trial: plan.trial,
    trialDays: plan.trialDays,
    createdAt: plan.createdAt?.toISOString?.() ?? null,
  };

  return NextResponse.json({
    ok: true,
    plan: planPayload,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "edit-plans")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const planId = BigInt(id);
  const body = (await req.json().catch(() => null)) as any;

  const data: any = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.description === "string") data.description = body.description.trim() || null;
  if (body?.number_of_users != null) data.numberOfUsers = asUsersCount(body.number_of_users);
  if (body?.storage_limit_mb != null) {
    const mb = Math.max(0, Math.floor(asNumber(body.storage_limit_mb, 0)));
    data.storageLimit = mb * 1024 * 1024;
  }
  if (body?.status != null) data.status = Boolean(body.status);
  if (body?.free_plan != null) data.freePlan = Boolean(body.free_plan);
  if (body?.trial != null) data.trial = Boolean(body.trial);
  if (body?.trial_days != null) data.trialDays = Math.max(0, Math.floor(asNumber(body.trial_days, 0)));
  if (Array.isArray(body?.modules)) data.modules = body.modules.filter((x: any) => typeof x === "string");
  if (body?.package_price_monthly != null) data.packagePriceMonthly = new Prisma.Decimal(asNumber(body.package_price_monthly, 0));
  if (body?.package_price_yearly != null) data.packagePriceYearly = new Prisma.Decimal(asNumber(body.package_price_yearly, 0));
  if (body?.price_per_user_monthly != null) data.pricePerUserMonthly = new Prisma.Decimal(asNumber(body.price_per_user_monthly, 0));
  if (body?.price_per_user_yearly != null) data.pricePerUserYearly = new Prisma.Decimal(asNumber(body.price_per_user_yearly, 0));
  if (body?.price_per_storage_monthly != null) data.pricePerStorageMonthly = new Prisma.Decimal(asNumber(body.price_per_storage_monthly, 0));
  if (body?.price_per_storage_yearly != null) data.pricePerStorageYearly = new Prisma.Decimal(asNumber(body.price_per_storage_yearly, 0));
  data.updatedAt = new Date();

  await prisma.plan.update({ where: { id: planId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "delete-plans")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const planId = BigInt(id);
  await prisma.plan.delete({ where: { id: planId } });
  return NextResponse.json({ ok: true });
}

