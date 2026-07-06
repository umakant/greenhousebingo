import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import SubscriptionSetting from "@/components/plans/subscription-setting";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


async function getSubscriptionInfo(email: string): Promise<UserSubscriptionInfo | null> {
  try {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) return null;
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!user?.id) return null;
    const userId = user.id;
    const rows = await prisma.$queryRawUnsafe<{ active_plan: number | null; plan_expire_date: Date | null }[]>(
      "SELECT active_plan, plan_expire_date FROM users WHERE id = $1 LIMIT 1",
      userId
    ).catch(() => null);
    const row = rows?.[0];
    if (!row?.active_plan || !row?.plan_expire_date) return null;
    const plan = await prisma.plan.findFirst({
      where: { id: BigInt(row.active_plan) },
      select: { id: true, name: true },
    });
    if (!plan) return null;
    const expireDate =
      row.plan_expire_date instanceof Date
        ? row.plan_expire_date.toISOString().slice(0, 10)
        : String(row.plan_expire_date).slice(0, 10);
    return {
      activePlanId: String(plan.id),
      activePlanName: plan.name ?? null,
      planExpireDate: expireDate,
      trialExpireDate: null,
      isTrialDone: false,
    };
  } catch {
    return null;
  }
}

export default async function PlansPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  if (!hasPermission(permissions, "manage-plans") && !hasPermission(permissions, "view-plans")) redirect("/dashboard");

  const userSubscriptionInfo = await getSubscriptionInfo(email);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Subscription Setting") },
      ]}
      pageTitle={t("Subscription Setting")}
      pageActions={
        hasPermission(permissions, "create-plans") && role === "superadmin" ? (
          <Button
            asChild
            size="icon"
            aria-label={t("Create")}
            className="bg-[#4C88FF] hover:bg-[#3B7BFF] text-white shadow-sm"
          >
            <Link href="/plans/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        ) : null
      }
    >
      <SubscriptionSetting
        role={role}
        canCreate={hasPermission(permissions, "create-plans")}
        canEdit={hasPermission(permissions, "edit-plans")}
        canDelete={hasPermission(permissions, "delete-plans")}
        userSubscriptionInfo={userSubscriptionInfo}
      />
    </AuthenticatedLayout>
  );
}

