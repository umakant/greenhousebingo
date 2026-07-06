import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}
function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-revenues") && !hasAccountPermission(perms, "manage-expenses")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "profit-loss";
  const fromDate = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  toDate.setHours(23, 59, 59, 999);

  if (type === "profit-loss") {
    const [revenues, expenses] = await Promise.all([
      prisma.revenue.findMany({
        where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } },
        select: { amount: true, category: true, date: true },
      }),
      prisma.expense.findMany({
        where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } },
        select: { amount: true, category: true, date: true },
      }),
    ]);

    const totalRevenue = revenues.reduce((s, r) => s + toNum(r.amount), 0);
    const totalExpense = expenses.reduce((s, r) => s + toNum(r.amount), 0);
    const netProfit = totalRevenue - totalExpense;

    const revenueByCategory: Record<string, number> = {};
    revenues.forEach((r) => { const k = r.category ?? "Uncategorized"; revenueByCategory[k] = (revenueByCategory[k] ?? 0) + toNum(r.amount); });

    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((r) => { const k = r.category ?? "Uncategorized"; expenseByCategory[k] = (expenseByCategory[k] ?? 0) + toNum(r.amount); });

    return NextResponse.json({
      type: "profit-loss",
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      net_profit: netProfit,
      revenue_by_category: Object.entries(revenueByCategory).map(([category, amount]) => ({ category, amount })),
      expense_by_category: Object.entries(expenseByCategory).map(([category, amount]) => ({ category, amount })),
    });
  }

  if (type === "revenue") {
    const rows = await prisma.revenue.findMany({
      where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: "desc" },
    });
    const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as bigint[];
    const customers = customerIds.length
      ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true } })
      : [];
    const cMap = Object.fromEntries(customers.map((c) => [String(c.id), c.companyName]));
    const data = rows.map((r) => ({
      id: Number(r.id),
      reference_number: r.referenceNumber,
      customer: r.customerId ? (cMap[String(r.customerId)] ?? "-") : "-",
      date: r.date.toISOString().slice(0, 10),
      amount: toNum(r.amount),
      category: r.category ?? "-",
      payment_method: r.paymentMethod ?? "-",
      status: r.status,
    }));
    const total = data.reduce((s, r) => s + r.amount, 0);
    return NextResponse.json({ type: "revenue", from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10), total, data });
  }

  if (type === "expense") {
    const rows = await prisma.expense.findMany({
      where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: "desc" },
    });
    const vendorIds = [...new Set(rows.map((r) => r.vendorId).filter(Boolean))] as bigint[];
    const vendors = vendorIds.length ? await prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, name: true } }) : [];
    const vMap = Object.fromEntries(vendors.map((v) => [String(v.id), v.name]));
    const data = rows.map((r) => ({
      id: Number(r.id),
      reference_number: r.referenceNumber,
      vendor: r.vendorId ? (vMap[String(r.vendorId)] ?? "-") : "-",
      date: r.date.toISOString().slice(0, 10),
      amount: toNum(r.amount),
      category: r.category ?? "-",
      payment_method: r.paymentMethod ?? "-",
      status: r.status,
    }));
    const total = data.reduce((s, r) => s + r.amount, 0);
    return NextResponse.json({ type: "expense", from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10), total, data });
  }

  if (type === "cash-flow") {
    const [revenues, expenses, vendorPayments, customerPayments] = await Promise.all([
      prisma.revenue.aggregate({ where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { createdBy: companyId, date: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
      prisma.vendorPayment.aggregate({ where: { createdBy: companyId, paymentDate: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
      prisma.customerPayment.aggregate({ where: { createdBy: companyId, paymentDate: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
    ]);
    const totalInflow = toNum(revenues._sum.amount) + toNum(customerPayments._sum.amount);
    const totalOutflow = toNum(expenses._sum.amount) + toNum(vendorPayments._sum.amount);
    return NextResponse.json({
      type: "cash-flow",
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      total_inflow: totalInflow,
      total_outflow: totalOutflow,
      net_cash_flow: totalInflow - totalOutflow,
      inflow_breakdown: { revenue: toNum(revenues._sum.amount), customer_payments: toNum(customerPayments._sum.amount) },
      outflow_breakdown: { expenses: toNum(expenses._sum.amount), vendor_payments: toNum(vendorPayments._sum.amount) },
    });
  }

  return NextResponse.json({ error: "Unknown report type. Use: profit-loss, revenue, expense, cash-flow" }, { status: 400 });
}
