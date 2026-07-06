import { NextResponse, type NextRequest } from "next/server";

import { hasPermission, isSuperAdminSession } from "@/lib/authz";
import { canAccessCompanyBillingApis } from "@/lib/company-billing-route-auth";
import { applySessionAuthCookies } from "@/lib/session-auth-cookies";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getUserByEmail, settingsOwnerIdForUser } from "@/lib/settings-service";
import { canSubscribeToPlans, roleFromRequest } from "@/lib/subscription-catalog-auth";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function canManageCompanySubscription(req: NextRequest, targetCompanyId: bigint): Promise<boolean> {
  const perms = await getPermissionsFromRequest(req);

  if (isSuperAdminSession(req)) {
    return (
      hasPermission(perms, "edit-users") ||
      hasPermission(perms, "manage-users") ||
      hasPermission(perms, "manage-plans")
    );
  }

  const role = roleFromRequest(req);
  if (!canSubscribeToPlans(role, perms)) return false;
  return canAccessCompanyBillingApis(req, targetCompanyId);
}

/**
 * PATCH /api/companies/[id]/subscription
 * Assign, change, or clear the subscription plan for a company tenant.
 * Superadmin (company detail) or the tenant itself (Settings → Subscription Plans).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const companyId = BigInt(id);

    if (!(await canManageCompanySubscription(req, companyId))) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, message: "Invalid request body" }, { status: 400 });
    }

    const existingCompany = await prisma.user.findFirst({
      where: { id: companyId, type: { in: ["company", "company_admin"] } },
      select: { id: true },
    });
    if (!existingCompany) {
      return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });
    }

    const clearSubscription = Boolean(body.clear_subscription);
    if (clearSubscription) {
      await prisma.user.update({
        where: { id: companyId },
        data: { activePlan: null, planExpireDate: null },
      });
      const res = NextResponse.json({ ok: true });
      await maybeRefreshSessionAuthCookies(req, res, companyId);
      return res;
    }

    const activePlanRaw = String(body.active_plan_id ?? "").trim();
    if (!activePlanRaw) {
      return NextResponse.json({ ok: false, message: "Plan id is required." }, { status: 400 });
    }

    const pricingPeriodRaw = String(body.pricing_period ?? "monthly").trim().toLowerCase();
    const pricingPeriod = pricingPeriodRaw === "yearly" ? "yearly" : "monthly";

    const planIdBig = BigInt(activePlanRaw);
    const selectedPlan = await prisma.plan.findFirst({
      where: { id: planIdBig, status: true },
      select: { id: true },
    });
    if (!selectedPlan) {
      return NextResponse.json({ ok: false, message: "Invalid or inactive subscription plan." }, { status: 400 });
    }

    const n = Number(selectedPlan.id);
    if (!Number.isSafeInteger(n)) {
      return NextResponse.json({ ok: false, message: "Plan id is out of supported range." }, { status: 400 });
    }

    const expire = new Date();
    if (pricingPeriod === "yearly") expire.setFullYear(expire.getFullYear() + 1);
    else expire.setMonth(expire.getMonth() + 1);

    await prisma.user.update({
      where: { id: companyId },
      data: {
        activePlan: n,
        planExpireDate: expire,
      },
    });

    const res = NextResponse.json({ ok: true });
    await maybeRefreshSessionAuthCookies(req, res, companyId);
    return res;
  } catch (err) {
    console.error("[companies subscription PATCH]", err);
    return NextResponse.json({ ok: false, message: "Failed to update subscription." }, { status: 500 });
  }
}

/** Refresh sidebar cookies when the logged-in user belongs to this tenant. */
async function maybeRefreshSessionAuthCookies(
  req: NextRequest,
  res: NextResponse,
  companyId: bigint,
): Promise<void> {
  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return;
  const actor = await getUserByEmail(email);
  if (!actor) return;
  if (settingsOwnerIdForUser(actor) !== companyId) return;
  await applySessionAuthCookies(res, actor.id);
}
