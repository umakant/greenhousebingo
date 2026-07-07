import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CompanyEditDrawerPageActions,
  CompanyEditDrawerProvider,
} from "@/components/companies/company-edit-drawer";
import CompanyViewShell from "@/components/companies/company-view-shell";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { hasPermission } from "@/lib/authz";
import type { CompanyPlanDetailsPayload } from "@/components/companies/company-billing-plan-panel";
import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import { getCompany } from "@/lib/greenhouse-bingo/mock";
import { readEventPlatformOrgEnabled } from "@/lib/event-platform/event-platform-organization";
import { readLmsOrgEnabled } from "@/lib/lms-organization";
import { readMarketplaceOrgEnabled } from "@/lib/marketplace-organization";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";

const COMPANY_SETTING_KEYS = [
  "companyWebsite",
  "companyPhone",
  "companyAddress",
  "companyAddress2",
  "companyCity",
  "companyState",
  "companyZipCode",
  "defaultCurrency",
  "businessModuleId",
  "logo_light",
  "logo_dark",
  "logo_icon",
  "favicon",
  "companyGstVat",
  "defaultLanguage",
] as const;

export default async function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (getCompany(id)) {
    redirect(`/partners/${id}`);
  }

  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const companyId = BigInt(id);

  const company = await prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      mobileNo: true,
      lang: true,
      isEnableLogin: true,
      avatar: true,
      activePlan: true,
      planExpireDate: true,
      createdAt: true,
    },
  });

  if (!company) {
    redirect("/companies");
  }

  const settingsRows = await prisma.setting.findMany({
    where: { createdBy: company.id, key: { in: [...COMPANY_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const settings: Record<string, string> = {};
  for (const s of settingsRows) settings[s.key] = s.value ?? "";

  const moduleIdRaw = settings.businessModuleId;
  const businessModule =
    moduleIdRaw && /^\d+$/.test(moduleIdRaw)
      ? await prisma.businessModule.findFirst({ where: { id: BigInt(moduleIdRaw) }, select: { id: true, name: true } })
      : null;

  const employeeCount = await prisma.user.count({
    where: { createdBy: company.id, type: { notIn: ["company", "company_admin", "superadmin"] } },
  });

  let totalProjects = 0;
  let totalEarnings = 0;
  let dueInvoices = 0;
  try {
    totalProjects = await prisma.project.count({
      where: { createdBy: company.id },
    });
  } catch {
    totalProjects = 0;
  }

  try {
    const revenueAgg = await prisma.revenue.aggregate({
      where: { createdBy: company.id },
      _sum: { amount: true },
    });
    totalEarnings = Number(revenueAgg._sum.amount ?? 0);
    dueInvoices = await prisma.revenue.count({
      where: {
        createdBy: company.id,
        status: { in: ["pending", "unpaid", "processing", "due", "overdue"] },
      },
    });
  } catch {
    totalEarnings = 0;
    dueInvoices = 0;
  }

  const idStr = company.id.toString();

  const canImpersonate =
    permissions.includes("*") || hasPermission(permissions, "impersonate-users");

  let companySubscriptionInfo: UserSubscriptionInfo | null = null;
  let companyPlanDetails: CompanyPlanDetailsPayload = null;
  if (company.activePlan != null) {
    const planRow = await prisma.plan.findFirst({
      where: { id: BigInt(company.activePlan) },
      select: {
        id: true,
        name: true,
        description: true,
        freePlan: true,
        packagePriceMonthly: true,
        packagePriceYearly: true,
        trialDays: true,
        numberOfUsers: true,
      },
    });
    if (planRow) {
      const ped = company.planExpireDate;
      const expireStr =
        ped instanceof Date
          ? ped.toISOString().slice(0, 10)
          : ped
            ? String(ped).slice(0, 10)
            : null;
      companySubscriptionInfo = {
        activePlanId: String(planRow.id),
        activePlanName: planRow.name,
        planStartDate: company.createdAt.toISOString().slice(0, 10),
        planExpireDate: expireStr,
        trialExpireDate: null,
        isTrialDone: true,
      };
      companyPlanDetails = {
        id: String(planRow.id),
        name: planRow.name,
        description: planRow.description,
        freePlan: planRow.freePlan,
        packagePriceMonthly: planRow.packagePriceMonthly?.toString?.() ?? String(planRow.packagePriceMonthly ?? "0"),
        packagePriceYearly: planRow.packagePriceYearly?.toString?.() ?? String(planRow.packagePriceYearly ?? "0"),
        trialDays: planRow.trialDays ?? 0,
        numberOfUsers: planRow.numberOfUsers ?? 0,
      };
    }
  }

  const canEditPlans = hasPermission(permissions, "edit-plans");
  const canDeletePlans = hasPermission(permissions, "delete-plans");

  const lmsOrgEnabled = await readLmsOrgEnabled(companyId);
  const eventPlatformOrgEnabled = await readEventPlatformOrgEnabled(companyId);
  const marketplaceOrgEnabled = await readMarketplaceOrgEnabled(companyId);

  return (
    <CompanyEditDrawerProvider companyId={idStr} canImpersonate={canImpersonate}>
      <AuthenticatedLayout
        user={{ name, email, roles, permissions, activatedPackages }}
        breadcrumbs={[
          { label: t("Companies"), url: "/companies" },
          { label: company.name ?? t("Company") },
        ]}
        pageTitle={company.name ?? t("Company")}
        pageActions={<CompanyEditDrawerPageActions />}
      >
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t("Loading...")}</div>}>
          <CompanyViewShell
            companyId={idStr}
            companyName={company.name ?? ""}
            email={company.email}
            mobileNo={company.mobileNo}
            slug={company.slug}
            lang={company.lang}
            loginEnabled={company.isEnableLogin !== false}
            businessModuleName={businessModule?.name ?? null}
            settings={settings}
            totalProjects={totalProjects}
            employeeCount={employeeCount}
            totalEarnings={totalEarnings}
            dueInvoices={dueInvoices}
            companySubscriptionInfo={companySubscriptionInfo}
            canEditPlans={canEditPlans}
            canDeletePlans={canDeletePlans}
            companyPlanDetails={companyPlanDetails}
            lmsOrgEnabled={lmsOrgEnabled}
            eventPlatformOrgEnabled={eventPlatformOrgEnabled}
            marketplaceOrgEnabled={marketplaceOrgEnabled}
            avatar={company.avatar}
          />
        </Suspense>
      </AuthenticatedLayout>
    </CompanyEditDrawerProvider>
  );
}

