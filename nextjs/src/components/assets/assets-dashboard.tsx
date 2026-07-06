"use client";

import * as React from "react";
import { Package, UserCheck, Wrench, HandCoins, TrendingDown, MapPin } from "lucide-react";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


type DashboardStats = {
  totalAssets: number;
  totalAssignments: number;
  activeAssignments: number;
  totalMaintenance: number;
  scheduledMaintenance: number;
  totalBorrowRent: number;
  activeBorrowRent: number;
  totalPaymentsReceived: number;
};
type CategoryCount = { name: string; count: number };
type RecentAsset = { id: string; name: string; createdAt: string; category?: { name: string } | null; location?: { name: string } | null };
type RecentMaintenance = { id: string; title: string; status: string; priority: string; asset?: { name: string } | null };

export default function AssetsDashboard({ permissions }: { permissions: string[] }) {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [categories, setCategories] = React.useState<CategoryCount[]>([]);
  const [recentAssets, setRecentAssets] = React.useState<RecentAsset[]>([]);
  const [recentMaintenance, setRecentMaintenance] = React.useState<RecentMaintenance[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/assets/dashboard").then(r => r.json()).then(json => {
      setStats(json.stats ?? null);
      setCategories(json.categories ?? []);
      setRecentAssets(json.recentAssets ?? []);
      setRecentMaintenance(json.recentMaintenance ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: t("Total Assets"), value: stats?.totalAssets ?? 0, icon: Package, href: "/assets" },
    { label: t("Active Assignments"), value: stats?.activeAssignments ?? 0, icon: UserCheck, href: "/assets/assignments" },
    { label: t("Scheduled Maintenance"), value: stats?.scheduledMaintenance ?? 0, icon: Wrench, href: "/assets/maintenance" },
    { label: t("Active Borrow/Rent"), value: stats?.activeBorrowRent ?? 0, icon: HandCoins, href: "/assets/borrow-rent" },
  ];

  function priorityBadge(p: string) {
    const map: Record<string, string> = {
      Low: "bg-gray-100 text-gray-700",
      Medium: "bg-blue-100 text-blue-800",
      High: "bg-orange-100 text-orange-800",
      Critical: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${map[p] ?? "bg-gray-100 text-gray-700"}`}>{p}</span>;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <DashboardStatCard
            key={c.label}
            label={c.label}
            value={c.value}
            href={c.href}
            icon={<c.icon className="h-8 w-8" />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("Assets by Category")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("No data available")}</p>
            ) : (
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="text-sm">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2"
                          style={{ width: `${Math.min(100, (c.count / Math.max(1, Math.max(...categories.map(x => x.count)))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("Recent Maintenance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMaintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("No maintenance records")}</p>
            ) : (
              <div className="space-y-3">
                {recentMaintenance.map(m => (
                  <div key={m.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.asset?.name ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {priorityBadge(m.priority)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Recently Added Assets")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">{t("Name")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("Category")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("Location")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("Added")}</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-sm">{t("No assets yet")}</td></tr>
                ) : recentAssets.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.category?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.location?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
