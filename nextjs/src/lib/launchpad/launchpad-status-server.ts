import "server-only";

import { prisma } from "@/lib/prisma";
import { isAddOnEnabledForScope } from "@/lib/addon-scope";
import { hasPermission } from "@/lib/authz";
import { loadEmailSettingsOtpStatus } from "@/lib/email-settings-otp-service";
import { companyHasOwnBrandLogos, getEffectiveMailSettings, getSettingsForOwner } from "@/lib/settings-service";
import { applyCompanyProfileFieldsToSettings, loadCompanyProfileUser } from "@/lib/company-profile-settings";
import { loadStorefrontSetupOverviewFromSession } from "@/lib/storefront/setup-overview-server";
import { LAUNCHPAD_QUICK_START_CHIP_LABELS, LAUNCHPAD_STEP_DEFS } from "@/lib/launchpad/launchpad-definitions";
import { buildLaunchpadGroups, resolveLaunchpadPlacement } from "@/lib/launchpad/launchpad-layout";
import type {
  LaunchpadActivityItem,
  LaunchpadOverviewPayload,
  LaunchpadPlanInfo,
  LaunchpadStepSnapshot,
} from "@/lib/launchpad/launchpad-types";

function canSeeStep(
  perms: string[],
  def: (typeof LAUNCHPAD_STEP_DEFS)[number],
  activatedPackages: string[],
): boolean {
  if (perms.includes("*")) return true;
  if (def.addonScope && !isAddOnEnabledForScope(activatedPackages, def.addonScope)) return false;
  if (!def.permissions?.length) return true;
  return def.permissions.some((p) => hasPermission(perms, p));
}

async function computeStepCompletion(
  organizationId: bigint,
  userId: bigint,
  userEmail: string,
  userEmailVerified: boolean,
): Promise<Record<string, boolean>> {
  const settings = await getSettingsForOwner(organizationId);
  const companyUser = await loadCompanyProfileUser(organizationId);
  const companyProfile: Record<string, string> = { ...settings };
  applyCompanyProfileFieldsToSettings(companyProfile, settings, companyUser);
  const mail = await getEffectiveMailSettings(organizationId);
  const otpStatus = await loadEmailSettingsOtpStatus(organizationId);
  const normalizedUserEmail = userEmail.trim().toLowerCase();
  const emailOtpVerified = Boolean(
    normalizedUserEmail &&
      otpStatus.emailVerifiedAt?.trim() &&
      otpStatus.email.trim().toLowerCase() === normalizedUserEmail,
  );

  const [
    staffCount,
    templateCount,
    coaCount,
    customerCount,
    projectCount,
    leadCount,
    employeeCount,
    courseCount,
    emCategoryCount,
    stTicketCount,
    websiteCount,
    productCount,
    jobCount,
    formCount,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [{ createdBy: organizationId }, { creatorId: organizationId }],
        NOT: { id: organizationId },
      },
    }),
    prisma.notification.count().catch(() => 1),
    prisma.chartOfAccount.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.customer.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.project.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.crmLead.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.hrmEmployee.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.course.count({ where: { organizationId } }).catch(() => 0),
    prisma.emExpenseCategory.count({ where: { organizationId } }).catch(() => 0),
    prisma.stTicket.count({ where: { organizationId } }).catch(() => 0),
    prisma.website.count({ where: { organizationId } }).catch(() => 0),
    prisma.posProduct.count({ where: { organizationId } }).catch(() => 0),
    prisma.recJobPosting.count({ where: { createdBy: organizationId } }).catch(() => 0),
    prisma.form.count({ where: { createdBy: organizationId } }).catch(() => 0),
  ]);

  let storefrontReady = false;
  try {
    const sf = await loadStorefrontSetupOverviewFromSession(undefined, {
      get: () => ({ value: String(userId) }),
    });
    if (sf.kind === "ready") {
      storefrontReady = sf.overview.percent >= 40 || sf.overview.completedCount >= 3;
    }
  } catch {
    storefrontReady = websiteCount > 0;
  }

  const brandOk = companyHasOwnBrandLogos(settings);
  const companyOk = Boolean((companyProfile.company_name ?? "").trim());
  const emailOk =
    Boolean((mail.email_host ?? "").trim()) &&
    Boolean((mail.email_fromAddress ?? "").trim() || (mail.email_username ?? "").trim());
  const paymentOk =
    Boolean((settings.stripe_publishable_key ?? "").trim()) ||
    Boolean((settings.paypal_client_id ?? "").trim()) ||
    Boolean((settings.bank_details ?? "").trim());

  return {
    verify_email: userEmailVerified || emailOtpVerified,
    brand_settings: brandOk,
    company_profile: companyOk,
    email_delivery: emailOk,
    invite_team: staffCount >= 1,
    notification_templates: templateCount > 0, // system templates exist once seeded
    payment_setup: paymentOk,
    accounting_setup: coaCount > 0 || customerCount > 0,
    project_first: projectCount > 0,
    crm_first_lead: leadCount > 0,
    hrm_first_employee: employeeCount > 0,
    lms_first_course: courseCount > 0,
    expense_setup: emCategoryCount > 0,
    support_setup: stTicketCount > 0,
    storefront_launch: storefrontReady || websiteCount > 0,
    pos_catalog: productCount > 0,
    recruitment_jobs: jobCount > 0,
    appointment_setup: Boolean((settings.appointment_hours ?? "").trim()),
    whatsapp_setup: Boolean((settings.whatsapp_api_token ?? "").trim() || (settings.whatsapp_phone_number_id ?? "").trim()),
    form_builder_form: formCount > 0,
    expense_workspace: emCategoryCount > 0,
    affiliate_partners: false,
    review_setup: false,
    go_live: false,
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadRecentActivity(organizationId: bigint): Promise<LaunchpadActivityItem[]> {
  const items: LaunchpadActivityItem[] = [];

  const [recentStaff, recentProject, recentLead, companyUser] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ createdBy: organizationId }, { creatorId: organizationId }], NOT: { id: organizationId } },
      orderBy: { createdAt: "desc" },
      select: { name: true, createdAt: true },
    }),
    prisma.project.findFirst({
      where: { createdBy: organizationId },
      orderBy: { createdAt: "desc" },
      select: { name: true, createdAt: true },
    }).catch(() => null),
    prisma.crmLead.findFirst({
      where: { createdBy: organizationId },
      orderBy: { createdAt: "desc" },
      select: { name: true, createdAt: true },
    }).catch(() => null),
    prisma.user.findFirst({
      where: { id: organizationId },
      select: { updatedAt: true, name: true },
    }),
  ]);

  if (companyUser?.updatedAt) {
    items.push({
      id: "company-updated",
      message: "Company profile updated",
      timeLabel: formatRelativeTime(companyUser.updatedAt),
    });
  }
  if (recentStaff?.createdAt) {
    items.push({
      id: "staff-invite",
      message: recentStaff.name ? `${recentStaff.name} joined the team` : "Team member invited",
      timeLabel: formatRelativeTime(recentStaff.createdAt),
    });
  }
  if (recentProject?.createdAt) {
    items.push({
      id: "project-created",
      message: `Project "${recentProject.name ?? "Untitled"}" created`,
      timeLabel: formatRelativeTime(recentProject.createdAt),
    });
  }
  if (recentLead?.createdAt) {
    items.push({
      id: "lead-created",
      message: `Lead "${recentLead.name ?? "Untitled"}" added`,
      timeLabel: formatRelativeTime(recentLead.createdAt),
    });
  }

  return items.slice(0, 5);
}

async function loadPlanInfo(
  organizationId: bigint,
  activatedPackages: string[],
): Promise<LaunchpadPlanInfo | null> {
  const company = await prisma.user.findFirst({
    where: { id: organizationId },
    select: { activePlan: true, planExpireDate: true },
  });
  if (!company?.activePlan) return null;

  const plan = await prisma.plan.findFirst({
    where: { id: BigInt(company.activePlan) },
    select: { name: true, numberOfUsers: true, modules: true, trial: true, trialDays: true },
  });
  if (!plan?.name) return null;

  const features: string[] = [];
  if (plan.numberOfUsers > 0) {
    features.push(`Up to ${plan.numberOfUsers} staff`);
  }
  const modules = Array.isArray(plan.modules) ? (plan.modules as unknown[]).map(String) : [];
  if (modules.length > 0) {
    features.push(`${modules.length} modules included`);
  } else if (activatedPackages.length > 0) {
    features.push(`${activatedPackages.length} activated modules`);
  }
  features.push("Priority support");

  const expire = company.planExpireDate;
  const isActive = !expire || expire >= new Date();

  return {
    name: plan.name,
    status: plan.trial && isActive ? "trial" : isActive ? "active" : "none",
    features: features.slice(0, 4),
  };
}

function formatGoLiveTarget(planExpireDate: Date | null | undefined, trialDays: number): string | null {
  if (planExpireDate) {
    return planExpireDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  if (trialDays > 0) {
    const target = new Date();
    target.setDate(target.getDate() + trialDays);
    return target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  return null;
}

export async function computeLaunchpadOverview(input: {
  organizationId: bigint;
  userId: bigint;
  permissions: string[];
  activatedPackages: string[];
  userEmail: string;
  emailVerified: boolean;
}): Promise<LaunchpadOverviewPayload> {
  const completion = await computeStepCompletion(
    input.organizationId,
    input.userId,
    input.userEmail,
    input.emailVerified,
  );

  const companyRow = await prisma.user.findFirst({
    where: { id: input.organizationId },
    select: { name: true, activePlan: true, planExpireDate: true },
  });
  const planRow = companyRow?.activePlan
    ? await prisma.plan.findFirst({
        where: { id: BigInt(companyRow.activePlan) },
        select: { trialDays: true },
      })
    : null;

  const steps: LaunchpadStepSnapshot[] = LAUNCHPAD_STEP_DEFS.map((def) => {
    const visible = canSeeStep(input.permissions, def, input.activatedPackages);
    const placement = resolveLaunchpadPlacement({
      section: def.section,
      id: def.id,
      addonScope: def.addonScope,
    });
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      href: def.href,
      completed: Boolean(completion[def.id]),
      section: def.section,
      moduleLabel: def.moduleLabel,
      addonScope: def.addonScope,
      groupId: placement.groupId,
      subsectionId: placement.subsectionId,
      required: def.required,
      visible,
    };
  }).filter((s) => s.visible);

  const coreStepsBeforeGoLive = steps.filter((s) => s.section === "core" && !["review_setup", "go_live"].includes(s.id));
  const coreReady = coreStepsBeforeGoLive.every((s) => !s.required || s.completed);
  const allReady = steps.filter((s) => s.id !== "go_live").every((s) => s.completed);

  for (const step of steps) {
    if (step.id === "review_setup") step.completed = coreReady;
    if (step.id === "go_live") step.completed = allReady;
  }

  const groups = buildLaunchpadGroups(steps);

  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const coreSteps = steps.filter((s) => s.section === "core");
  const coreCompleted = coreSteps.filter((s) => s.completed).length;
  const coreTotal = coreSteps.length;

  const nextStep =
    steps.find((s) => !s.completed && s.required) ?? steps.find((s) => !s.completed) ?? null;

  const [recentActivity, plan] = await Promise.all([
    loadRecentActivity(input.organizationId),
    loadPlanInfo(input.organizationId, input.activatedPackages),
  ]);

  return {
    steps,
    groups,
    completedCount,
    total,
    percent,
    coreCompleted,
    coreTotal,
    nextStep,
    quickStartChips: [...LAUNCHPAD_QUICK_START_CHIP_LABELS],
    isCompanyAdmin: true,
    companyName: companyRow?.name?.trim() || "Your company",
    goLiveTarget: formatGoLiveTarget(companyRow?.planExpireDate ?? null, planRow?.trialDays ?? 30),
    plan,
    recentActivity,
  };
}
