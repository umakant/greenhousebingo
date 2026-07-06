import "server-only";

import { prisma } from "@/lib/prisma";
import { isAddOnEnabledForScope } from "@/lib/addon-scope";
import { hasPermission } from "@/lib/authz";
import {
  buildCommandCenterQuickActions,
  buildCommandCenterShortcuts,
} from "@/lib/launchpad/command-center-links";
import type {
  CommandCenterActivity,
  CommandCenterApproval,
  CommandCenterCalendarEvent,
  CommandCenterCompliance,
  CommandCenterHealthScore,
  CommandCenterNotification,
  CommandCenterPayload,
  CommandCenterScheduleItem,
  CommandCenterSnapshot,
  CommandCenterTask,
} from "@/lib/launchpad/command-center-types";

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(0)}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function canModule(permissions: string[], packages: string[], scope: string, perms: string[]): boolean {
  if (permissions.includes("*")) return true;
  if (!isAddOnEnabledForScope(packages, scope)) return false;
  return perms.some((p) => hasPermission(permissions, p));
}

async function loadRecentActivity(organizationId: bigint): Promise<CommandCenterActivity[]> {
  const items: CommandCenterActivity[] = [];

  const [recentStaff, recentProject, recentLead, recentAttendance, companyUser] = await Promise.all([
    prisma.user
      .findFirst({
        where: { OR: [{ createdBy: organizationId }, { creatorId: organizationId }], NOT: { id: organizationId } },
        orderBy: { createdAt: "desc" },
        select: { name: true, createdAt: true },
      })
      .catch(() => null),
    prisma.project
      .findFirst({
        where: { createdBy: organizationId },
        orderBy: { createdAt: "desc" },
        select: { name: true, createdAt: true },
      })
      .catch(() => null),
    prisma.crmLead
      .findFirst({
        where: { createdBy: organizationId },
        orderBy: { createdAt: "desc" },
        select: { name: true, createdAt: true },
      })
      .catch(() => null),
    prisma.hrmAttendance
      .findFirst({
        where: { employee: { createdBy: organizationId }, status: "present" },
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true } } },
      })
      .catch(() => null),
    prisma.user.findFirst({
      where: { id: organizationId },
      select: { updatedAt: true },
    }),
  ]);

  if (recentAttendance?.createdAt) {
    const name = [recentAttendance.employee?.firstName, recentAttendance.employee?.lastName].filter(Boolean).join(" ");
    items.push({
      id: "attendance",
      message: name ? `${name} clocked in` : "Employee clocked in",
      timeLabel: formatRelativeTime(recentAttendance.createdAt),
      icon: "clock",
    });
  }
  if (recentLead?.createdAt) {
    items.push({
      id: "lead",
      message: `New lead "${recentLead.name ?? "Untitled"}" added`,
      timeLabel: formatRelativeTime(recentLead.createdAt),
      icon: "contact",
    });
  }
  if (recentProject?.createdAt) {
    items.push({
      id: "project",
      message: `Project "${recentProject.name ?? "Untitled"}" created`,
      timeLabel: formatRelativeTime(recentProject.createdAt),
      icon: "folder-kanban",
    });
  }
  if (recentStaff?.createdAt) {
    items.push({
      id: "staff",
      message: recentStaff.name ? `${recentStaff.name} joined the team` : "Team member invited",
      timeLabel: formatRelativeTime(recentStaff.createdAt),
      icon: "user-plus",
    });
  }
  if (companyUser?.updatedAt) {
    items.push({
      id: "company",
      message: "Company profile updated",
      timeLabel: formatRelativeTime(companyUser.updatedAt),
      icon: "building-2",
    });
  }

  return items.slice(0, 6);
}

function taskDueMeta(due: Date | null, today: Date): { label: string; variant: CommandCenterTask["dueVariant"] } {
  if (!due) return { label: "Open", variant: "normal" };
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay.getTime() <= todayStart.getTime()) {
    return { label: "Due Today", variant: "today" };
  }
  if (dueDay.getTime() >= tomorrowStart.getTime() && dueDay.getTime() <= tomorrowEnd.getTime()) {
    return { label: "Due Tomorrow", variant: "tomorrow" };
  }
  const isSoon = due.getTime() - today.getTime() < 7 * 86400000;
  return {
    label: `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    variant: isSoon ? "soon" : "normal",
  };
}

async function loadTasks(
  organizationId: bigint,
  permissions: string[],
  packages: string[],
): Promise<CommandCenterTask[]> {
  const tasks: CommandCenterTask[] = [];
  const today = new Date();

  if (canModule(permissions, packages, "hrm", ["manage-leave-applications", "manage-hrm"])) {
    const leaves = await prisma.hrmLeaveApplication
      .findMany({
        where: { status: "pending", employee: { createdBy: organizationId } },
        orderBy: { startDate: "asc" },
        take: 3,
        include: { employee: { select: { firstName: true, lastName: true } } },
      })
      .catch(() => []);

    for (const row of leaves) {
      const name = [row.employee?.firstName, row.employee?.lastName].filter(Boolean).join(" ");
      const due = row.startDate ? new Date(row.startDate) : null;
      const dueMeta = taskDueMeta(due, today);
      tasks.push({
        id: `leave-${row.id}`,
        label: name ? `Review leave request — ${name}` : "Review leave request",
        dueLabel: dueMeta.label,
        dueVariant: dueMeta.variant,
        href: "/hrm/leave-applications",
      });
    }
  }

  if (canModule(permissions, packages, "compliance", ["manage-compliance-dashboard", "manage-compliance-tasks"])) {
    const complianceTasks = await prisma.complianceTask
      .findMany({
        where: { organizationId, status: { in: ["open", "in_progress"] } },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        take: 4,
        select: { id: true, title: true, dueDate: true },
      })
      .catch(() => []);

    for (const row of complianceTasks) {
      const due = row.dueDate ? new Date(row.dueDate) : null;
      const dueMeta = taskDueMeta(due, today);
      tasks.push({
        id: `compliance-${row.id}`,
        label: row.title,
        dueLabel: dueMeta.label,
        dueVariant: dueMeta.variant,
        href: `/compliance/tasks?id=${row.id}`,
      });
    }
  }

  if (canModule(permissions, packages, "supportticket", ["manage-tickets"])) {
    const tickets = await prisma.stTicket
      .findMany({
        where: {
          OR: [{ organizationId }, { createdBy: organizationId }],
          status: { in: ["open", "pending"] },
        },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { id: true, subject: true },
      })
      .catch(() => []);

    for (const row of tickets) {
      tasks.push({
        id: `ticket-${row.id}`,
        label: row.subject ?? "Review support ticket",
        dueLabel: "Open",
        dueVariant: "normal",
        href: `/support-ticket/tickets/${row.id}`,
      });
    }
  }

  return tasks.slice(0, 5);
}

async function loadPendingApprovals(
  organizationId: bigint,
  permissions: string[],
  packages: string[],
): Promise<CommandCenterApproval[]> {
  const defs: Array<{
    id: string;
    label: string;
    href: string;
    icon: string;
    scope?: string;
    perms: string[];
    count: () => Promise<number>;
  }> = [
    {
      id: "vacation",
      label: "Vacation Request",
      href: "/hrm/leave-applications",
      icon: "calendar",
      scope: "hrm",
      perms: ["manage-leave-applications", "manage-hrm"],
      count: () =>
        prisma.hrmLeaveApplication.count({
          where: { status: "pending", employee: { createdBy: organizationId } },
        }),
    },
    {
      id: "expense",
      label: "Expense Report",
      href: "/expense-management/expenses",
      icon: "receipt",
      scope: "expensemanagement",
      perms: ["manage-expense-management", "manage-expense-entries"],
      count: () => prisma.emExpenseReport.count({ where: { organizationId, status: "submitted" } }),
    },
    {
      id: "payroll",
      label: "Payroll Submission",
      href: "/hrm/payrolls",
      icon: "credit-card",
      scope: "hrm",
      perms: ["manage-payrolls"],
      count: () =>
        prisma.hrmPayroll.count({ where: { status: "pending", employee: { createdBy: organizationId } } }),
    },
    {
      id: "vendor",
      label: "New Vendor",
      href: "/account/vendors",
      icon: "building-2",
      scope: "account",
      perms: ["manage-vendors"],
      count: () => {
        const monthStart = new Date();
        monthStart.setDate(1);
        return prisma.vendor.count({ where: { createdBy: organizationId, createdAt: { gte: monthStart } } });
      },
    },
    {
      id: "policy",
      label: "Compliance Policy",
      href: "/compliance/policies",
      icon: "shield-check",
      scope: "compliance",
      perms: ["manage-compliance-dashboard"],
      count: () => prisma.compliancePolicy.count({ where: { organizationId, status: { not: "published" } } }),
    },
  ];

  const visible = defs.filter(
    (d) => !d.scope || canModule(permissions, packages, d.scope, d.perms),
  );

  const counts = await Promise.all(visible.map((d) => d.count().catch(() => 0)));

  return visible.map((d, i) => ({
    id: d.id,
    label: d.label,
    count: counts[i] ?? 0,
    href: d.href,
    icon: d.icon,
    alwaysShow: true,
  }));
}

async function loadSnapshots(
  organizationId: bigint,
  permissions: string[],
  packages: string[],
): Promise<CommandCenterSnapshot[]> {
  const snapshots: CommandCenterSnapshot[] = [];
  const today = new Date();
  const todayAttendanceDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  if (canModule(permissions, packages, "hrm", ["manage-hrm", "manage-employees"])) {
    const [totalEmployees, presentToday, onLeaveToday, pendingLeaves, openPositions] = await Promise.all([
      prisma.hrmEmployee.count({ where: { createdBy: organizationId } }).catch(() => 0),
      prisma.hrmAttendance
        .count({ where: { date: todayAttendanceDate, status: "present", employee: { createdBy: organizationId } } })
        .catch(() => 0),
      prisma.hrmLeaveApplication
        .count({
          where: {
            status: "approved",
            startDate: { lte: today },
            endDate: { gte: today },
            employee: { createdBy: organizationId },
          },
        })
        .catch(() => 0),
      prisma.hrmLeaveApplication
        .count({ where: { status: "pending", employee: { createdBy: organizationId } } })
        .catch(() => 0),
      prisma.hrmEmployee.count({ where: { createdBy: organizationId, status: "active" } }).catch(() => 0),
    ]);

    snapshots.push({
      id: "people",
      title: "People Overview",
      href: "/hrm",
      rows: [
        { label: "Employees", value: String(totalEmployees) },
        { label: "Online Now", value: String(presentToday), tone: "success" },
        { label: "PTO Today", value: String(onLeaveToday) },
        { label: "Pending Leaves", value: String(pendingLeaves), tone: pendingLeaves > 0 ? "warning" : "default" },
        { label: "Open Positions", value: String(Math.max(0, totalEmployees - openPositions)) },
      ],
    });
  }

  if (canModule(permissions, packages, "project", ["manage-project", "manage-project-dashboard"])) {
    const [projects, totalTasks, completedTasks] = await Promise.all([
      prisma.project.findMany({ where: { createdBy: organizationId }, select: { status: true } }).catch(() => []),
      prisma.projectTask.count({ where: { createdBy: organizationId } }).catch(() => 0),
      prisma.taskStage
        .findMany({ where: { createdBy: organizationId, complete: true }, select: { id: true } })
        .then((stages) => {
          const ids = stages.map((s) => s.id);
          if (!ids.length) return 0;
          return prisma.projectTask.count({ where: { createdBy: organizationId, stageId: { in: ids } } });
        })
        .catch(() => 0),
    ]);

    const active = projects.filter((p) => p.status === "Ongoing").length;
    const finished = projects.filter((p) => p.status === "Finished").length;
    const onHold = projects.filter((p) => p.status === "On Hold" || p.status === "Onhold").length;

    snapshots.push({
      id: "projects",
      title: "Project Overview",
      href: "/project/dashboard",
      rows: [
        { label: "Active Projects", value: String(active) },
        { label: "At Risk", value: String(onHold), tone: onHold > 0 ? "warning" : "default" },
        { label: "Completed", value: String(finished), tone: "success" },
        { label: "On Track", value: String(Math.max(0, active - onHold)) },
        { label: "Overdue Tasks", value: String(Math.max(0, totalTasks - completedTasks)), tone: totalTasks - completedTasks > 0 ? "danger" : "default" },
      ],
    });
  }

  if (canModule(permissions, packages, "crm", ["manage-crm-dashboard", "manage-leads"])) {
    const [totalLeads, openDeals, pipelineValue, newLeadsMonth, qualifiedLeads] = await Promise.all([
      prisma.crmLead.count({ where: { createdBy: organizationId } }).catch(() => 0),
      prisma.crmDeal.count({ where: { createdBy: organizationId, status: "open" } }).catch(() => 0),
      prisma.crmDeal
        .aggregate({ where: { createdBy: organizationId, status: "open" }, _sum: { amount: true } })
        .catch(() => ({ _sum: { amount: null } })),
      prisma.crmLead.count({ where: { createdBy: organizationId, createdAt: { gte: monthStart } } }).catch(() => 0),
      prisma.crmLead.count({ where: { createdBy: organizationId, status: { in: ["qualified", "converted"] } } }).catch(() => 0),
    ]);

    const conversion = totalLeads > 0 ? `${Math.round((qualifiedLeads / totalLeads) * 100)}%` : "0%";

    snapshots.push({
      id: "crm",
      title: "CRM Snapshot",
      href: "/crm/dashboard",
      rows: [
        { label: "New Leads", value: String(newLeadsMonth) },
        { label: "Qualified", value: String(qualifiedLeads) },
        { label: "Conversion Rate", value: conversion },
        { label: "Pipeline Value", value: formatCurrency(Number(pipelineValue._sum.amount ?? 0)), tone: "success" },
        { label: "Open Deals", value: String(openDeals) },
      ],
    });
  }

  if (canModule(permissions, packages, "account", ["manage-account-dashboard", "manage-account"])) {
    const [monthRevenue, monthExpense, customerPayments, vendorPayments] = await Promise.all([
      prisma.revenue
        .aggregate({
          where: { createdBy: organizationId, date: { gte: monthStart } },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: null } })),
      prisma.expense
        .aggregate({
          where: { createdBy: organizationId, date: { gte: monthStart } },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: null } })),
      prisma.customerPayment
        .aggregate({ where: { createdBy: organizationId }, _sum: { amount: true } })
        .catch(() => ({ _sum: { amount: null } })),
      prisma.vendorPayment
        .aggregate({ where: { createdBy: organizationId }, _sum: { amount: true } })
        .catch(() => ({ _sum: { amount: null } })),
    ]);

    const rev = Number(monthRevenue._sum.amount ?? 0);
    const exp = Number(monthExpense._sum.amount ?? 0);
    const outstanding = Number(customerPayments._sum.amount ?? 0) - Number(vendorPayments._sum.amount ?? 0);

    snapshots.push({
      id: "finance",
      title: "Financial Snapshot",
      href: "/account",
      rows: [
        { label: "Revenue This Month", value: formatCurrency(rev), tone: "success" },
        { label: "Outstanding Invoices", value: formatCurrency(Math.max(0, outstanding)) },
        { label: "Expenses", value: formatCurrency(exp), tone: exp > 0 ? "danger" : "default" },
        { label: "Profit", value: formatCurrency(rev - exp), tone: rev - exp >= 0 ? "success" : "danger" },
      ],
    });
  }

  return snapshots;
}

async function loadComplianceBlock(organizationId: bigint): Promise<CommandCenterCompliance | null> {
  const frameworks = await prisma.complianceFramework
    .findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
      take: 4,
      select: { code: true, name: true, progressPct: true },
    })
    .catch(() => []);

  if (frameworks.length === 0) return null;

  const score =
    frameworks.length > 0
      ? Math.round(frameworks.reduce((s, f) => s + f.progressPct, 0) / frameworks.length)
      : 0;

  return {
    score,
    frameworks: frameworks.map((f) => ({
      label: f.code || f.name,
      percent: f.progressPct,
    })),
    actions: [
      { label: "View Controls", href: "/compliance/controls" },
      { label: "Upload Evidence", href: "/compliance/evidence" },
      { label: "Review Policies", href: "/compliance/policies" },
      { label: "Run Audit Scan", href: "/compliance/audits" },
    ],
  };
}

async function loadNotifications(
  organizationId: bigint,
  permissions: string[],
  packages: string[],
): Promise<CommandCenterNotification[]> {
  const items: CommandCenterNotification[] = [];

  if (canModule(permissions, packages, "compliance", ["manage-compliance-dashboard"])) {
    const rows = await prisma.complianceNotification
      .findMany({
        where: { organizationId, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, severity: true, link: true },
      })
      .catch(() => []);

    for (const row of rows) {
      const sev = row.severity?.toLowerCase() ?? "info";
      items.push({
        id: `cn-${row.id}`,
        message: row.title,
        priority: sev === "critical" || sev === "high" ? "high" : sev === "medium" ? "medium" : "low",
        href: row.link ?? "/compliance",
        icon: "shield-check",
      });
    }
  }

  if (canModule(permissions, packages, "hrm", ["manage-hrm"])) {
    const missingTraining = await prisma.hrmEmployee
      .count({ where: { createdBy: organizationId, status: "active" } })
      .catch(() => 0);
    if (missingTraining > 0 && items.length < 5) {
      items.push({
        id: "hr-training",
        message: `${missingTraining} employees in workforce — review training status`,
        priority: "medium",
        href: "/hrm/employees",
        icon: "users",
      });
    }
  }

  return items.slice(0, 5);
}

async function loadCalendarAndSchedule(
  organizationId: bigint,
  permissions: string[],
  packages: string[],
): Promise<{ calendarEvents: CommandCenterCalendarEvent[]; schedule: CommandCenterScheduleItem[] }> {
  const calendarEvents: CommandCenterCalendarEvent[] = [];
  const schedule: CommandCenterScheduleItem[] = [];
  const today = new Date();
  const calStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const calEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayStr = isoDate(today);

  if (canModule(permissions, packages, "hrm", ["manage-hrm", "manage-holidays"])) {
    const holidays = await prisma.hrmHoliday
      .findMany({
        where: { createdBy: organizationId, date: { gte: calStart, lte: calEnd } },
        select: { id: true, name: true, date: true },
      })
      .catch(() => []);

    for (const h of holidays) {
      calendarEvents.push({
        id: `holiday-${h.id}`,
        date: isoDate(new Date(h.date)),
        label: h.name,
        color: "#f59e0b",
        type: "pto",
      });
    }
  }

  if (canModule(permissions, packages, "hrm", ["manage-events"])) {
    const events = await prisma.hrmEvent
      .findMany({
        where: {
          createdBy: organizationId,
          startAt: { gte: new Date(todayStr), lte: new Date(`${todayStr}T23:59:59`) },
        },
        orderBy: { startAt: "asc" },
        take: 6,
        select: { id: true, title: true, startAt: true, endAt: true },
      })
      .catch(() => []);

    for (const e of events) {
      const start = new Date(e.startAt);
      schedule.push({
        id: `event-${e.id}`,
        time: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        title: e.title,
        dotColor: "#3b82f6",
      });
    }
  }

  if (canModule(permissions, packages, "compliance", ["manage-compliance-dashboard"])) {
    const audits = await prisma.complianceAudit
      .findMany({
        where: { organizationId, startDate: { gte: calStart, lte: calEnd } },
        take: 5,
        select: { id: true, name: true, startDate: true },
      })
      .catch(() => []);

    for (const a of audits) {
      if (!a.startDate) continue;
      calendarEvents.push({
        id: `audit-${a.id}`,
        date: isoDate(new Date(a.startDate)),
        label: a.name,
        color: "#8b5cf6",
        type: "compliance",
      });
    }
  }

  if (schedule.length === 0 && canModule(permissions, packages, "hrm", ["manage-hrm"])) {
    schedule.push({
      id: "default-standup",
      time: "09:00 AM",
      title: "Daily standup",
      dotColor: "#3b82f6",
    });
  }

  return { calendarEvents, schedule };
}

function computeHealthScores(snapshots: CommandCenterSnapshot[], compliance: CommandCenterCompliance | null): CommandCenterHealthScore[] {
  const scores: CommandCenterHealthScore[] = [];

  const people = snapshots.find((s) => s.id === "people");
  if (people) {
    const total = Number(people.rows.find((r) => r.label === "Employees")?.value ?? 0);
    const present = Number(people.rows.find((r) => r.label === "Present Today")?.value ?? 0);
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    scores.push({ id: "hr", label: "HR Health", percent: Math.min(100, Math.max(pct, total > 0 ? 70 : 0)) });
  }

  if (compliance) {
    scores.push({ id: "compliance", label: "Compliance", percent: compliance.score });
  }

  const projects = snapshots.find((s) => s.id === "projects");
  if (projects) {
    const active = Number(projects.rows.find((r) => r.label === "Active Projects")?.value ?? 0);
    const atRisk = Number(projects.rows.find((r) => r.label === "At Risk")?.value ?? 0);
    const pct = active > 0 ? Math.round(((active - atRisk) / active) * 100) : 0;
    scores.push({ id: "projects", label: "Projects", percent: Math.min(100, Math.max(pct, 0)) });
  }

  const crm = snapshots.find((s) => s.id === "crm");
  if (crm) {
    const leads = Number(crm.rows.find((r) => r.label === "New Leads (Month)")?.value ?? 0);
    scores.push({ id: "crm", label: "CRM", percent: Math.min(100, 60 + leads * 2) });
  }

  const finance = snapshots.find((s) => s.id === "finance");
  if (finance) {
    const netRow = finance.rows.find((r) => r.label === "Net (Month)");
    const isPositive = netRow?.tone === "success";
    scores.push({ id: "finance", label: "Finance", percent: isPositive ? 95 : 72 });
  }

  return scores;
}

export async function loadCommandCenterPayload(input: {
  organizationId: bigint;
  permissions: string[];
  activatedPackages: string[];
}): Promise<CommandCenterPayload> {
  const { organizationId, permissions, activatedPackages } = input;

  const quickActions = buildCommandCenterQuickActions(permissions, activatedPackages);
  const shortcuts = buildCommandCenterShortcuts(permissions, activatedPackages);

  const [
    recentActivity,
    tasks,
    pendingApprovals,
    snapshots,
    compliance,
    notifications,
    calendarBundle,
  ] = await Promise.all([
    loadRecentActivity(organizationId),
    loadTasks(organizationId, permissions, activatedPackages),
    loadPendingApprovals(organizationId, permissions, activatedPackages),
    loadSnapshots(organizationId, permissions, activatedPackages),
    canModule(permissions, activatedPackages, "compliance", ["manage-compliance-dashboard"])
      ? loadComplianceBlock(organizationId)
      : Promise.resolve(null),
    loadNotifications(organizationId, permissions, activatedPackages),
    loadCalendarAndSchedule(organizationId, permissions, activatedPackages),
  ]);

  const healthScores = computeHealthScores(snapshots, compliance);

  return {
    quickActions,
    tasks,
    recentActivity,
    pendingApprovals,
    snapshots,
    compliance,
    notifications,
    shortcuts,
    calendarEvents: calendarBundle.calendarEvents,
    schedule: calendarBundle.schedule,
    healthScores,
  };
}

export function commandCenterGreeting(firstName: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return `${period}, ${firstName}`;
}

export function commandCenterFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName || "there";
}
