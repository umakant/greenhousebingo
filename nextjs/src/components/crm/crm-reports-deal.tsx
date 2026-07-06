"use client";

import * as React from "react";
import { BarChart3, TrendingUp, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { t } from "@/lib/admin-t";


type ReportData = {
  total: number;
  totalValue: number;
  byStatus: { status: string; count: number; value: number }[];
  byStage: { name: string; color: string; count: number; value: number }[];
  recent: Array<{ id: string; name: string; amount: string | null; status: string; closeDate: string | null; createdAt: string; stage?: { name: string; color: string } | null; lead?: { firstName: string; lastName: string | null } | null }>;
};

export default function CrmReportsDeal() {
  const { settings } = useAppSettings();
  const fmtCurrency = (v: number) => formatCurrency(v, settings);
  const fmtDate = (d: string | null | undefined) => formatDate(d, settings);
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState("30");

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/crm/reports/deals?days=${days}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>;
  if (!data) return <div className="py-12 text-center text-muted-foreground">{t("No data available.")}</div>;

  const wonDeals = data.byStatus.find((s) => s.status === "won");
  const wonRate = data.total > 0 ? Math.round(((wonDeals?.count ?? 0) / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t("Deal Reports")}</h2>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("Last 7 days")}</SelectItem>
            <SelectItem value="30">{t("Last 30 days")}</SelectItem>
            <SelectItem value="90">{t("Last 90 days")}</SelectItem>
            <SelectItem value="365">{t("Last year")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{data.total}</div><div className="text-sm text-muted-foreground mt-1">{t("Total Deals")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold text-green-600">{fmtCurrency(data.totalValue)}</div><div className="text-sm text-muted-foreground mt-1">{t("Total Value")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{wonDeals?.count ?? 0}</div><div className="text-sm text-muted-foreground mt-1">{t("Won")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{wonRate}%</div><div className="text-sm text-muted-foreground mt-1">{t("Win Rate")}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Deals by Stage")}</CardTitle></CardHeader>
          <CardContent>
            {data.byStage.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{t("No data")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byStage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(val: any) => `${Number(val)}`} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("Deals")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Deal Value by Stage")}</CardTitle></CardHeader>
          <CardContent>
            {data.byStage.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{t("No data")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byStage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => fmtCurrency(Number(val))} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name={t("Value ($)")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("Recent Deals")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("Lead")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Stage")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("Amount")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Close Date")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("No deals in this period")}</td></tr>
                ) : data.recent.map((deal) => (
                  <tr key={deal.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{deal.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {deal.lead ? formatCrmLeadFullName(deal.lead.firstName, deal.lead.lastName) : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge variant={deal.status === "won" ? "default" : "outline"} className="capitalize">{deal.status}</Badge></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {deal.stage ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Circle className="h-2.5 w-2.5" style={{ fill: deal.stage.color, color: deal.stage.color }} />
                          {deal.stage.name}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{deal.amount ? fmtCurrency(Number(deal.amount)) : "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{deal.closeDate ? fmtDate(deal.closeDate) : "—"}</td>
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
