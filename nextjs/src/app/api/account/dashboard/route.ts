/**
 * Account Dashboard data (Laravel company dashboard parity).
 * Returns stats, monthly payment series, recent items, and finance activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function isoDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).slice(0, 10);
}

function isoDateTime(d: Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const email = req.cookies.get("pf_email")?.value?.trim().toLowerCase();
  const role = req.cookies.get("pf_role")?.value;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = user.type === "company" || user.type === "company_admin" ? user.id : (user.createdBy ?? user.id);
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  const isCompanyUser = user.type === "company" || user.type === "company_admin" || role === "company" || role === "company_admin";
  const canManage = role === "superadmin" || hasPermission(perms, "manage-account-dashboard") || hasPermission(perms, "manage-account") || isCompanyUser;
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const last5Days = new Date();
  last5Days.setDate(last5Days.getDate() - 5);
  last5Days.setHours(0, 0, 0, 0);

  const months = last6MonthsBase();
  const sixMonthsAgo = months[0].start;

  const [
    customerCount,
    vendorCount,
    customerPayments,
    vendorPayments,
    totalCustomerPayment,
    totalVendorPayment,
    recentRevenueRows,
    recentExpenseRows,
    recentCustomerPaymentRows,
    recentVendorPaymentRows,
    recentInvoiceRows,
    recentProposalRows,
  ] = await Promise.all([
    prisma.customer.count({ where: { createdBy: companyId } }).catch(() => 0),
    prisma.vendor.count({ where: { createdBy: companyId } }).catch(() => 0),
    prisma.customerPayment.findMany({
      where: { createdBy: companyId, paymentDate: { gte: sixMonthsAgo } },
      select: { paymentDate: true, amount: true },
    }).catch(() => []),
    prisma.vendorPayment.findMany({
      where: { createdBy: companyId, paymentDate: { gte: sixMonthsAgo } },
      select: { paymentDate: true, amount: true },
    }).catch(() => []),
    prisma.customerPayment.aggregate({
      where: { createdBy: companyId },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: null } })),
    prisma.vendorPayment.aggregate({
      where: { createdBy: companyId },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: null } })),
    prisma.revenue.findMany({
      where: { createdBy: companyId, date: { gte: last5Days } },
      orderBy: { date: "desc" },
      take: 8,
      select: { id: true, referenceNumber: true, description: true, amount: true, date: true, category: true },
    }).catch(() => []),
    prisma.expense.findMany({
      where: { createdBy: companyId, date: { gte: last5Days } },
      orderBy: { date: "desc" },
      take: 8,
      select: { id: true, referenceNumber: true, description: true, amount: true, date: true, category: true },
    }).catch(() => []),
    prisma.customerPayment.findMany({
      where: { createdBy: companyId, paymentDate: { gte: last5Days } },
      orderBy: { paymentDate: "desc" },
      take: 8,
      select: {
        id: true,
        referenceNumber: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        status: true,
        customerId: true,
      },
    }).catch(() => []),
    prisma.vendorPayment.findMany({
      where: { createdBy: companyId, paymentDate: { gte: last5Days } },
      orderBy: { paymentDate: "desc" },
      take: 8,
      select: {
        id: true,
        referenceNumber: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        status: true,
        vendorId: true,
      },
    }).catch(() => []),
    prisma.salesInvoice.findMany({
      where: { createdBy: companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        invoiceDate: true,
        createdAt: true,
      },
    }).catch(() => []),
    prisma.salesProposal.findMany({
      where: { createdBy: companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        proposalNumber: true,
        totalAmount: true,
        status: true,
        proposalDate: true,
        createdAt: true,
      },
    }).catch(() => []),
  ]);

  const customerIds = Array.from(new Set(recentCustomerPaymentRows.map((p) => p.customerId)));
  const vendorIds = Array.from(new Set(recentVendorPaymentRows.map((p) => p.vendorId)));

  const [customers, vendors] = await Promise.all([
    customerIds.length
      ? prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, companyName: true, contactPersonName: true },
        })
      : Promise.resolve([]),
    vendorIds.length
      ? prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true, companyName: true },
        })
      : Promise.resolve([]),
  ]);

  const customerMap = new Map(customers.map((c) => [c.id.toString(), c.companyName || c.contactPersonName]));
  const vendorMap = new Map(vendors.map((v) => [v.id.toString(), v.companyName || v.name]));

  const monthlyCustomerPayments = months.map(({ month, start, end }) => ({
    month,
    customer_payments: customerPayments
      .filter((p) => p.paymentDate >= start && p.paymentDate <= end)
      .reduce((s, p) => s + Number(p.amount), 0),
  }));

  const monthlyVendorPayments = months.map(({ month, start, end }) => ({
    month,
    vendor_payments: vendorPayments
      .filter((p) => p.paymentDate >= start && p.paymentDate <= end)
      .reduce((s, p) => s + Number(p.amount), 0),
  }));

  const recentRevenues = recentRevenueRows.map((r) => ({
    id: Number(r.id),
    title: r.referenceNumber,
    description: r.description ?? r.category ?? "",
    amount: Number(r.amount),
    date: isoDate(r.date),
  }));

  const recentExpenses = recentExpenseRows.map((e) => ({
    id: Number(e.id),
    title: e.referenceNumber,
    description: e.description ?? e.category ?? "",
    amount: Number(e.amount),
    date: isoDate(e.date),
  }));

  const recentCustomerPayments = recentCustomerPaymentRows.map((p) => ({
    id: Number(p.id),
    title: p.referenceNumber,
    description: customerMap.get(p.customerId.toString()) ?? "Customer",
    amount: Number(p.amount),
    date: isoDate(p.paymentDate),
    status: p.status,
    method: p.paymentMethod ?? "",
  }));

  const recentVendorPayments = recentVendorPaymentRows.map((p) => ({
    id: Number(p.id),
    title: p.referenceNumber,
    description: vendorMap.get(p.vendorId.toString()) ?? "Vendor",
    amount: Number(p.amount),
    date: isoDate(p.paymentDate),
    status: p.status,
    method: p.paymentMethod ?? "",
  }));

  type ActivityRow = {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    amount: number;
    direction: "in" | "out" | "neutral";
    date: string;
    sortAt: string;
    href: string;
    status?: string;
  };

  const activity: ActivityRow[] = [];

  for (const p of recentCustomerPaymentRows) {
    activity.push({
      id: `cp-${p.id}`,
      type: "customer_payment",
      title: p.referenceNumber,
      subtitle: `Payment received — ${customerMap.get(p.customerId.toString()) ?? "Customer"}`,
      amount: Number(p.amount),
      direction: "in",
      date: isoDate(p.paymentDate),
      sortAt: isoDateTime(p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate)),
      href: "/account/customer-payments",
      status: p.status,
    });
  }

  for (const p of recentVendorPaymentRows) {
    activity.push({
      id: `vp-${p.id}`,
      type: "vendor_payment",
      title: p.referenceNumber,
      subtitle: `Payment sent — ${vendorMap.get(p.vendorId.toString()) ?? "Vendor"}`,
      amount: Number(p.amount),
      direction: "out",
      date: isoDate(p.paymentDate),
      sortAt: isoDateTime(p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate)),
      href: "/account/vendor-payments",
      status: p.status,
    });
  }

  for (const r of recentRevenueRows) {
    activity.push({
      id: `rev-${r.id}`,
      type: "revenue",
      title: r.referenceNumber,
      subtitle: r.description ?? r.category ?? "Revenue recorded",
      amount: Number(r.amount),
      direction: "in",
      date: isoDate(r.date),
      sortAt: isoDateTime(r.date instanceof Date ? r.date : new Date(r.date)),
      href: "/account/revenues",
      status: "completed",
    });
  }

  for (const e of recentExpenseRows) {
    activity.push({
      id: `exp-${e.id}`,
      type: "expense",
      title: e.referenceNumber,
      subtitle: e.description ?? e.category ?? "Expense recorded",
      amount: Number(e.amount),
      direction: "out",
      date: isoDate(e.date),
      sortAt: isoDateTime(e.date instanceof Date ? e.date : new Date(e.date)),
      href: "/account/expenses",
      status: "completed",
    });
  }

  for (const inv of recentInvoiceRows) {
    activity.push({
      id: `inv-${inv.id}`,
      type: "invoice",
      title: inv.invoiceNumber,
      subtitle: "Sales invoice",
      amount: Number(inv.totalAmount),
      direction: "in",
      date: isoDate(inv.invoiceDate),
      sortAt: isoDateTime(inv.createdAt ?? inv.invoiceDate),
      href: `/sales-invoices/${inv.id}`,
      status: inv.status,
    });
  }

  for (const prop of recentProposalRows) {
    activity.push({
      id: `prop-${prop.id}`,
      type: "proposal",
      title: prop.proposalNumber,
      subtitle: "Sales proposal",
      amount: Number(prop.totalAmount),
      direction: "neutral",
      date: isoDate(prop.proposalDate),
      sortAt: isoDateTime(prop.createdAt ?? prop.proposalDate),
      href: `/sales-proposals/${prop.id}`,
      status: prop.status,
    });
  }

  activity.sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1));

  return NextResponse.json({
    stats: {
      total_clients: Number(customerCount),
      total_vendors: Number(vendorCount),
      total_customer_payment: Number(totalCustomerPayment._sum.amount ?? 0),
      total_vendor_payment: Number(totalVendorPayment._sum.amount ?? 0),
    },
    monthlyCustomerPayments,
    monthlyVendorPayments,
    recentRevenues,
    recentExpenses,
    recentCustomerPayments,
    recentVendorPayments,
    financeActivity: activity.slice(0, 12).map(({ sortAt: _s, ...rest }) => rest),
  });
}
