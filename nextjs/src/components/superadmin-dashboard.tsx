"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CreditCard,
  Crown,
  Headphones,
  Image,
  Layout,
  Mail,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import { LineChart } from "@/components/charts";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useIsDark } from "@/hooks/use-is-dark";
import { formatCurrency as formatCurrencyUtil } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";
import type {
  SuperadminDashboardChartPoint,
  SuperadminDashboardStats,
  SuperadminRecentCompany,
  SuperadminRecentOrder,
  SuperadminRecentSubscriber,
  SuperadminRecentTicket,
} from "@/lib/superadmin-dashboard-data";


function formatStatus(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

const QUICK_LINKS = [
  { href: "/companies", label: "Companies", icon: Users },
  { href: "/helpdesk-tickets", label: "Helpdesk", icon: Headphones },
  { href: "/landing-page", label: "CMS", icon: Layout },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/notification-templates", label: "Notifications", icon: Bell },
  { href: "/media-library", label: "Media Library", icon: Image },
  { href: "/business-modules", label: "Industry Modules", icon: Boxes },
  { href: "/autopilot-modules", label: "Autopilot Modules", icon: Bot },
  { href: "/add-ons", label: "Add-Ons", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SuperAdminDashboard({
  stats,
  chartData,
  recentOrders,
  recentCompanies,
  openTickets,
  recentSubscribers,
}: {
  stats: SuperadminDashboardStats;
  chartData: SuperadminDashboardChartPoint[];
  recentOrders: SuperadminRecentOrder[];
  recentCompanies: SuperadminRecentCompany[];
  openTickets: SuperadminRecentTicket[];
  recentSubscribers: SuperadminRecentSubscriber[];
}) {
  const { settings } = useAppSettings();
  const isDark = useIsDark();
  const formatCurrency = (value: number) => formatCurrencyUtil(value, settings);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("SaaS overview")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/orders"
            label={t("Total Orders")}
            value={stats.total_orders}
            sub={t("All subscription orders")}
            icon={<ShoppingCart className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/orders"
            label={t("Order Payments")}
            value={formatCurrency(stats.order_payments)}
            sub={t("Lifetime revenue")}
            icon={<CreditCard className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/plans"
            label={t("Total Plans")}
            value={stats.total_plans}
            sub={`${stats.active_plans} ${t("active")}`}
            icon={<Crown className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/companies"
            label={t("Total Companies")}
            value={stats.total_companies}
            sub={t("Registered tenants")}
            icon={<Building2 className="h-8 w-8" />}



          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Platform & support")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/orders"
            label={t("Pending Orders")}
            value={stats.pending_orders}
            sub={t("Awaiting payment")}
            icon={<Receipt className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/helpdesk-tickets"
            label={t("Open Tickets")}
            value={stats.open_helpdesk_tickets}
            sub={`${stats.total_helpdesk_tickets} ${t("total")}`}
            icon={<Headphones className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/add-ons"
            label={t("Add-ons Enabled")}
            value={stats.enabled_addons}
            sub={`${stats.total_addons} ${t("packages")}`}
            icon={<Package className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/newsletter-subscribers"
            label={t("Newsletter Subscribers")}
            value={stats.newsletter_subscribers}
            sub={t("Marketing list")}
            icon={<Mail className="h-8 w-8" />}



          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Content & modules")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/email-templates"
            label={t("Email Templates")}
            value={stats.email_templates}
            sub={t("System emails")}
            icon={<Mail className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/notification-templates"
            label={t("Notification Templates")}
            value={stats.notification_templates}
            sub={t("In-app & alerts")}
            icon={<Bell className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/custom-pages"
            label={t("Custom Pages")}
            value={stats.custom_pages}
            sub={t("Published CMS pages")}
            icon={<BookOpen className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/business-modules"
            label={t("Industry Modules")}
            value={stats.active_business_modules}
            sub={t("Active modules")}
            icon={<Boxes className="h-8 w-8" />}



          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("Orders & revenue (monthly)")}</CardTitle>
            <CardDescription>{t("Current calendar year")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              key={isDark ? "orders-dark" : "orders-light"}
              data={chartData}
              height={280}
              showTooltip
              showGrid
              showLegend
              xAxisKey="month"
              lines={[
                { dataKey: "orders", color: "#3b82f6", name: t("Orders") },
                { dataKey: "payments", color: "#10b981", name: t("Revenue") },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("New companies (monthly)")}</CardTitle>
            <CardDescription>{t("Tenant registrations this year")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              key={isDark ? "companies-dark" : "companies-light"}
              data={chartData}
              height={280}
              showTooltip
              showGrid
              showLegend
              xAxisKey="month"
              lines={[{ dataKey: "companies", color: "#f97316", name: t("Companies") }]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Recent orders")}</CardTitle>
              <CardDescription>{t("Latest subscription purchases")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">{t("View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No orders yet.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Order")}</TableHead>
                      <TableHead>{t("Customer")}</TableHead>
                      <TableHead>{t("Plan")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <Link href={`/orders/${o.id}`} className="text-primary hover:underline">
                            {o.order_id}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{o.email}</p>
                        </TableCell>
                        <TableCell className="text-sm">{o.plan_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatStatus(o.payment_status)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Open helpdesk tickets")}</CardTitle>
              <CardDescription>{t("Needs attention from support")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/helpdesk-tickets">{t("View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openTickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No open tickets.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Ticket")}</TableHead>
                      <TableHead>{t("Priority")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link href={`/helpdesk-tickets/${ticket.id}`} className="font-medium text-primary hover:underline">
                            {ticket.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            #{ticket.ticket_id} · {formatDate(ticket.created_at)}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{ticket.priority}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatStatus(ticket.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Recent companies")}</CardTitle>
              <CardDescription>{t("Newest tenant registrations")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/companies">{t("View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCompanies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No companies yet.")}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentCompanies.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.email} · {formatDate(c.created_at)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.active_plan != null ? `${t("Plan")} #${c.active_plan}` : t("No plan")}
                      {c.plan_expire_date ? ` · ${t("expires")} ${c.plan_expire_date}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Newsletter subscribers")}</CardTitle>
              <CardDescription>{t("Latest sign-ups from the site")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/newsletter-subscribers">{t("View all")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSubscribers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No subscribers yet.")}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentSubscribers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium">{s.email}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(s.subscribed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Quick links")}</CardTitle>
          <CardDescription>{t("Jump to platform administration sections")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} variant="outline" className="h-auto justify-start gap-2 px-3 py-2.5" asChild>
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-left text-sm">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}