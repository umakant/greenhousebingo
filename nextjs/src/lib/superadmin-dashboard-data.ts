import { prisma } from "@/lib/prisma";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const OPEN_HELPDESK_STATUSES = ["open", "in_progress", "pending"];

export type SuperadminDashboardStats = {
  order_payments: number;
  total_orders: number;
  total_plans: number;
  active_plans: number;
  total_companies: number;
  pending_orders: number;
  open_helpdesk_tickets: number;
  total_helpdesk_tickets: number;
  enabled_addons: number;
  total_addons: number;
  newsletter_subscribers: number;
  email_templates: number;
  notification_templates: number;
  custom_pages: number;
  active_business_modules: number;
};

export type SuperadminDashboardChartPoint = {
  month: string;
  orders: number;
  payments: number;
  companies: number;
};

export type SuperadminRecentOrder = {
  id: string;
  order_id: string;
  name: string;
  email: string;
  plan_name: string;
  price: string;
  currency: string;
  payment_status: string;
  created_at: string;
};

export type SuperadminRecentCompany = {
  id: string;
  name: string;
  email: string;
  active_plan: number | null;
  plan_expire_date: string | null;
  created_at: string;
};

export type SuperadminRecentTicket = {
  id: string;
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
};

export type SuperadminRecentSubscriber = {
  id: string;
  email: string;
  subscribed_at: string;
};

export type SuperadminDashboardData = {
  stats: SuperadminDashboardStats;
  chartData: SuperadminDashboardChartPoint[];
  recentOrders: SuperadminRecentOrder[];
  recentCompanies: SuperadminRecentCompany[];
  openTickets: SuperadminRecentTicket[];
  recentSubscribers: SuperadminRecentSubscriber[];
};

function monthChartSkeleton() {
  return MONTHS.map((label) => ({ month: label, orders: 0, payments: 0, companies: 0 }));
}

export async function getSuperadminDashboardData(): Promise<SuperadminDashboardData> {
  const now = new Date();
  const year = now.getFullYear();

  const [
    totalOrders,
    paymentsAgg,
    totalPlans,
    activePlans,
    totalCompanies,
    pendingOrders,
    openHelpdeskTickets,
    totalHelpdeskTickets,
    enabledAddons,
    totalAddons,
    newsletterSubscribers,
    emailTemplates,
    notificationTemplates,
    customPages,
    activeBusinessModules,
    orderAggRows,
    companyAggRows,
    recentOrderRows,
    recentCompanyRows,
    openTicketRows,
    recentSubscriberRows,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { amount: true } }),
    prisma.plan.count(),
    prisma.plan.count({ where: { status: true } }),
    prisma.user.count({ where: { type: { in: ["company", "company_admin"] } } }),
    prisma.order.count({
      where: {
        OR: [
          { paymentStatus: { in: ["pending", "unpaid", "processing"] } },
          { status: { in: ["pending", "unpaid", "processing"] } },
        ],
      },
    }),
    prisma.helpdeskTicket.count({ where: { status: { in: OPEN_HELPDESK_STATUSES } } }),
    prisma.helpdeskTicket.count(),
    prisma.addOn.count({ where: { isEnable: true } }),
    prisma.addOn.count(),
    prisma.newsletterSubscriber.count(),
    prisma.emailTemplate.count(),
    prisma.notification.count(),
    prisma.customPage.count({ where: { isActive: true } }),
    prisma.businessModule.count({ where: { isActive: true } }),
    prisma.$queryRaw<Array<{ month: number; orders: bigint; payments: unknown }>>`
      SELECT
        EXTRACT(MONTH FROM "created_at")::int as month,
        COUNT(*)::bigint as orders,
        COALESCE(SUM("amount"), 0)::numeric as payments
      FROM "orders"
      WHERE EXTRACT(YEAR FROM "created_at")::int = ${year}
      GROUP BY EXTRACT(MONTH FROM "created_at")
      ORDER BY EXTRACT(MONTH FROM "created_at")
    `,
    prisma.$queryRaw<Array<{ month: number; companies: bigint }>>`
      SELECT
        EXTRACT(MONTH FROM "created_at")::int as month,
        COUNT(*)::bigint as companies
      FROM "users"
      WHERE "type" IN ('company', 'company_admin')
        AND EXTRACT(YEAR FROM "created_at")::int = ${year}
      GROUP BY EXTRACT(MONTH FROM "created_at")
      ORDER BY EXTRACT(MONTH FROM "created_at")
    `,
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderId: true,
        name: true,
        email: true,
        planName: true,
        price: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { type: { in: ["company", "company_admin"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        activePlan: true,
        planExpireDate: true,
        createdAt: true,
      },
    }),
    prisma.helpdeskTicket.findMany({
      where: { status: { in: OPEN_HELPDESK_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        ticketId: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      take: 6,
      select: { id: true, email: true, subscribedAt: true },
    }),
  ]);

  const ordersByMonth = new Map<number, { orders: number; payments: number }>();
  for (const r of orderAggRows) {
    ordersByMonth.set(Number(r.month), {
      orders: Number(r.orders ?? 0),
      payments: Number(r.payments ?? 0),
    });
  }

  const companiesByMonth = new Map<number, number>();
  for (const r of companyAggRows) {
    companiesByMonth.set(Number(r.month), Number(r.companies ?? 0));
  }

  const chartData = MONTHS.map((label, idx) => {
    const m = idx + 1;
    const orderPoint = ordersByMonth.get(m) ?? { orders: 0, payments: 0 };
    return {
      month: label,
      orders: orderPoint.orders,
      payments: orderPoint.payments,
      companies: companiesByMonth.get(m) ?? 0,
    };
  });

  const stats: SuperadminDashboardStats = {
    total_orders: Number(totalOrders ?? 0),
    order_payments: Number((paymentsAgg?._sum?.amount as unknown) ?? 0),
    total_plans: Number(totalPlans ?? 0),
    active_plans: Number(activePlans ?? 0),
    total_companies: Number(totalCompanies ?? 0),
    pending_orders: Number(pendingOrders ?? 0),
    open_helpdesk_tickets: Number(openHelpdeskTickets ?? 0),
    total_helpdesk_tickets: Number(totalHelpdeskTickets ?? 0),
    enabled_addons: Number(enabledAddons ?? 0),
    total_addons: Number(totalAddons ?? 0),
    newsletter_subscribers: Number(newsletterSubscribers ?? 0),
    email_templates: Number(emailTemplates ?? 0),
    notification_templates: Number(notificationTemplates ?? 0),
    custom_pages: Number(customPages ?? 0),
    active_business_modules: Number(activeBusinessModules ?? 0),
  };

  return {
    stats,
    chartData: chartData.length ? chartData : monthChartSkeleton(),
    recentOrders: recentOrderRows.map((o) => ({
      id: o.id.toString(),
      order_id: o.orderId ?? o.id.toString(),
      name: o.name ?? "—",
      email: o.email ?? "—",
      plan_name: o.planName ?? "—",
      price: o.price?.toString?.() ?? "0",
      currency: o.currency ?? "USD",
      payment_status: o.paymentStatus ?? "pending",
      created_at: o.createdAt.toISOString(),
    })),
    recentCompanies: recentCompanyRows.map((u) => ({
      id: u.id.toString(),
      name: u.name?.trim() || "Company",
      email: u.email ?? "—",
      active_plan: u.activePlan,
      plan_expire_date: u.planExpireDate ? u.planExpireDate.toISOString().slice(0, 10) : null,
      created_at: u.createdAt.toISOString(),
    })),
    openTickets: openTicketRows.map((t) => ({
      id: t.id.toString(),
      ticket_id: t.ticketId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      created_at: t.createdAt.toISOString(),
    })),
    recentSubscribers: recentSubscriberRows.map((s) => ({
      id: s.id.toString(),
      email: s.email,
      subscribed_at: s.subscribedAt.toISOString(),
    })),
  };
}
