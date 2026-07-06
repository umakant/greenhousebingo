import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import { applyEmSubmitterListScope } from "@/lib/em-portal-scope";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Rolling 6 calendar months (labels match Account dashboard). */
function last6MonthsBase() {
  const out: { month: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    out.push({ month: MONTHS[start.getMonth()], start, end });
  }
  return out;
}

const SETTLED_STATUSES = new Set(["approved", "processed", "paid"]);

const EXPENSE_STATS_PERMISSIONS = [
  "manage-expense-management",
  "manage-expense-management-dashboard",
  "manage-expense-analytics",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
] as const;

function canAccessExpenseStats(perms: string[], role: string | undefined): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin") return true;
  return EXPENSE_STATS_PERMISSIONS.some((p) => hasPermission(perms, p));
}

function lineAmountUsd(row: { amountUsd: unknown; amount: unknown }): number {
  return Number(row.amountUsd ?? row.amount ?? 0);
}

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  const perms = await getPermissionsFromRequest(req);
  if (!canAccessExpenseStats(perms, role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const isSuperadmin = (actor.type ?? "").toLowerCase().includes("superadmin");
  const companyIdRaw = (req.nextUrl.searchParams.get("company_id") ?? "").trim();
  let organizationId = resolveEmOrganizationId(actor);
  if (isSuperadmin && companyIdRaw && /^\d+$/.test(companyIdRaw)) {
    organizationId = BigInt(companyIdRaw);
  }

  const lineWhere = applyEmSubmitterListScope({ organizationId }, actor, perms);
  const reportWhere = applyEmSubmitterListScope({ organizationId }, actor, perms);

  const months = last6MonthsBase();
  const rangeStart = months[0].start;

  const last5Days = new Date();
  last5Days.setDate(last5Days.getDate() - 5);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    openReports,
    receiptsCount,
    openExpenseLines,
    pendingApprovals,
    linesForCharts,
    recentExpenseLines,
    recentPendingLines,
    totalUsdAgg,
    totalFallbackAgg,
    draftReportsCount,
    rejectedReportsCount,
    totalLineCount,
    categoryGroups,
    settledMonthLines,
  ] = await Promise.all([
    prisma.emExpenseReport.count({
      where: { ...reportWhere, status: { in: ["draft", "submitted"] } },
    }),
    prisma.emExpenseLine.count({
      where: { ...lineWhere, receiptAttached: true },
    }),
    prisma.emExpenseLine.count({
      where: { ...lineWhere, status: { in: ["draft", "submitted"] } },
    }),
    prisma.emExpenseReport.count({
      where: { ...reportWhere, status: "submitted" },
    }),
    prisma.emExpenseLine.findMany({
      where: { ...lineWhere, expenseDate: { gte: rangeStart } },
      select: { expenseDate: true, amount: true, amountUsd: true, status: true },
    }),
    prisma.emExpenseLine.findMany({
      where: { ...lineWhere, expenseDate: { gte: last5Days } },
      orderBy: { expenseDate: "desc" },
      take: 10,
      select: {
        id: true,
        expenseDate: true,
        category: true,
        merchant: true,
        amount: true,
        currency: true,
        amountUsd: true,
        status: true,
      },
    }),
    prisma.emExpenseLine.findMany({
      where: { ...lineWhere, status: "submitted" },
      orderBy: { expenseDate: "desc" },
      take: 10,
      select: {
        id: true,
        expenseDate: true,
        category: true,
        merchant: true,
        amount: true,
        currency: true,
        amountUsd: true,
        status: true,
      },
    }),
    prisma.emExpenseLine.aggregate({
      where: { ...lineWhere, amountUsd: { not: null } },
      _sum: { amountUsd: true },
    }),
    prisma.emExpenseLine.aggregate({
      where: { ...lineWhere, amountUsd: null },
      _sum: { amount: true },
    }),
    prisma.emExpenseReport.count({
      where: { ...reportWhere, status: "draft" },
    }),
    prisma.emExpenseReport.count({
      where: { ...reportWhere, status: "rejected" },
    }),
    prisma.emExpenseLine.count({
      where: lineWhere,
    }),
    prisma.emExpenseLine.groupBy({
      by: ["category"],
      where: lineWhere,
      _count: { id: true },
    }),
    prisma.emExpenseLine.findMany({
      where: {
        ...lineWhere,
        expenseDate: { gte: monthStart },
        status: { in: [...SETTLED_STATUSES] },
      },
      select: { amountUsd: true, amount: true },
    }),
  ]);

  const totalSpendAllTime =
    Number(totalUsdAgg._sum.amountUsd ?? 0) + Number(totalFallbackAgg._sum.amount ?? 0);

  const monthMeta = (start: Date) => {
    const y = start.getFullYear();
    const m = start.getMonth();
    return {
      month: MONTHS[m],
      month_key: `${y}-${String(m + 1).padStart(2, "0")}`,
      month_label: `${MONTHS[m]} ${y}`,
    };
  };

  const monthlyTotalSpend = months.map(({ month, start, end }) => {
    let total = 0;
    let pending = 0;
    for (const row of linesForCharts) {
      if (row.expenseDate < start || row.expenseDate > end) continue;
      const amt = lineAmountUsd(row);
      total += amt;
      const st = (row.status ?? "").trim().toLowerCase();
      if (st === "draft" || st === "submitted") pending += amt;
    }
    return { ...monthMeta(start), total_expenses: total, pending_expenses: pending };
  });

  const monthlySettledSpend = months.map(({ month, start, end }) => {
    let total = 0;
    for (const row of linesForCharts) {
      if (row.expenseDate < start || row.expenseDate > end) continue;
      const st = (row.status ?? "").trim().toLowerCase();
      if (!SETTLED_STATUSES.has(st)) continue;
      total += lineAmountUsd(row);
    }
    const meta = monthMeta(start);
    return { month: meta.month, month_key: meta.month_key, month_label: meta.month_label, settled_expenses: total };
  });

  const monthlyActivity = monthlyTotalSpend.map((row) => ({
    month: row.month,
    month_key: row.month_key,
    month_label: row.month_label,
    total: row.total_expenses,
    pending: row.pending_expenses,
  }));

  const mapLine = (r: (typeof recentExpenseLines)[0]) => ({
    id: r.id.toString(),
    expenseDate: r.expenseDate.toISOString().slice(0, 10),
    category: r.category,
    merchant: r.merchant,
    amount: Number(r.amount),
    currency: r.currency,
    amountUsd: r.amountUsd != null ? Number(r.amountUsd) : null,
    status: r.status,
  });

  const categoryDistribution = categoryGroups
    .map((g) => ({
      name: (g.category ?? "").trim() || "Uncategorized",
      value: g._count.id,
    }))
    .sort((a, b) => b.value - a.value);

  const settledSpendCurrentMonth = settledMonthLines.reduce((sum, row) => sum + lineAmountUsd(row), 0);

  return NextResponse.json({
    ok: true,
    data: {
      openReports,
      receipts: receiptsCount,
      openExpenses: openExpenseLines,
      approvals: pendingApprovals,
      totalSpendAllTime,
      monthlyTotalSpend,
      monthlySettledSpend,
      monthlyActivity,
      recentLines: recentExpenseLines.map(mapLine),
      recentExpenseLines: recentExpenseLines.map(mapLine),
      recentPendingLines: recentPendingLines.map(mapLine),
      draftReportsCount,
      rejectedReportsCount,
      totalLineCount,
      categoryDistribution,
      settledSpendCurrentMonth,
    },
  });
}
