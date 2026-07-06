"use client";

import * as React from "react";
import { BarChart3, Users, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";
import { t } from "@/lib/admin-t";


const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"];

type ReportData = {
  total: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  recent: Array<{ id: string; firstName: string; lastName: string | null; email: string | null; status: string; source: string | null; createdAt: string; stage?: { name: string; color: string } | null }>;
};

export default function CrmReportsLead() {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => formatDate(d, settings);
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState("30");

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/crm/reports/leads?days=${days}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>;
  if (!data) return <div className="py-12 text-center text-muted-foreground">{t("No data available.")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />{t("Lead Reports")}</h2>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{data.total}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("Total Leads")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{data.byStatus.find((s) => s.status === "converted")?.count ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("Converted")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{data.bySource.length}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("Sources")}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Leads by Status")}</CardTitle></CardHeader>
          <CardContent>
            {data.byStatus.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{t("No data")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.status ?? props.name}: ${props.count ?? props.value}`}>
                    {data.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Leads by Source")}</CardTitle></CardHeader>
          <CardContent>
            {data.bySource.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{t("No data")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.bySource} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("Leads")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("Recent Leads")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t("Source")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t("Stage")}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t("Created")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("No leads in this period")}</td></tr>
                ) : data.recent.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{formatCrmLeadFullName(lead.firstName, lead.lastName)}</div>
                      {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground capitalize">{lead.source?.replace("_", " ") ?? "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{lead.status}</Badge></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.stage ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Circle className="h-2.5 w-2.5" style={{ fill: lead.stage.color, color: lead.stage.color }} />
                          {lead.stage.name}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{fmtDate(lead.createdAt)}</td>
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
