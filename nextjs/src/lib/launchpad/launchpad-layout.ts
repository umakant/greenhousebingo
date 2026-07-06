import type { LaunchpadGroupSnapshot, LaunchpadStepSnapshot } from "@/lib/launchpad/launchpad-types";

/** Numbered launchpad sections (matches onboarding command-center layout). */
export const LAUNCHPAD_GROUP_META: Record<
  string,
  { title: string; description: string; optional?: boolean; order: number }
> = {
  "company-setup": {
    title: "Company Setup",
    description: "Verify your account, branding, and company profile.",
    order: 1,
  },
  "team-hr": {
    title: "Team & HR",
    description: "Invite staff and configure communication templates.",
    order: 2,
  },
  operations: {
    title: "Operations",
    description: "First steps for each activated module in your plan.",
    order: 3,
  },
  billing: {
    title: "Billing & Payments",
    description: "Connect payment methods for subscriptions and billing.",
    order: 4,
  },
  "go-live": {
    title: "Go Live Readiness",
    description: "Final review before your team starts working.",
    order: 5,
  },
};

export const LAUNCHPAD_SUBSECTION_META: Record<
  string,
  { title: string; description?: string; order: number }
> = {
  identity: {
    title: "Account & branding",
    order: 1,
  },
  team: {
    title: "Team & communication",
    order: 1,
  },
  billing: {
    title: "Payments",
    order: 1,
  },
  readiness: {
    title: "Readiness",
    order: 1,
  },
};

/** Per add-on scope labels for module subsections. */
export const LAUNCHPAD_MODULE_META: Record<string, { title: string; description: string }> = {
  account: {
    title: "Accounting",
    description: "Chart of accounts, customers, and financial records.",
  },
  project: {
    title: "Projects",
    description: "Track delivery, tasks, and time on client work.",
  },
  crm: {
    title: "CRM",
    description: "Leads, pipeline, and sales follow-up.",
  },
  hrm: {
    title: "HRM",
    description: "Employees, payroll, and HR operations.",
  },
  lms: {
    title: "LMS",
    description: "Courses, learners, and training delivery.",
  },
  expensemanagement: {
    title: "Expense management",
    description: "Matter workspace, categories, and expense lines.",
  },
  affiliatebusiness: {
    title: "Affiliate business",
    description: "Partners, programs, commissions, and payouts.",
  },
  supportticket: {
    title: "Support",
    description: "Help desk, categories, and customer portal.",
  },
  storefront: {
    title: "Storefront",
    description: "Websites, themes, and online sales.",
  },
  pos: {
    title: "POS",
    description: "Products, register, and point-of-sale.",
  },
  recruitment: {
    title: "Recruitment",
    description: "Job postings and applicant tracking.",
  },
  appointment: {
    title: "Appointment",
    description: "Booking hours and scheduling.",
  },
  whatsappchat: {
    title: "WhatsApp",
    description: "Messaging API and chat settings.",
  },
  assets: {
    title: "Assets",
    description: "Company asset register and assignments.",
  },
  formbuilder: {
    title: "Form builder",
    description: "Custom forms and data collection.",
  },
};

export function resolveLaunchpadPlacement(step: {
  section: "core" | "module";
  id: string;
  addonScope?: string;
}): { groupId: string; subsectionId: string } {
  if (step.id === "payment_setup") {
    return { groupId: "billing", subsectionId: "billing" };
  }
  if (step.id === "review_setup" || step.id === "go_live") {
    return { groupId: "go-live", subsectionId: "readiness" };
  }

  if (step.section === "core") {
    if (["verify_email", "brand_settings", "company_profile", "email_delivery"].includes(step.id)) {
      return { groupId: "company-setup", subsectionId: "identity" };
    }
    if (["invite_team", "notification_templates"].includes(step.id)) {
      return { groupId: "team-hr", subsectionId: "team" };
    }
    return { groupId: "company-setup", subsectionId: "identity" };
  }

  const scope = step.addonScope ?? "other";
  return { groupId: "operations", subsectionId: `module:${scope}` };
}

function subsectionTitle(subsectionId: string): string {
  if (subsectionId.startsWith("module:")) {
    const scope = subsectionId.slice(7);
    return LAUNCHPAD_MODULE_META[scope]?.title ?? scope;
  }
  return LAUNCHPAD_SUBSECTION_META[subsectionId]?.title ?? subsectionId;
}

function subsectionDescription(subsectionId: string): string | undefined {
  if (subsectionId.startsWith("module:")) {
    const scope = subsectionId.slice(7);
    return LAUNCHPAD_MODULE_META[scope]?.description;
  }
  return LAUNCHPAD_SUBSECTION_META[subsectionId]?.description;
}

function subsectionSortOrder(subsectionId: string): number {
  if (subsectionId.startsWith("module:")) {
    return 100;
  }
  return LAUNCHPAD_SUBSECTION_META[subsectionId]?.order ?? 500;
}

function countCompleted(steps: LaunchpadStepSnapshot[]) {
  const total = steps.length;
  const completedCount = steps.filter((s) => s.completed).length;
  return { total, completedCount };
}

export function buildLaunchpadGroups(steps: LaunchpadStepSnapshot[]): LaunchpadGroupSnapshot[] {
  const byGroup = new Map<string, Map<string, LaunchpadStepSnapshot[]>>();

  for (const step of steps) {
    const { groupId, subsectionId } = step;
    if (!byGroup.has(groupId)) byGroup.set(groupId, new Map());
    const subMap = byGroup.get(groupId)!;
    const list = subMap.get(subsectionId) ?? [];
    list.push(step);
    subMap.set(subsectionId, list);
  }

  const groups: LaunchpadGroupSnapshot[] = [];

  for (const [groupId, meta] of Object.entries(LAUNCHPAD_GROUP_META).sort((a, b) => a[1].order - b[1].order)) {
    const subMap = byGroup.get(groupId);
    if (!subMap?.size) continue;

    const subsections = [...subMap.entries()]
      .map(([subsectionId, subsectionSteps]) => {
        const title = subsectionTitle(subsectionId);
        return {
          id: subsectionId,
          title,
          description: subsectionDescription(subsectionId),
          ...countCompleted(subsectionSteps),
          steps: subsectionSteps,
          _sort: subsectionSortOrder(subsectionId),
        };
      })
      .sort((a, b) => a._sort - b._sort || a.title.localeCompare(b.title))
      .map(({ _sort: _, ...rest }) => rest);

    const allSteps = subsections.flatMap((s) => s.steps);
    groups.push({
      id: groupId,
      title: meta.title,
      description: meta.description,
      optional: meta.optional ?? false,
      ...countCompleted(allSteps),
      subsections,
    });
  }

  return groups;
}

/** Flatten all steps in a group (subsection order preserved). */
export function flattenGroupSteps(group: LaunchpadGroupSnapshot): LaunchpadStepSnapshot[] {
  return group.subsections.flatMap((s) => s.steps);
}
